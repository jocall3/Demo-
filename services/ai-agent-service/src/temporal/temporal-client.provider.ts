import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Connection } from '@temporalio/client';

/**
 * @description Injection token for the Temporal client.
 * This token is used to inject the Temporal Client instance into services that need to
 * start or interact with workflows.
 * @example
 * constructor(@Inject(TEMPORAL_CLIENT) private readonly temporalClient: Client) {}
 */
export const TEMPORAL_CLIENT = 'TEMPORAL_CLIENT';

/**
 * @description NestJS provider for the Temporal Client.
 * This provider is responsible for establishing a connection to the Temporal server
 * and creating a client instance. The configuration (server address, namespace)
 * is sourced from environment variables via the `ConfigService`.
 */
export const temporalClientProvider: Provider = {
  provide: TEMPORAL_CLIENT,

  /**
   * An asynchronous factory function that creates and returns a Temporal Client instance.
   * It's async because establishing the connection to the Temporal server is an async operation.
   *
   * @param {ConfigService} configService - The NestJS ConfigService, injected to access environment variables.
   * @returns {Promise<Client>} A promise that resolves to the configured Temporal Client.
   */
  useFactory: async (configService: ConfigService): Promise<Client> => {
    // Retrieve Temporal server connection details from environment variables.
    const address = configService.get<string>('TEMPORAL_ADDRESS');
    const namespace = configService.get<string>('TEMPORAL_NAMESPACE', 'default');

    if (!address) {
      throw new Error('TEMPORAL_ADDRESS environment variable must be set.');
    }

    // Create a connection to the Temporal frontend service.
    // In a production environment, you would configure TLS options here.
    const connection = await Connection.connect({
      address,
      // tls: {} // Production TLS configuration would go here.
    });

    // Create and return the client instance, which will be injected into other services.
    const client = new Client({
      connection,
      namespace,
    });

    return client;
  },

  // Specify that the ConfigService should be injected into the `useFactory` function.
  inject: [ConfigService],
};
