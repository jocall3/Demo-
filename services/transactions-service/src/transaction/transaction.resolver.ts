import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
  ResolveReference,
} from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';

/**
 * Represents the user object extracted from the JWT payload by the authentication guard.
 */
interface AuthenticatedUser {
  userId: string;
  [key: string]: any;
}

// =============================================================================
// GraphQL Schema: Enums
// =============================================================================

/**
 * @enum {string} TransactionType
 * @description The type of a financial transaction (e.g., credit or debit).
 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
  description: 'The type of a financial transaction (e.g., credit or debit).',
});

// =============================================================================
// GraphQL Schema: Object Types
// =============================================================================

/**
 * @class TransactionObject
 * @description Represents a financial transaction as a federated entity.
 * This is the primary read model for transaction data, optimized for querying.
 */
@ObjectType('Transaction')
@Directive('@key(fields: "id")')
export class TransactionObject {
  /**
   * @property {string} id
   * @description The unique identifier for the transaction.
   */
  @Field(() => ID)
  id: string;

  /**
   * @property {string} userId
   * @description The ID of the user who owns this transaction.
   */
  @Field(() => ID)
  userId: string;

  /**
   * @property {string} accountId
   * @description The ID of the account this transaction belongs to.
   */
  @Field(() => ID)
  accountId: string;

  /**
   * @property {TransactionType} type
   * @description The type of the transaction (INCOME or EXPENSE).
   */
  @Field(() => TransactionType)
  type: TransactionType;

  /**
   * @property {string} description
   * @description A short description of the transaction (e.g., merchant name).
   */
  @Field()
  description: string;

  /**
   * @property {number} amount
   * @description The monetary value of the transaction. Typically negative for debits and positive for credits.
   */
  @Field(() => Float)
  amount: number;

  /**
   * @property {string} date
   * @description The date the transaction was posted, in YYYY-MM-DD format.
   */
  @Field()
  date: string;

  /**
   * @property {string} category
   * @description The primary spending category of the transaction.
   */
  @Field()
  category: string;

  /**
   * @property {string[]} categoryHierarchy
   * @description The full category hierarchy provided by the data source (e.g., Plaid).
   */
  @Field(() => [String])
  categoryHierarchy: string[];

  /**
   * @property {string} [merchantName]
   * @description The specific merchant name, if available.
   */
  @Field({ nullable: true })
  merchantName?: string;

  /**
   * @property {boolean} pending
   * @description Indicates if the transaction is still pending or has been posted.
   */
  @Field()
  pending: boolean;

  /**
   * @property {number} [carbonFootprint]
   * @description Estimated carbon footprint of the transaction in kg CO2.
   */
  @Field(() => Float, { nullable: true })
  carbonFootprint?: number;

  /**
   * @property {string} isoCurrencyCode
   * @description The ISO-4217 currency code of the transaction.
   */
  @Field()
  isoCurrencyCode: string;
}

/**
 * @class User
 * @description Extends the federated `User` entity to contribute transaction data.
 */
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [TransactionObject])
  transactions: TransactionObject[];
}

/**
 * @class InitiatePaymentResponse
 * @description The response object returned after initiating a payment workflow.
 */
@ObjectType({ description: 'Response after initiating a payment workflow.' })
export class InitiatePaymentResponse {
  /**
   * @property {string} workflowId
   * @description The unique identifier for the initiated payment workflow/transaction.
   */
  @Field(() => ID)
  workflowId: string;

  /**
   * @property {string} status
   * @description The initial status of the payment workflow (e.g., PENDING).
   */
  @Field()
  status: string;
}

// =============================================================================
// GraphQL Schema: Input Types
// =============================================================================

/**
 * @class TransactionFilterInput
 * @description Provides filters for querying a list of transactions.
 */
@InputType({ description: 'Provides filters for querying a list of transactions.' })
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

/**
 * @class InitiatePaymentInput
 * @description Input for initiating a new payment transfer. User ID is derived from the auth context.
 */
@InputType({ description: 'Input for initiating a new payment transfer.' })
export class InitiatePaymentInput {
  @Field(() => ID, { description: 'The ID of the account from which money will be debited.' })
  fromAccountId: string;

