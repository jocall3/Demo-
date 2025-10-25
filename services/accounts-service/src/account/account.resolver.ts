/**
 * @file services/accounts-service/src/account/account.resolver.ts
 * @description This file contains the GraphQL resolvers for the Account bounded context.
 * As an "Adapter" in a Hexagonal Architecture, this resolver is the primary entry point
 * for GraphQL API requests. It translates these requests into calls to the application layer,
 * strictly adhering to CQRS principles by separating read (Query) and write (Mutation) operations.
 *
 * - Queries are delegated to the `AccountQueryService`, which interacts with a denormalized read model.
 * - Mutations are delegated to the `AccountCommandService`, which dispatches commands to the domain.
 */

import {
  Args,
  Directive,
  Field,
  Float,
  ID,
  InputType,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
  ResolveReference,
  Mutation,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { AccountQueryService } from './queries/account-query.service';
import { AccountCommandService } from './commands/account-command.service';

// --- GraphQL Object Types (Read Models) ---

/**
 * Represents the balance of a financial account.
 * This is a read model projection.
 * @class Balance
 */
@ObjectType({ description: 'Represents the balance of a financial account.' })
class Balance {
  /** The amount of funds available for use, which may be different from the current balance. */
  @Field(() => Float, {
    nullable: true,
    description: 'The amount of funds available for use.',
  })
  available: number | null;

  /** The total amount of funds in the account, including any pending transactions. */
  @Field(() => Float, { description: 'The total amount of funds in the account.' })
  current: number;

  /** The ISO-4217 currency code of the balance. */
  @Field(() => String, {
    nullable: true,
    description: 'The ISO-4217 currency code of the balance.',
  })
  iso_currency_code: string | null;
}

/**
 * Represents a financial account.
 * This is a federated entity owned by the accounts-service.
 * @class Account
 */
@ObjectType({ description: 'A financial account, owned by the accounts-service.' })
@Directive('@key(fields: "id")')
export class Account {
  /** The account's unique identifier. */
  @Field(() => ID, {
    description: 'The account\'s unique identifier, typically from the data provider or an internal UUID.',
  })
  id: string;

  /** The ID of the user who owns the account. */
  @Field(() => ID, { description: 'The ID of the user who owns the account.' })
  userId: string;

  /** The user-friendly or official name of the account. */
  @Field(() => String, { description: 'The official name of the account.' })
  name: string;

  /** The last 2-4 alphanumeric characters of an account number for display purposes. */
  @Field(() => String, {
    nullable: true,
    description: 'The last 2-4 alphanumeric characters of an account number.',
  })
  mask: string | null;

  /** The high-level type of the account (e.g., "depository", "credit"). */
  @Field(() => String, {
    description: 'The high-level type of the account (e.g., "depository").',
  })
  type: string;

  /** The specific subtype of the account (e.g., "checking", "savings"). */
  @Field(() => String, {
    nullable: true,
    description: 'The specific subtype of the account (e.g., "checking").',
  })
  subtype: string | null;

  /** The current balance of funds in the account. */
  @Field(() => Balance, { description: 'The balance of funds in the account.' })
  balance: Balance;
}

/**
 * Extends the User entity from another subgraph to add accounts.
 * @class User
 */
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  /** The user's unique ID, defined in an external service. */
  @Field(() => ID)
  @Directive('@external')
  id: string;

  /** The list of financial accounts associated with this user. */
  @Field(() => [Account])
  accounts: Account[];
}

// --- GraphQL Input Types (for Mutations/Commands) ---

/**
 * Defines the input for creating a new user-managed account.
 * @class CreateAccountInput
 */
@InputType({ description: 'Input for creating a new user-managed account.' })
class CreateAccountInput {
  @Field(() => ID, { description: 'The ID of the user for whom to create the account.' })
  userId: string;

  @Field({ description: 'A user-defined name for the new account.' })
  name: string;

  @Field({ description: 'The high-level type of the account (e.g., "depository").' })
  type: string;

  @Field({ nullable: true, description: 'The specific subtype (e.g., "savings").' })
  subtype?: string;

