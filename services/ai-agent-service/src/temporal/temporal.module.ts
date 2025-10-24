import { Module, Provider, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client, Connection, ConnectionOptions } from '@temporalio/client';

/**
 * Injection token for the singleton Temporal Client instance.
 * Services can inject this client to start, query, and signal workflows.
 * @example constructor(@Inject(TEMPORAL_CLIENT) private readonly temporalClient: Client) {}
 */
export const TEMPORAL_CLIENT = 'TEMPORAL_CLIENT';

/**
 * The provider for the raw Temporal Connection. This is an internal detail
 * of the module and is not exported.
 */
const temporalConnectionProvider: Provider = {
  provide: 'TEMPORAL_CONNECTION',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<Connection> => {
    const logger = new Logger('TemporalConnection');
    const address = configService.get<string>('TEMPORAL_ADDRESS');
    if (!address) {
      logger.error(
        'TEMPORAL_ADDRESS is not configured. Temporal module will fail to connect.',
      );
      throw new Error('Temporal address is not configured in environment variables.');
    }

    const options: ConnectionOptions = {
      address,
      // In a production environment, TLS would be configured here:
      // tls: {
      //   clientCertPair: {
      //     crt: Buffer.from(configService.get<string>('TEMPORAL_TLS_CRT')),
      //     key: Buffer.from(configService.get<string>('TEMPORAL_TLS_KEY')),
      //   },
      // },
    };

    logger.log(`Attempting to connect to Temporal frontend at ${address}`);
    try {
      const connection = await Connection.connect(options);
      logger.log('Successfully connected to Temporal frontend.');
      return connection;
    } catch (err) {
      logger.error('Failed to connect to Temporal frontend.', err.stack);
      // Allow the application to start but log a critical failure.
      // Health checks should report the service as unhealthy.
      throw err;
    }
  },
};

/**
 * The provider for the Temporal Client, which depends on the established connection.
 */
const temporalClientProvider: Provider = {
  provide: TEMPORAL_CLIENT,
  inject: ['TEMPORAL_CONNECTION', ConfigService],
  useFactory: (connection: Connection, configService: ConfigService): Client => {
    return new Client({
      connection,
      namespace: configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
    });
  },
};

/**
 * @module TemporalModule
 * @description This global module provides the necessary infrastructure for integrating with
 * a Temporal workflow orchestration engine.
 *
 * It is responsible for:
 * 1. Establishing a connection to the Temporal frontend service.
 * 2. Creating a singleton Temporal Client instance.
 * 3. Providing the Temporal Client for dependency injection across the application.
 *
 * Services can inject the `TEMPORAL_CLIENT` to start and interact with durable,
 * long-running workflows, offloading complex asynchronous business logic from the
 * service itself.
 */
@Global()
@Module({
  imports: [ConfigModule], // Ensures ConfigService is available
  providers: [temporalConnectionProvider, temporalClientProvider],
  exports: [temporalClientProvider], // Export the client provider for global use
})
export class TemporalModule {}