  @Field(() => ID, { description: 'The ID of the account to which money will be credited.' })
  toAccountId: string;

  @Field(() => Float, { description: 'The amount to transfer.' })
  amount: number;

  @Field(() => String, { defaultValue: 'USD', description: 'The ISO-4217 currency code for the transaction.' })
  currency: string;

  @Field({ nullable: true, description: 'An optional memo or description for the transaction.' })
  memo?: string;
}

// =============================================================================
// GraphQL Resolvers
// =============================================================================

/**
 * @class UserTransactionsResolver
 * @description Extends the federated 'User' entity to resolve transaction-related fields.
 */
@Resolver(() => User)
export class UserTransactionsResolver {
  private readonly logger = new Logger(UserTransactionsResolver.name);
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * @method getTransactionsForUser
   * @description Resolves the `transactions` field on the User entity.
   * @param {User} user The parent User object provided by the Apollo Gateway.
   * @param {TransactionFilterInput} [filter] Optional filters for pagination and date range.
   * @returns {Promise<TransactionObject[]>} A promise resolving to an array of transactions.
   */
  @ResolveField('transactions', () => [TransactionObject])
  async getTransactionsForUser(
    @Parent() user: User,
    @Args('filter', { type: () => TransactionFilterInput, nullable: true })
    filter?: TransactionFilterInput,
  ): Promise<TransactionObject[]> {
    this.logger.log(`Resolving transactions for user ${user.id} with filter: ${JSON.stringify(filter)}`);
    return this.transactionService.findAllByUserId(user.id, filter);
  }
}

/**
 * @class TransactionResolver
 * @description Handles root queries, mutations, and entity resolution for the Transaction domain.
 */
@Resolver(() => TransactionObject)
export class TransactionResolver {
  private readonly logger = new Logger(TransactionResolver.name);
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * @method getTransactionById
   * @description Retrieves a single transaction by its unique ID from the read-model projection.
   * @param {string} id The unique ID of the transaction.
   * @returns {Promise<TransactionObject | null>} A transaction object or null if not found.
   */
  @Query(() => TransactionObject, {
    name: 'transaction',
    nullable: true,
    description: 'Retrieves a single transaction by its unique ID.',
  })
  async getTransactionById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TransactionObject | null> {
    this.logger.log(`Querying for transaction by ID: ${id}`);
    return this.transactionService.findById(id);
  }

  /**
   * @method resolveReference
   * @description Resolves a Transaction entity reference for Apollo Federation.
   * @param {{ __typename: string; id: string }} reference The reference object from the gateway.
   * @returns {Promise<TransactionObject | null>} The fully resolved transaction object.
   */
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<TransactionObject | null> {
    this.logger.log(`Resolving reference for Transaction with ID: ${reference.id}`);
    const transaction = await this.transactionService.findById(reference.id);
    if (!transaction) {
      this.logger.warn(`Transaction with ID ${reference.id} not found during reference resolution.`);
      return null;
    }
    return transaction;
  }

  /**
   * @method initiatePayment
   * @description Initiates a multi-step payment saga as a durable Temporal workflow.
   * The user's identity is securely obtained from the JWT auth context.
   * @param {AuthenticatedUser} currentUser The authenticated user injected by the `CurrentUser` decorator.
   * @param {InitiatePaymentInput} input The payment details.
   * @returns {Promise<InitiatePaymentResponse>} The workflow ID and initial status of the payment.
   */
  @Mutation(() => InitiatePaymentResponse, {
    description: 'Initiates a new multi-step payment transfer via a durable workflow.',
  })
  @UseGuards(GqlAuthGuard)
  async initiatePayment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args('input') input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResponse> {
    this.logger.log(
      `Initiating payment for user ${currentUser.userId} from ${input.fromAccountId} to ${input.toAccountId}.`,
    );

    const paymentDto = {
      ...input,
      userId: currentUser.userId,
    };

    const workflowId = await this.transactionService.initiatePayment(paymentDto);

    return {
      workflowId,
      status: 'PENDING',
    };
  }
}
