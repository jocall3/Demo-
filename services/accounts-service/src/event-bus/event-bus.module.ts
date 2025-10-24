import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Injection token for the event bus client. Can be used to inject the ClientKafka instance.
 * @example
 * constructor(@Inject(EVENT_BUS_CLIENT) private readonly client: ClientKafka) {}
 */
export const EVENT_BUS_CLIENT = 'EVENT_BUS_CLIENT';

/**
 * The EventBusModule is responsible for configuring and providing the connection
 * to the central event bus (Kafka) for the Accounts microservice.
 *
 * It uses the ClientsModule to register an injectable Kafka client, which can then
 * be used by other services within this microservice to produce and consume events.
 *
 * Configuration, such as the Kafka broker addresses, is loaded from environment
 * variables via the ConfigService.
 */
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
              clientId: 'accounts-service',
              brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
            },
            consumer: {
              // A unique group ID for this service's consumer instances
              groupId: 'accounts-consumer',
            },
          },
        }),
        inject: [ConfigService], // Inject ConfigService into the factory
      },
    ]),
  ],
  // Export the configured ClientsModule so that the EVENT_BUS_CLIENT provider is available
  // for injection in other modules of this microservice.
  exports: [ClientsModule],
})
export class EventBusModule {}
