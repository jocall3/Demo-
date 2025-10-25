import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';
import { UserTransactionsResolver, TransactionResolver } from './transaction.resolver';
import { Transaction } from './entities/transaction.entity';

/**
 * The TransactionModule encapsulates all logic for handling financial transactions.
 * As part of the Transactions microservice, this module is responsible for:
 * - Managing the read model projection of transactions using TypeORM.
 * - Providing the business logic via TransactionService.
 * - Exposing GraphQL queries and mutations via TransactionResolver and UserTransactionsResolver.
 * - Integrating with the workflow orchestration layer (implicitly via TransactionService).
 */
@Module({
  imports: [
    // Registers the Transaction entity (read model) with TypeOrm, making the
    // TransactionRepository available for injection into the TransactionService.
    TypeOrmModule.forFeature([Transaction]),
  ],
  // The resolvers handle incoming GraphQL queries/mutations, and the service
  // contains the core business logic.
  providers: [
    TransactionService,
    UserTransactionsResolver, // For resolving transactions attached to a User
    TransactionResolver,      // For direct queries and resolving Transaction references
  ],
  // Exporting the service allows it to be used by other potential modules within
  // this microservice (e.g., by Temporal activities).
  exports: [TransactionService],
})
export class TransactionModule {}
