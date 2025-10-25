import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Injection token for the event bus client. Consumers of this module can inject
 * the `ClientKafka` instance using this token to publish or consume events.
 * 
 * @example
 * constructor(@Inject(EVENT_BUS_CLIENT) private readonly client: ClientKafka) {}
 */
export const EVENT_BUS_CLIENT = 'EVENT_BUS_CLIENT';

/**
 * @module EventBusModule
 * @description This module acts as an "Adapter" for the "Messaging Port" within the Hexagonal Architecture of the Accounts microservice.
 * It is responsible for configuring and providing the connection to the central event store/message bus (Kafka).
 * 
 * In the context of CQRS and Event Sourcing, this module enables the service to:
 * - Publish domain events (e.g., AccountCreatedEvent, BalanceUpdatedEvent) to the Kafka topic.
 * - Consume relevant events from other services or from read model projections.
 *
 * It registers an injectable Kafka client using NestJS's `ClientsModule`,
 * allowing other services within this microservice to interact with Kafka in a decoupled manner.
 * Configuration, such as Kafka broker addresses, is loaded asynchronously from environment variables.
 */
@Global() // Making this module global simplifies its import across feature modules.
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENT_BUS_CLIENT,
        imports: [ConfigModule], // Ensures ConfigService is available in the factory
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'accounts-service', // Unique client ID for this service instance
              brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','), // Kafka broker addresses
            },
            consumer: {
              // A unique group ID for this service's consumer instances. This ensures all instances of this
              // service work together to consume partitions of subscribed topics.
              groupId: configService.getOrThrow<string>('KAFKA_CONSUMER_GROUP_ID', 'accounts-service-consumer'),
              allowAutoTopicCreation: true, // Recommended for development, set to false in production.
            },
          },
        }),
        inject: [ConfigService], // Inject ConfigService into the factory
      },
    ]),
  ],
  // Export the configured ClientsModule so that the EVENT_BUS_CLIENT provider is available
  // for injection in other modules of this microservice, enabling them to send and receive events.
  exports: [ClientsModule],
})
export class EventBusModule {}