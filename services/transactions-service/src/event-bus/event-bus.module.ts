import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * The injection token for the Kafka client. This is used to inject the client
 * into services that need to produce events to the message bus.
 * e.g., @Inject(KAFKA_PRODUCER_CLIENT) private readonly kafkaClient: ClientKafka
 */
export const KAFKA_PRODUCER_CLIENT = 'KAFKA_PRODUCER_CLIENT';

/**
 * The EventBusModule is responsible for configuring and providing the connection
 * to the central message bus (Kafka). It uses the NestJS ClientsModule to create
 * a Kafka client that can be used throughout the Transactions microservice to
 * emit events.
 *
 * This module is a core part of the event-driven architecture, enabling asynchronous
 * communication with other microservices.
 */
@Module({
  imports: [
    // Register the Kafka client using an asynchronous factory. This allows us to
    // inject the ConfigService and retrieve Kafka broker URLs from environment variables,
    // avoiding hardcoded configuration and promoting a clean, configurable setup.
    ClientsModule.registerAsync([
      {
        name: KAFKA_PRODUCER_CLIENT,
        imports: [ConfigModule], // Make ConfigService available to the factory
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'transactions-service-producer',
              brokers: configService.get<string>('KAFKA_BROKERS').split(','),
            },
            producer: {
              // idempotent: true, // Example of a producer-specific option
              // allowAutoTopicCreation: false, // Recommended for production
            },
          },
        }),
        inject: [ConfigService], // Specifies that ConfigService should be injected into the factory
      },
    ]),
  ],
  // By exporting the configured ClientsModule, any module that imports EventBusModule
  // can inject the Kafka client using the KAFKA_PRODUCER_CLIENT token.
  exports: [ClientsModule],
})
export class EventBusModule {}
