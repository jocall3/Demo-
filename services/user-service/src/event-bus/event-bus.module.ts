import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const EVENT_BUS_SERVICE = 'EVENT_BUS_SERVICE';

/**
 * A global module responsible for configuring and providing the event bus client (Kafka).
 * This module makes the Kafka client proxy available for dependency injection throughout the user-service,
 * enabling it to produce and consume events from the central message bus.
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EVENT_BUS_SERVICE,
        imports: [ConfigModule], // Ensures ConfigService is available for injection
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'user-service',
              brokers: configService.get<string>('KAFKA_BROKERS').split(','),
            },
            consumer: {
              // A unique group ID for this service ensures it gets a copy of all relevant messages.
              groupId: 'user-service-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  // Export the configured ClientsModule so other modules can inject the client using the EVENT_BUS_SERVICE token.
  exports: [ClientsModule],
})
export class EventBusModule {}
