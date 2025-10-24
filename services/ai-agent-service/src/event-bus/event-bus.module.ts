import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * Injection token for the Kafka client.
 * This token is used to inject the Kafka client instance into services.
 */
export const KAFKA_CLIENT = 'KAFKA_CLIENT';

/**
 * The EventBusModule is responsible for configuring and providing the connection
 * to the central message bus (Apache Kafka).
 *
 * It uses NestJS's `ClientsModule` to register a Kafka client provider asynchronously,
 * allowing it to fetch configuration details (like broker URLs) from the `ConfigService`.
 *
 * This module is a cornerstone of the event-driven architecture, enabling the AI Agent Service
 * to both publish events to and consume events from other microservices in a decoupled manner.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [ConfigModule], // Ensures ConfigService is available in the factory
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'ai-agent-service', // Unique client ID for this service
              brokers: configService.get<string>('KAFKA_BROKERS').split(','),
            },
            consumer: {
              groupId: 'ai-agent-consumer', // Unique consumer group for this service
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule], // Export the ClientsModule to make the Kafka client provider available to other modules
})
export class EventBusModule {}