  @Field(() => Float, { description: 'The initial balance of the account.', defaultValue: 0 })
  initialBalance: number;
}

// --- Resolvers ---

/**
 * The GraphQL resolver for Account queries, mutations, and entity resolution.
 * @class AccountResolver
 */
@Resolver(() => Account)
export class AccountResolver {
  private readonly logger = new Logger(AccountResolver.name);

  /**
   * Injects the query and command services, separating read and write operations as per CQRS.
   * @param {AccountQueryService} accountQueryService - Service for handling all read operations.
   * @param {AccountCommandService} accountCommandService - Service for dispatching state-changing commands.
   */
  constructor(
    private readonly accountQueryService: AccountQueryService,
    private readonly accountCommandService: AccountCommandService,
  ) {}

  // --- QUERIES ---

  /**
   * Retrieves a single account by its ID by querying the read model.
   * @param {string} id - The unique ID of the account to retrieve.
   * @returns {Promise<Account | null>} The account object if found, otherwise null.
   */
  @Query(() => Account, {
    name: 'account',
    nullable: true,
    description: 'Retrieves a single account by its ID.',
  })
  async getAccountById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Account | null> {
    this.logger.log(`GraphQL Query: getAccountById for ID: ${id}`);
    return this.accountQueryService.findAccountById(id);
  }

  // --- MUTATIONS ---

  /**
   * Creates a new manual account for a user by dispatching a command.
   * @param {CreateAccountInput} input - The details for the new account.
   * @returns {Promise<string>} The ID of the newly created account aggregate.
   */
  @Mutation(() => ID, {
    description: 'Creates a new manual account and returns its ID.',
  })
  async createAccount(
    @Args('input') input: CreateAccountInput,
  ): Promise<string> {
    this.logger.log(`GraphQL Mutation: createAccount for user: ${input.userId}`);
    const accountId = await this.accountCommandService.createAccount(input);
    return accountId;
  }

  /**
   * Closes a user's account by dispatching a command.
   * @param {string} id - The ID of the account to close.
   * @returns {Promise<boolean>} True if the command was dispatched successfully.
   */
  @Mutation(() => Boolean, {
    description: 'Dispatches a command to close an account.',
  })
  async closeAccount(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    this.logger.log(`GraphQL Mutation: closeAccount for ID: ${id}`);
    await this.accountCommandService.closeAccount(id);
    return true;
  }

  // --- FEDERATION ---

  /**
   * Resolves an Account entity reference from another subgraph.
   * @param {{ __typename: string; id: string }} reference - The reference object from the Apollo Gateway.
   * @returns {Promise<Account>} The resolved Account entity.
   */
  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: string },
  ): Promise<Account> {
    this.logger.debug(`Federation: Resolving reference for Account with ID: ${reference.id}`);
    const account = await this.accountQueryService.findAccountById(reference.id);
    if (!account) {
      this.logger.warn(
        `Federation: Account with ID ${reference.id} not found during reference resolution.`,
      );
      throw new Error(`Account with ID ${reference.id} not found.`);
    }
    return account;
  }
}

/**
 * Resolver to extend the federated `User` entity with the `accounts` field.
 * @class UserAccountsResolver
 */
@Resolver(() => User)
export class UserAccountsResolver {
  private readonly logger = new Logger(UserAccountsResolver.name);

  /**
   * Injects the query service to handle read operations.
   * @param {AccountQueryService} accountQueryService - Service for handling all read operations.
   */
  constructor(private readonly accountQueryService: AccountQueryService) {}

  /**
   * Resolves the `accounts` field for a User entity.
   * @param {User} user - The parent User object stub from the Apollo Gateway.
   * @returns {Promise<Account[]>} A list of financial accounts for that user.
   */
  @ResolveField('accounts', () => [Account], {
    description: 'Retrieves all financial accounts associated with a user.',
  })
  getAccounts(@Parent() user: User): Promise<Account[]> {
    this.logger.log(`GraphQL ResolveField: getAccounts for user ID: ${user.id}`);
    return this.accountQueryService.findAccountsByUserId(user.id);
  }
}
