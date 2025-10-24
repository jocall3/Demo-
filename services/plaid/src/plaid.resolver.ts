import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  Mutation,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
  ResolveReference,
} from '@nestjs/graphql';
import { PlaidService } from './plaid.service'; // Assuming this service exists
import { Logger } from '@nestjs/common';

// --- GraphQL Object Types ---

@ObjectType({ description: 'Response containing a Plaid Link token.' })
export class CreateLinkTokenResponse {
  @Field(() => String, { description: 'The token to initialize Plaid Link on the frontend.' })
  link_token: string;

  @Field(() => String, { description: 'The expiration date of the link token in ISO 8601 format.' })
  expiration: string;
}

@ObjectType({ description: 'Represents the balance of a financial account.' })
class Balance {
  @Field(() => Float, {
    nullable: true,
    description: 'The amount of funds available for use. This can be null if not available.',
  })
  available: number | null;

  @Field(() => Float, { description: 'The total amount of funds in the account.' })
  current: number;

  @Field(() => String, { nullable: true, description: 'The ISO-4217 currency code of the balance.' })
  iso_currency_code: string | null;
}

@ObjectType({ description: 'A financial transaction associated with an account.' })
@Directive('@key(fields: "id")')
export class Transaction {
  @Field(() => ID, { description: "Plaid's unique ID for the transaction." })
  id: string;

  @Field(() => String, { description: 'The date the transaction posted, in ISO 8601 format (YYYY-MM-DD).' })
  date: string;

  @Field(() => String, { description: 'The merchant name or transaction description.' })
  name: string;

  @Field(() => Float, { description: 'The settled amount of the transaction. Positive for credits, negative for debits.' })
  amount: number;

  @Field(() => String, { nullable: true, description: 'The ISO-4217 currency code of the transaction.' })
  iso_currency_code: string | null;

  @Field(() => [String], { description: 'A hierarchical list of categories reflecting the transaction.' })
  category: string[];

  @Field({ description: 'Indicates if the transaction is still pending or has posted.' })
  pending: boolean;
}

@ObjectType({ description: 'A financial account linked via Plaid.' })
@Directive('@key(fields: "id")')
export class Account {
  @Field(() => ID, { description: "Plaid's unique ID for the account." })
  id: string;

  @Field(() => String, { description: 'The official name of the account.' })
  name: string;

  @Field(() => String, { nullable: true, description: 'The last 2-4 alphanumeric characters of an account number.' })
  mask: string | null;

  @Field(() => String, { description: 'The high-level type of the account (e.g., "depository").' })
  type: string;

  @Field(() => String, { nullable: true, description: 'The specific subtype of the account (e.g., "checking").' })
  subtype: string | null;

  // These fields will be resolved by the AccountResolver
  @Field(() => Balance)
  balance: Balance;

  @Field(() => [Transaction])
  transactions: Transaction[];
}

@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  // This field is added by this subgraph
  @Field(() => [Account])
  accounts?: Account[];
}

// --- Resolvers ---

@Resolver()
export class PlaidMutationResolver {
  private readonly logger = new Logger(PlaidMutationResolver.name);

  constructor(private readonly plaidService: PlaidService) {}

  @Mutation(() => CreateLinkTokenResponse, { description: 'Creates a Plaid Link token to initialize the Plaid Link flow for a user.' })
  async createLinkToken(
    @Args('userId', { type: () => String }) userId: string,
  ): Promise<CreateLinkTokenResponse> {
    this.logger.log(`Executing createLinkToken mutation for user: ${userId}`);
    return this.plaidService.createLinkToken(userId);
  }

  @Mutation(() => Boolean, { description: 'Exchanges a Plaid public token for a permanent access token and links the account.' })
  async exchangePublicToken(
    @Args('publicToken', { type: () => String }) publicToken: string,
    @Args('userId', { type: () => String }) userId: string,
  ): Promise<boolean> {
    this.logger.log(`Executing exchangePublicToken mutation for user: ${userId}`);
    await this.plaidService.exchangeAndStorePublicToken(publicToken, userId);
    return true;
  }
}

@Resolver(of => User)
export class PlaidUserResolver {
    constructor(private readonly plaidService: PlaidService) {}

    @ResolveField('accounts', () => [Account])
    async getAccounts(@Parent() user: User): Promise<Account[]> {
        return this.plaidService.getAccounts(user.id);
    }
}

@Resolver(of => Account)
export class PlaidAccountResolver {
    private readonly logger = new Logger(PlaidAccountResolver.name);
    
    constructor(private readonly plaidService: PlaidService) {}

    @ResolveField('balance', () => Balance)
    async getBalance(@Parent() account: Account): Promise<Balance> {
        this.logger.log(`Resolving balance for account ${account.id}`);
        // This assumes the service has a method to fetch balance for a single account.
        // The service layer would handle authentication/authorization to ensure the user
        // requesting this data is allowed to see it.
        return this.plaidService.getBalanceForAccount(account.id);
    }

    @ResolveField('transactions', () => [Transaction])
    async getTransactions(
        @Parent() account: Account,
        @Args('limit', { type: () => Number, nullable: true, defaultValue: 100 }) limit: number,
    ): Promise<Transaction[]> {
        this.logger.log(`Resolving transactions for account ${account.id} with limit ${limit}`);
        return this.plaidService.getTransactionsForAccount(account.id, { count: limit });
    }
    
    @ResolveReference()
    resolveReference(reference: { __typename: string; id: string }): Promise<Account> {
        this.logger.log(`Resolving reference for Account with id ${reference.id}`);
        return this.plaidService.getAccountById(reference.id);
    }
}
