import { Worker, NativeConnection } from '@temporalio/worker';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TransactionService } from '../transaction/transaction.service';
import { createActivities } from './activities';

/**
 * Runs the Temporal Worker for the Transactions Service.
 *
 * This script bootstraps a NestJS application context to gain access to dependency-injected
 * services (like TransactionService) and provides them to Temporal Activities. The Worker then
 * connects to the Temporal Cluster, polls for tasks on a specific task queue ('transactions-queue'),
 * and executes the corresponding Workflows and Activities.
 */
async function runWorker() {
  const logger = console; // Using console for simplicity in the worker script.

  try {
    // Step 1: Bootstrap a "standalone" NestJS application context.
    // This allows us to leverage Nest's dependency injection container to get instances
    // of our services without running a full web server.
    logger.log('Bootstrapping NestJS application context...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      // Disable the default NestJS logger for a cleaner worker output
      logger: false,
    });
    const transactionService = app.get(TransactionService);
    logger.log('NestJS context bootstrapped successfully. TransactionService retrieved.');

    // Step 2: Establish a connection to the Temporal Cluster.
    // The address should be configured via environment variables.
    const connection = await NativeConnection.create({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });
    logger.log(`Connected to Temporal cluster at ${connection.options.address}`);

    // Step 3: Instantiate activities, injecting the required NestJS services.
    // This is the bridge between Temporal's execution environment and our application's business logic.
    const activities = createActivities(transactionService);

    // Step 4: Create a new Worker instance.
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      taskQueue: 'transactions-queue',
      // `workflowsPath` points to a file that exports all Workflow functions.
      // `require.resolve` is used to get the absolute path to the workflows file.
      workflowsPath: require.resolve('./workflows'),
      activities,
      // A Build ID is used for versioning your Worker code. It's a key part of the
      // Versioning feature of Temporal, which allows for safe deployment of new Worker code.
      buildId: '1.0.0',
    });
    logger.log(`Worker created for task queue "transactions-queue" with build ID "1.0.0".`);

    // Step 5: Start the Worker.
    // This begins the polling loop, where the Worker asks the Temporal Cluster for tasks.
    // This is a long-running process that will not resolve until the Worker is shut down.
    logger.log('Starting Temporal Worker...');
    await worker.run();
    logger.log('Temporal Worker has been shut down.');

    // Clean up resources on graceful shutdown
    await app.close();
    await connection.close();
  } catch (err) {
    logger.error('Error running Temporal worker:', err);
    process.exit(1);
  }
}

runWorker();
