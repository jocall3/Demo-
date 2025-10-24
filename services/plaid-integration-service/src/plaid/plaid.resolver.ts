import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
  ResolveReference,
} from '@nestjs/graphql';
import { PlaidService } from './plaid.service';
import { Logger } from '@nestjs/common';
import { Account as PlaidAccount, Transaction as PlaidTransaction } from 'plaid';

// --- GraphQL Object & Input Types ---
// These types define the schema exposed by this subgraph for Plaid integration.

@ObjectType({ description: 'Response containing a Plaid Link token.' })
class CreateLinkTokenResponse {
  @Field(() => String, { description: 'The token used to initialize Plaid Link on the client.' })
  link_token: string;

  @Field(() => String, { description: 'The expiration date of the link token in ISO 8601 format.' })
  expiration: string;
}

@ObjectType({ description: 'Represents the balance of a financial account.' })
class Balance {
  @Field(() => Float, { nullable: true, description: 'The amount of funds available for use.' })
  available: number | null;

  @Field(() => Float, { description: 'The total amount of funds in the account.' })
  current: number;

  @Field(() => String, { nullable: true, description: 'The ISO-4217 currency code of the balance.' })
  iso_currency_code: string | null;
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

  @Field(() => Balance, { description: "The account's balance information." })
  balance: Balance;
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

  @Field(() => Float, { description: 'The settled amount of the transaction. Positive for debits, negative for credits.' })
  amount: number;

  @Field(() => String, { nullable: true, description: 'The ISO-4217 currency code of the transaction.' })
  iso_currency_code: string | null;

  @Field(() => [String], { description: 'A hierarchical list of categories reflecting the transaction.' })
  category: string[];

  @Field({ description: 'Indicates if the transaction is still pending or has posted.' })
  pending: boolean;

  @Field(() => ID, { description: 'The ID of the account to which this transaction belongs.' })
  account_id: string;
}

@InputType({ description: 'Input for fetching transactions within a date range.' })
class TransactionsByDateInput {
  @Field(() => String, { description: 'Start date in YYYY-MM-DD format.' })
  startDate: string;

  @Field(() => String, { description: 'End date in YYYY-MM-DD format.' })
  endDate: string;
}

@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [Account], { description: 'A list of Plaid-linked financial accounts for the user.' })
  accounts?: Account[];

  @Field(() => [Transaction], { description: 'A list of all transactions from Plaid-linked accounts for the user.' })
  transactions?: Transaction[];
}

// --- Plaid Resolver ---

@Resolver(() => User)
export class PlaidResolver {
  private readonly logger = new Logger(PlaidResolver.name);

  constructor(private readonly plaidService: PlaidService) {}

  @Mutation(() => CreateLinkTokenResponse, { description: 'Creates a Plaid Link token for a user to initialize the frontend Link flow.' })
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

  @Mutation(() => Boolean, { description: 'Exchanges a Plaid public token for a permanent access token.' })
  async exchangePublicToken(
    @Args('publicToken', { type: () => String }) publicToken: string,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<boolean> {
    this.logger.log(`Executing exchangePublicToken mutation for user: ${userId}`);
    const { success } = await this.plaidService.exchangePublicToken(publicToken, userId);
    return success;
  }

  @ResolveField('accounts', () => [Account])
  async getAccounts(@Parent() user: User): Promise<any[]> {
    const plaidAccounts: PlaidAccount[] = await this.plaidService.getAccounts(user.id);
    return plaidAccounts.map(acc => ({
      id: acc.account_id,
      name: acc.name,
      mask: acc.mask,
      type: acc.type,
      subtype: acc.subtype,
      balance: acc.balances,
    }));
  }

  @ResolveField('transactions', () => [Transaction])
  async getTransactions(
    @Parent() user: User,
    @Args('input') input: TransactionsByDateInput,
  ): Promise<any[]> {
    const plaidTransactions: PlaidTransaction[] = await this.plaidService.getTransactions(user.id, input.startDate, input.endDate);
    return plaidTransactions.map(tx => ({
      id: tx.transaction_id,
      date: tx.date,
      name: tx.name,
      amount: tx.amount,
      iso_currency_code: tx.iso_currency_code,
      category: tx.category,
      pending: tx.pending,
      account_id: tx.account_id,
    }));
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }): User {
    return {
      id: reference.id,
    };
  }
}
