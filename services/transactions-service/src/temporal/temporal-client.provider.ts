import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, ConnectionOptions } from '@temporalio/client';

/**
 * @description Injection token for the Temporal Client.
 * This token is used to inject the Temporal Client instance into services
 * that need to interact with the Temporal cluster (e.g., to start workflows).
 *
 * @example
 * constructor(
 *   @Inject(TEMPORAL_CLIENT) private readonly temporalClient: Client,
 * ) {}
 */
export const TEMPORAL_CLIENT = 'TEMPORAL_CLIENT_INJECTION_TOKEN';

/**
 * @description NestJS provider for the Temporal Client.
 *
 * This factory provider is responsible for creating a singleton instance of the
 * Temporal Client. It connects to the Temporal cluster using connection details
 * sourced from the application's configuration (via `ConfigService`).
 *
 * The client instance is then made available for dependency injection throughout
 * the application using the `TEMPORAL_CLIENT` injection token.
 */
export const temporalClientProvider: Provider = {
  provide: TEMPORAL_CLIENT,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<Client> => {
    const logger = new Logger('TemporalClientProvider');
    const temporalAddress = configService.get<string>('TEMPORAL_ADDRESS');
    const temporalNamespace = configService.get<string>('TEMPORAL_NAMESPACE');

    if (!temporalAddress || !temporalNamespace) {
      logger.error(
        'Temporal configuration (TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE) is missing.',
      );
      throw new Error(
        'Missing Temporal configuration in environment variables.',
      );
    }

    // In a production environment, you would configure TLS options here,
    // sourcing certificates and keys from a secure location (e.g., Vault or env vars).
    const connectionOptions: ConnectionOptions = {
      address: temporalAddress,
      // tls: configService.get('temporal.tls') ? { ... } : false,
    };

    try {
      logger.log(
        `Attempting to establish connection with Temporal at ${temporalAddress}...`,
      );
      const connection = await Connection.connect(connectionOptions);
      logger.log('Successfully established connection with Temporal cluster.');

      const client = new Client({
        connection,
        namespace: temporalNamespace,
      });

      logger.log(`Temporal Client initialized for namespace "${temporalNamespace}".`);
      return client;
    } catch (err) {
      logger.error('Failed to connect to Temporal cluster.', err.stack);
      // Fail fast if the connection cannot be established on startup.
      throw err;
    }
  },
};
