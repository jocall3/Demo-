import { Worker, NativeConnection } from '@temporalio/worker';
import { NestFactory } from '@nestjs/core';
import { AgentService } from '../agent/agent.service';
import * as activities from './activities';
import { AppModule } from '../app.module';

/**
 * The task queue name for all workflows and activities related to the AI Agent Service.
 */
export const AI_AGENT_TASK_QUEUE = 'ai-agent-task-queue';

/**
 * Runs the Temporal Worker for the AI Agent Service.
 *
 * This script performs the following steps:
 * 1. Bootstraps a standalone NestJS application context to access dependency-injected services.
 * 2. Retrieves an instance of the `AgentService`.
 * 3. Creates activity functions, injecting the `AgentService` instance for business logic.
 * 4. Establishes a connection with the Temporal cluster.
 * 5. Creates and runs a `Worker` instance that listens on a specific task queue for workflows and activities.
 */
async function run() {
  // Bootstrap a NestJS application context to leverage its dependency injection container.
  // This allows us to inject services like AgentService into our Temporal activities.
  const app = await NestFactory.createApplicationContext(AppModule);
  const agentService = app.get(AgentService);

  // Create an instance of the activities object, passing in the required NestJS services.
  const activityInstances = activities.createActivities(agentService);

  // Configure and establish a connection to the Temporal frontend service.
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    // In production, TLS configuration would be specified here.
  });

  // Create a worker that will poll for tasks on the specified task queue.
  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: AI_AGENT_TASK_QUEUE,
    // `workflowsPath` points to the compiled JS file where workflows are defined.
    // `require.resolve` is used to get the absolute path to the module.
    workflowsPath: require.resolve('./workflows'),
    // The `activities` object maps activity names to their implementations.
    activities: activityInstances,
    // Recommended for production to bundle dependencies and improve performance.
    // bundlerOptions: { ... },
  });

  console.log(
    `Temporal Worker for AI Agent Service connected and listening on task queue: "${AI_AGENT_TASK_QUEUE}"`,
  );

  // Start the worker's polling loop.
  // This is a long-running process that will not exit unless an error occurs or the process is terminated.
  await worker.run();

  // Cleanly close the NestJS application context on shutdown.
  await app.close();
}

run().catch((err) => {
  console.error('Error running Temporal worker:', err);
  process.exit(1);
});
