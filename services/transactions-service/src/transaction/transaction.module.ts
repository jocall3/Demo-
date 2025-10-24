import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionService } from './transaction.service';
import { TransactionResolver } from './transaction.resolver';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';

/**
 * The TransactionModule encapsulates all logic for handling financial transactions.
 * It provides the Mongoose model for transactions, the service for business logic,
 * and the GraphQL resolver for API interactions within the transactions-service bounded context.
 */
@Module({
  imports: [
    // Registers the Transaction schema with Mongoose, making the TransactionModel
    // available for injection into the TransactionService.
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  // The resolver handles incoming GraphQL queries/mutations, and the service
  // contains the core business logic.
  providers: [TransactionResolver, TransactionService],
  // Exporting the service allows it to be used by other potential modules within
  // this microservice in the future.
  exports: [TransactionService],
})
export class TransactionModule {}
