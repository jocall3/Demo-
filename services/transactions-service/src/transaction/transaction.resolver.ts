import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  InputType,
  Int,
  ObjectType,
  Parent,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
  ResolveReference,
} from '@nestjs/graphql';
import { TransactionService } from './transaction.service';

// --- Enums ---

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
  description: 'The type of a financial transaction (e.g., credit or debit).',
});


// --- GraphQL Object Types ---

/**
 * Represents a single financial transaction.
 * This is a key entity in the federation, meaning other services can reference it by its ID.
 */
@ObjectType('Transaction')
@Directive('@key(fields: "id")')
export class TransactionObject {
  @Field(() => ID, { description: 'The unique identifier for the transaction.' })
  id: string;

  @Field(() => ID, { description: 'The ID of the account this transaction belongs to.' })
  accountId: string;

  @Field(() => TransactionType)
  type: TransactionType;

  @Field({ description: 'A short description of the transaction (e.g., merchant name).' })
  description: string;

  @Field(() => Float, { description: 'The monetary value of the transaction. Negative for debits, positive for credits.' })
  amount: number;

  @Field({ description: 'The date the transaction was posted, in YYYY-MM-DD format.' })
  date: string;

  @Field({ description: 'The primary spending category of the transaction.' })
  category: string;

  @Field(() => [String], { description: 'The full category hierarchy provided by the data source.' })
  categoryHierarchy: string[];

  @Field({ nullable: true, description: 'The specific merchant name, if available.' })
  merchantName?: string;

  @Field({ description: 'Indicates if the transaction is still pending or has been posted.' })
  pending: boolean;

  @Field(() => Float, { nullable: true, description: 'Estimated carbon footprint of the transaction in kg CO2.' })
  carbonFootprint?: number;
}

/**
 * Represents the User entity, which is defined in another service (e.g., users-service).
 * This service extends the User entity to add the `transactions` field.
 */
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  // This field is contributed by the transactions-service
  @Field(() => [TransactionObject])
  transactions: TransactionObject[];
}

// --- GraphQL Input Types ---
@InputType({ description: 'Provides filters for querying a list of transactions.'})
export class TransactionFilterInput {
  @Field(() => ID, { nullable: true, description: 'Filter transactions by a specific account ID.' })
  accountId?: string;

  @Field({ nullable: true, description: 'The start date for the query range (YYYY-MM-DD).' })
  startDate?: string;

  @Field({ nullable: true, description: 'The end date for the query range (YYYY-MM-DD).' })
  endDate?: string;

  @Field(() => Int, { nullable: true, defaultValue: 100, description: 'The maximum number of transactions to return.' })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0, description: 'The number of transactions to skip for pagination.' })
  offset?: number;
}


// --- Resolvers ---

/**
 * This resolver is responsible for extending the federated User entity.
 * Its purpose is to attach transaction-related data to the User object.
 */
@Resolver(() => User)
export class UserTransactionsResolver {
  constructor(private readonly transactionService: TransactionService) {}

  @ResolveField('transactions', () => [TransactionObject], {
    description: "Fetches the user's financial transactions, with optional filtering.",
  })
  async getTransactionsForUser(
    @Parent() user: User,
    @Args('filter', { type: () => TransactionFilterInput, nullable: true }) filter?: TransactionFilterInput,
  ): Promise<TransactionObject[]> {
    return this.transactionService.findAllByUserId(user.id, filter);
  }
}

/**
 * This resolver handles queries and references for the Transaction entity itself.
 * It allows direct lookups of transactions and enables other services to resolve
 * a Transaction object using its ID.
 */
@Resolver(() => TransactionObject)
export class TransactionResolver {
  constructor(private readonly transactionService: TransactionService) {}

  @Query(() => TransactionObject, {
    name: 'transaction',
    nullable: true,
    description: 'Retrieves a single transaction by its unique ID.',
  })
  async getTransactionById(@Args('id', { type: () => ID }) id: string): Promise<TransactionObject | null> {
    // NOTE: In a production environment, this query would need an authorization layer
    // to ensure the user making the request has permission to view this specific transaction.
    return this.transactionService.findById(id);
  }

  /**
   * Federation-specific method to allow other subgraphs to resolve a Transaction entity
   * by its `id`. The Apollo Gateway will call this method when a query requires a
   * transaction field from another service's entity.
   */
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<TransactionObject> {
    return this.transactionService.findById(reference.id);
  }
}
