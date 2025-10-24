import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
  ResolveReference,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { PlaidService } from './plaid.service';
import { AccountBase, Transaction as PlaidTransaction } from 'plaid';

// This file contains all Plaid-related resolvers for the subgraph.
// It defines the GraphQL schema for Plaid operations and entities, and how to resolve them.

// --- GraphQL Object Types ---

@ObjectType({ description: 'Response from creating a Plaid Link token.' })
class CreateLinkTokenResponse {
  @Field(() => String, { description: 'The token to initialize Plaid Link.' })
  link_token: string;

  @Field(() => String, { description: 'The expiration date of the link token.' })
  expiration: string;
}

@ObjectType({ description: 'Represents the balance of a financial account.' })
class Balance {
  @Field(() => Float, { nullable: true })
  available: number | null;

  @Field(() => Float)
  current: number;

  @Field(() => String, { nullable: true })
  iso_currency_code: string | null;
}

@ObjectType({ description: 'A financial account linked via Plaid.' })
// Account is a simple object type owned by this subgraph. It is not a federated entity itself.
export class Account {
  @Field(() => ID, { name: 'id', description: "Plaid's unique ID for the account." })
  account_id: string;

  @Field({ description: 'The official name of the account.' })
  name: string;

  @Field({ nullable: true, description: 'The last 2-4 alphanumeric characters of an account number.' })
  mask: string | null;

  @Field({ description: 'The high-level type of the account (e.g., "depository").' })
  type: string;

  @Field({ nullable: true, description: 'The specific subtype of the account (e.g., "checking").' })
  subtype: string | null;

  @Field(() => Balance, { description: 'Balance information for the account.' })
  balances: Balance;
}

@ObjectType({ description: 'A financial transaction associated with an account.' })
@Directive('@key(fields: "id")') // Transaction is an entity that can be referenced by other subgraphs.
export class Transaction {
  @Field(() => ID, { description: "Plaid's unique ID for the transaction." })
  id: string;

  @Field(() => ID, { description: 'The ID of the account to which this transaction belongs.' })
  account_id: string;

  @Field({ description: 'The date the transaction posted, in ISO 8601 format (YYYY-MM-DD).' })
  date: string;

  @Field({ description: 'The merchant name or transaction description.' })
  name: string;

  @Field(() => Float, { description: 'The settled amount of the transaction. Positive for credits, negative for debits.' })
  amount: number;

  @Field({ nullable: true, description: 'The ISO-4217 currency code of the transaction.' })
  iso_currency_code: string | null;

  @Field(() => [String], { description: 'A hierarchical list of categories reflecting the transaction.' })
  category: string[];

  @Field({ description: 'Indicates if the transaction is still pending or has posted.' })
  pending: boolean;
}

@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  // These fields are contributed by the Plaid subgraph to the federated User entity.
  @Field(() => [Account], { description: 'A list of financial accounts linked via Plaid for this user.' })
  accounts?: Account[];

  @Field(() => [Transaction], { description: 'A list of recent financial transactions for this user.' })
  transactions?: Transaction[];
}

// --- Resolvers ---

@Resolver()
export class PlaidResolver {
  private readonly logger = new Logger(PlaidResolver.name);

  constructor(private readonly plaidService: PlaidService) {}

  @Query(() => String, {
    description: 'Health check endpoint for the Plaid service.',
  })
  plaidHealthCheck(): string {
    this.logger.log('Plaid service health check successful.');
    return 'Plaid service is up and running!';
  }

  @Mutation(() => CreateLinkTokenResponse, { description: 'Creates a Plaid Link token to initialize the Plaid Link flow for a user.' })
  async createLinkToken(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<CreateLinkTokenResponse> {
    this.logger.log(`Executing createLinkToken mutation for user: ${userId}`);
    const tokenData = await this.plaidService.createLinkToken(userId);
    return {
      link_token: tokenData.link_token,
      expiration: tokenData.expiration,
    };
  }

  @Mutation(() => Boolean, { description: 'Exchanges a Plaid public token for a permanent access token and links the account to a user.' })
  async exchangePublicToken(
    @Args('publicToken', { type: () => String }) publicToken: string,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<boolean> {
    this.logger.log(`Executing exchangePublicToken mutation for user: ${userId}`);
    // This resolver assumes the PlaidService will securely store the access token associated with the userId.
    await this.plaidService.exchangeAndStorePublicToken(publicToken, userId);
    return true;
  }
}

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly plaidService: PlaidService) {}

  @ResolveField('accounts', () => [Account])
  async getAccounts(@Parent() user: User): Promise<AccountBase[]> {
    // This assumes PlaidService can retrieve the user's access token using their ID.
    return this.plaidService.getAccounts(user.id);
  }

  @ResolveField('transactions', () => [Transaction])
  async getTransactions(
    @Parent() user: User,
    @Args('startDate', { type: () => String, nullable: true }) startDate?: string,
    @Args('endDate', { type: () => String, nullable: true }) endDate?: string,
  ): Promise<PlaidTransaction[]> {
    // Default to the last 30 days if no dates are provided.
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    return this.plaidService.getTransactions(user.id, formatDate(start), formatDate(end));
  }

  // This is required for federation. When another service requests a User by ID,
  // this tells the gateway that this service can resolve that User stub.
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }): User {
    return { id: reference.id, accounts: [], transactions: [] };
  }
}

@Resolver(() => Transaction)
export class TransactionsResolver {
    constructor(private readonly plaidService: PlaidService) {}
    
    // This allows other services to query for a specific Transaction by its ID.
    // e.g., a fraud-detection service could ask for transaction details.
    @ResolveReference()
    async resolveReference(reference: { __typename: string; id: string }): Promise<PlaidTransaction> {
        // This assumes the PlaidService has a method to get a single transaction by its ID.
        return this.plaidService.getTransactionById(reference.id);
    }
}
