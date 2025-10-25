import { Controller, Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  ClientKafka,
  Ctx,
  EventPattern,
  KafkaContext,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { PlaidService } from './plaid.service';
import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * @description DTO for relevant Plaid institution metadata.
 * Only includes fields immediately used or relevant to the event.
 */
class PlaidInstitutionMetadataDto {
  @IsString()
  @IsNotEmpty()
  institution_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * @description DTO for the payload of a 'plaid.link_token.create' request.
 * Sent by the API Gateway when a user needs to start the Plaid Link flow.
 */
class CreateLinkTokenPayloadDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

/**
 * @description DTO for the payload of a 'plaid.public_token.exchange' event.
 * Emitted by the API Gateway after the user successfully completes the Plaid Link flow.
 */
class ExchangePublicTokenPayloadDto {
  @IsString()
  @IsNotEmpty()
  publicToken: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaidInstitutionMetadataDto)
  metadata?: {
    institution?: PlaidInstitutionMetadataDto;
  };
}

/**
 * The PlaidController is the main entry point for the Plaid Integration Service
 * from the central message bus (Kafka). It listens for messages and events,
 * delegates tasks to the PlaidService, and emits events to notify other services
 * of outcomes. It does not expose any HTTP endpoints.
 *
 * This controller adheres to the Hexagonal Architecture by acting as an inbound adapter,
 * translating external Kafka messages into domain-specific service calls.
 */
@Controller()
export class PlaidController implements OnModuleInit {
  private readonly logger = new Logger(PlaidController.name);

  constructor(
    private readonly plaidService: PlaidService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * Subscribes to necessary response topics when the module initializes.
   * This is required for the request-reply pattern used by `createLinkToken`.
   */
  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf('plaid.link_token.create');
    await this.kafkaClient.connect();
    this.logger.log('Kafka client connected and subscribed to response topics.');
  }

  /**
   * Handles a request-reply message to create a Plaid Link token.
   * The API Gateway sends this message and waits for a response containing the token.
   * @param payload The message payload containing the userId.
   * @returns An object containing the link token data or an error.
   */
  @MessagePattern('plaid.link_token.create')
  async createLinkToken(@Payload() payload: CreateLinkTokenPayloadDto) {
    this.logger.log(`Handling createLinkToken request for user: ${payload.userId}`);
    try {
      const linkTokenData = await this.plaidService.createLinkToken(payload.userId);
      // The return value is automatically sent back to the reply topic.
      return { success: true, data: linkTokenData };
    } catch (error) {
      this.logger.error(`Failed to create link token for user ${payload.userId}`, error.stack);
      return { success: false, error: { message: error.message } };
    }
  }

  /**
   * Handles a fire-and-forget event to exchange a public token for an access token.
   * This is the start of an asynchronous choreography flow. After exchanging the token,
   * this service will emit new events to trigger other services (e.g., to sync transactions).
   * @param payload The event payload containing the publicToken and userId.
   * @param context The Kafka context of the original message.
   */
  @EventPattern('plaid.public_token.exchange')
  async handlePublicTokenExchange(
    @Payload() payload: ExchangePublicTokenPayloadDto,
    @Ctx() context: KafkaContext,
  ) {
    const { publicToken, userId, metadata } = payload;
    this.logger.log(`Handling public_token.exchange event for user: ${userId}`);

    try {
      // The service exchanges the token and securely stores the access token.
      const { itemId } = await this.plaidService.exchangeAndStorePublicToken(publicToken, userId);

      // On success, emit a new event to notify other services that a new financial
      // account has been linked. This follows the event-driven choreography pattern.
      this.logger.log(`Successfully created Plaid item ${itemId}. Emitting plaid.item.created event.`);
      this.kafkaClient.emit('plaid.item.created', {
        userId,
        itemId,
        institutionId: metadata?.institution?.institution_id,
        institutionName: metadata?.institution?.name,
        timestamp: new Date().toISOString(),
      });

      // As the owner of the Plaid connection, this service can also trigger
      // the initial data syncs immediately after item creation.
      // The service methods would then emit more granular events like `transactions.synced`.
      // This ensures the data mesh product is made available quickly.
      this.plaidService.triggerInitialDataSync(userId, itemId);
    } catch (error) {
      this.logger.error(`Failed to exchange public token for user ${userId}`, error.stack);
      // Emit a failure event so other systems can react to the failure if needed.
      this.kafkaClient.emit('plaid.item.create_failed', {
        userId,
        publicToken,
        error: { message: error.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handles incoming webhooks from Plaid, which are forwarded as events by the API Gateway.
   * This allows the service to react to real-time updates from the financial institution.
   * This is critical for keeping our read models (projections) up-to-date and enabling
   * event sourcing consistency.
   * @param payload The full webhook payload from Plaid.
   */
  @EventPattern('plaid.webhook.received')
  async handlePlaidWebhook(@Payload() webhookPayload: any) {
    const { webhook_type, item_id } = webhookPayload;
    this.logger.log(`Handling Plaid webhook event of type [${webhook_type}] for item [${item_id}]`);
    try {
      await this.plaidService.handleWebhook(webhookPayload);
    } catch (error) {
      this.logger.error(`Error processing Plaid webhook for item [${item_id}]`, error.stack);
      // Optionally emit a webhook processing failure event
      this.kafkaClient.emit('plaid.webhook.processing_failed', {
        webhook_type,
        item_id,
        error: { message: error.message },
      });
    }
  }
}
