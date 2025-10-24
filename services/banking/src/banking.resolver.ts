import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  ObjectType,
  Query,
  Resolver,
  Mutation,
  Parent,
  ResolveField,
  ResolveReference,
} from '@nestjs/graphql';
import { BankingService } from './banking.service';

// --- GraphQL Object Types ---

@ObjectType()
class Balance {
  @Field(() => Float)
  current: number;

  @Field(() => Float, { nullable: true })
  available: number;

  @Field()
  iso_currency_code: string;
}

@ObjectType()
export class Account {
  @Field(() => ID)
  account_id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  mask: string;

  @Field()
  type: string;

  @Field()
  subtype: string;

  @Field(() => Balance)
  balances: Balance;
}

@ObjectType()
export class Transaction {
  @Field(() => ID)
  transaction_id: string;

  @Field(() => ID)
  account_id: string;

  @Field(() => Float)
  amount: number;

  @Field()
  iso_currency_code: string;

  @Field()
  date: string;

  @Field()
  name: string;

  @Field(() => [String])
  category: string[];

  @Field()
  pending: boolean;
}

@ObjectType()
class ChartDataPoint {
  @Field()
  name: string;

  @Field(() => Float)
  value: number;
}

@ObjectType()
export class FinancialSummary {
  @Field(() => Float)
  totalBalance: number;

  @Field(() => [ChartDataPoint])
  balanceChartData: ChartDataPoint[];

  @Field(() => [ChartDataPoint])
  spendingByCategory: ChartDataPoint[];
}

@ObjectType()
class CreateLinkTokenResponse {
  @Field()
  link_token: string;

  @Field()
  expiration: string;
}

@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  id: string;

  // These fields are added by this subgraph to the User entity
  @Field(() => [Account], { nullable: true })
  accounts?: Account[];

  @Field(() => [Transaction], { nullable: true })
  transactions?: Transaction[];

  @Field(() => FinancialSummary, { nullable: true })
  financialSummary?: FinancialSummary;
}

// --- Resolver ---

@Resolver(() => User)
export class BankingResolver {
  constructor(private readonly bankingService: BankingService) {}

  // --- Mutations ---

  @Mutation(() => CreateLinkTokenResponse, {
    description:
      'Creates a Plaid Link token to initialize the Plaid Link flow on the client.',
  })
  async createLinkToken(
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<CreateLinkTokenResponse> {
    // In a real app, userId would come from an authenticated context
    return this.bankingService.createLinkToken(userId);
  }

  @Mutation(() => Boolean, {
    description:
      'Exchanges a Plaid public token for an access token and links the account.',
  })
  async exchangePublicToken(
    @Args('publicToken') publicToken: string,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<boolean> {
    // The service is responsible for securely storing the access token
    await this.bankingService.exchangeAndStorePublicToken(publicToken, userId);
    return true;
  }

  // --- Field Resolvers for extending the User Entity ---

  @ResolveField('accounts', () => [Account])
  async getAccountsForUser(@Parent() user: User): Promise<Account[]> {
    return this.bankingService.getAccounts(user.id);
  }

  @ResolveField('transactions', () => [Transaction])
  async getTransactionsForUser(
    @Parent() user: User,
    @Args('accountId', { type: () => ID, nullable: true }) accountId?: string,
  ): Promise<Transaction[]> {
    return this.bankingService.getTransactions(user.id, accountId);
  }

  @ResolveField('financialSummary', () => FinancialSummary)
  async getFinancialSummaryForUser(@Parent() user: User): Promise<FinancialSummary> {
    return this.bankingService.getFinancialSummary(user.id);
  }

  // --- Resolve Reference for Federation ---
  // This allows other services to get a User object from this service
  // using just the user's ID. The gateway then uses this stub to call
  // the field resolvers above.
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }): User {
    return {
      id: reference.id,
    };
  }
}
