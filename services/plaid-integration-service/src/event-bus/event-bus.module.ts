import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * Injection token for the event bus client.
 * This token is used to inject the Kafka client proxy into services.
 */
export const EVENT_BUS_SERVICE = 'EVENT_BUS_SERVICE';

/**
 * EventBusModule
 *
 * This module is responsible for configuring and providing the connection
 * to the central message bus (Kafka). It uses the NestJS
 * `ClientsModule` to register a microservice client that can be injected
 * into other services to publish events.
 *
 * The configuration is loaded asynchronously from the `ConfigService` to
 * allow for environment-variable-based setup.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENT_BUS_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>(
                'KAFKA_CLIENT_ID',
                'plaid-integration-service',
              ),
              brokers: configService.get<string>('KAFKA_BROKERS').split(','),
            },
            consumer: {
              // A unique group ID for this service to ensure it receives all relevant messages.
              groupId: configService.get<string>(
                'KAFKA_CONSUMER_GROUP_ID',
                'plaid-integration-consumer',
              ),
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class EventBusModule {}
