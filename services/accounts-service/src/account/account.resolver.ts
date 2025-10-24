import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
  ResolveReference,
} from '@nestjs/graphql';
import { AccountService } from './account.service';
import { Logger } from '@nestjs/common';

// =============================================================================
// GraphQL Object Types
// =============================================================================

@ObjectType({ description: 'Represents the balance of a financial account.' })
class Balance {
  @Field(() => Float, {
    nullable: true,
    description: 'The amount of funds available for use.',
  })
  available: number | null;

  @Field(() => Float, { description: 'The total amount of funds in the account.' })
  current: number;

  @Field(() => String, {
    nullable: true,
    description: 'The ISO-4217 currency code of the balance.',
  })
  iso_currency_code: string | null;
}

@ObjectType({ description: 'A financial account, owned by the accounts-service.' })
@Directive('@key(fields: "id")')
export class Account {
  @Field(() => ID, {
    description: "The account's unique identifier, typically from the data provider.",
  })
  id: string;

  @Field(() => ID, { description: 'The ID of the user who owns the account.' })
  userId: string;

  @Field(() => String, { description: 'The official name of the account.' })
  name: string;

  @Field(() => String, {
    nullable: true,
    description: 'The last 2-4 alphanumeric characters of an account number.',
  })
  mask: string | null;

  @Field(() => String, {
    description: 'The high-level type of the account (e.g., "depository").',
  })
  type: string;

  @Field(() => String, {
    nullable: true,
    description: 'The specific subtype of the account (e.g., "checking").',
  })
  subtype: string | null;

  @Field(() => Balance, { description: 'The balance of funds in the account.' })
  balance: Balance;
}

/**
 * Represents the User entity, which is defined and owned by an external `UserService`.
 * This service extends the User entity to add the `accounts` field.
 */
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  // This field is added by the accounts-service subgraph.
  @Field(() => [Account])
  accounts: Account[];
}

// =============================================================================
// Resolvers
// =============================================================================

/**
 * Resolves fields for the `Account` entity, which is owned by this service.
 * It provides queries to fetch accounts and handles entity resolution for federation,
 * allowing other subgraphs to reference and extend the Account entity.
 */
@Resolver(() => Account)
export class AccountResolver {
  private readonly logger = new Logger(AccountResolver.name);

  constructor(private readonly accountService: AccountService) {}

  @Query(() => Account, {
    name: 'account',
    nullable: true,
    description: 'Retrieves a single account by its ID.',
  })
  async getAccountById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Account | null> {
    // NOTE: In a production service, this query would be protected and scoped
    // to ensure the requesting user is authorized to view this account.
    this.logger.log(`Fetching account by id: ${id}`);
    return this.accountService.findAccountById(id);
  }

  /**
   * This is the resolver for the `Account` entity reference.
   * It enables other subgraphs to reference an `Account` by its `id`.
   * For example, the `transactions-service` might use this to extend `Account`
   * with a `transactions` field.
   */
  @ResolveReference()
  async resolveReference(reference: {
    __typename: string;
    id: string;
  }): Promise<Account> {
    this.logger.log(`Resolving reference for Account with id: ${reference.id}`);
    const account = await this.accountService.findAccountById(reference.id);
    if (!account) {
      throw new Error(`Account with id ${reference.id} not found.`);
    }
    return account;
  }
}

/**
 * Extends the external `User` entity from the `UserService`.
 * This resolver adds the `accounts` field, linking a user to their financial accounts.
 */
@Resolver(() => User)
export class UserAccountsResolver {
  private readonly logger = new Logger(UserAccountsResolver.name);

  constructor(private readonly accountService: AccountService) {}

  @ResolveField('accounts', () => [Account])
  getAccounts(@Parent() user: User): Promise<Account[]> {
    this.logger.log(`Resolving accounts for user: ${user.id}`);
    return this.accountService.findAccountsByUserId(user.id);
  }
}
