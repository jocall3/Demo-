import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionService } from './transaction.service';
import {
  UserTransactionsResolver,
  TransactionResolver,
} from './transaction.resolver';
import { TransactionController } from './transaction.controller';
import {
  Transaction,
  TransactionSchema,
} from './schemas/transaction.schema';

/**
 * @module TransactionModule
 * @description Encapsulates all logic for the Transaction bounded context, adhering to CQRS principles.
 * This module is responsible for both command handling (initiating payment workflows) and query handling
 * (serving transaction data from a denormalized read model).
 *
 * ARCHITECTURAL REFACTOR:
 * - Read Model: This module now uses Mongoose to manage the transaction read model in MongoDB,
 *   aligning with the CQRS directive for optimized, denormalized query stores.
 *   The `TransactionController` acts as a projection, consuming Kafka events to keep this model updated.
 * - Command Handling: The `TransactionService` (injected by this module's providers) handles commands,
 *   primarily by starting durable Sagas using the Temporal workflow engine for operations like payments.
 * - API Layer: GraphQL resolvers (`TransactionResolver`, `UserTransactionsResolver`) act as the primary
 *   API adapter for external queries and mutations, interacting with the underlying services.
 */
@Module({
  imports: [
    // Registers the Transaction schema with Mongoose. This schema defines the structure
    // of the transaction documents in the MongoDB read model database.
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  // The controller is an inbound adapter that listens for Kafka events to update the read model.
  controllers: [TransactionController],
  // The providers include the core application service and the GraphQL resolvers (API adapters).
  providers: [
    TransactionService,
    UserTransactionsResolver,
    TransactionResolver,
  ],
  // Exporting TransactionService makes it available for injection into other modules.
  // This is crucial for the TemporalModule, which needs to inject it into the activities
  // that are executed by the Temporal Worker.
  exports: [TransactionService],
})
export class TransactionModule {}
