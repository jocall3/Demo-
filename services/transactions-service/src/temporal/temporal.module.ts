import { Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Connection, Client } from '@temporalio/client';
import { TEMPORAL_CLIENT, TEMPORAL_WORKER_CONFIG } from './temporal.constants';
import { TemporalWorkerService } from './temporal.worker.service';
import * as activities from './activities';
import { TransactionModule } from '../transaction/transaction.module';
import { TransactionService } from '../transaction/transaction.service';

/**
 * The provider for the singleton Temporal Connection instance.
 * It connects to the Temporal frontend service using configuration from the environment.
 */
const temporalConnectionProvider: Provider = {
  provide: 'TEMPORAL_CONNECTION',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const connection = await Connection.connect({
      address: configService.get<string>('TEMPORAL_ADDRESS'),
      // In a production environment, TLS configuration would be specified here.
      // For example:
      // tls: {
      //   clientCertPair: {
      //     crt: Buffer.from(configService.get<string>('TEMPORAL_TLS_CERT')),
      //     key: Buffer.from(configService.get<string>('TEMPORAL_TLS_KEY')),
      //   },
      // },
    });
    return connection;
  },
};

/**
 * The provider for the singleton Temporal Client instance.
 * This client is used to start and interact with workflows from within the application.
 */
const temporalClientProvider: Provider = {
  provide: TEMPORAL_CLIENT,
  inject: ['TEMPORAL_CONNECTION', ConfigService],
  useFactory: (connection: Connection, configService: ConfigService) =>
    new Client({
      connection,
      namespace: configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
    }),
};

/**
 * A provider that builds the configuration object for the Temporal Worker.
 * The activities functions need access to other NestJS services (e.g., TransactionService)
 * to perform their work. This factory-based provider pattern allows for proper dependency injection.
 */
const workerConfigProvider: Provider = {
  provide: TEMPORAL_WORKER_CONFIG,
  // The activities will depend on the TransactionService to interact with the database.
  inject: [TransactionService],
  useFactory: (transactionService: TransactionService) => {
    return {
      activities: activities.createActivities(transactionService),
      // This tells the worker service where to find compiled workflow files.
      workflowsPath: require.resolve('./workflows'),
      // This is the task queue this worker will poll for tasks.
      taskQueue: 'transactions-queue',
    };
  },
};

/**
 * @module TemporalModule
 * @description This module is responsible for initializing and configuring the Temporal.io client and worker
 * for the Transactions Service.
 *
 * It provides the Temporal client as a global dependency, allowing any service to start workflows.
 * It also initializes the `TemporalWorkerService`, which is responsible for registering and running
 * the workflows and activities that process tasks from the 'transactions-queue'.
 *
 * This setup centralizes all Temporal-related configuration and bootstrapping for the microservice.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    // We import TransactionModule to make its providers (like TransactionService)
    // available for injection into our activities provider factory.
    TransactionModule,
  ],
  providers: [
    temporalConnectionProvider,
    temporalClientProvider,
    workerConfigProvider,
    TemporalWorkerService, // This service will use the config and activities to start a worker.
  ],
  exports: [temporalClientProvider], // Export the client so other modules can start workflows
})
export class TemporalModule {}
