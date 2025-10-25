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
import { Logger, Inject } from '@nestjs/common';
import { IAccountQueryService } from '../../application/ports/account-query-service.interface';
import { ACCOUNT_QUERY_SERVICE } from '../../application/ports/constants';
import { CurrentGqlUser } from '../decorators/current-user.decorator';
import { Account as AccountProjection } from '../../domain/read-model/account.projection';

// --- GraphQL Object Types (DTOs for the Adapter) ---

/**
 * @ObjectType Balance
 * @description GraphQL type representing the balance of a financial account. This is a read model projection.
 * @property {number | null} available - The amount of funds available for use. Can be null.
 * @property {number} current - The total amount of funds in the account, including pending transactions.
 * @property {string | null} iso_currency_code - The ISO-4217 currency code of the balance.
 */
@ObjectType({ description: 'Represents the balance of a financial account.' })
class Balance {
  @Field(() => Float, {
    nullable: true,
    description: 'The amount of funds available for use.',
  })
  available: number | null;

  @Field(() => Float, {
    description: 'The total amount of funds in the account.',
  })
  current: number;

  @Field(() => String, {
    nullable: true,
    description: 'The ISO-4217 currency code of the balance.',
  })
  iso_currency_code: string | null;
}

/**
 * @ObjectType Account
 * @description GraphQL entity representing a financial account. This is owned by the accounts-service.
 * It serves as a read model projection, optimized for querying.
 * @property {string} id - The account's unique identifier.
 * @property {string} userId - The ID of the user who owns the account.
 * @property {string} name - The official name of the account.
 * @property {string | null} mask - The last 2-4 alphanumeric characters of an account number.
 * @property {string} type - The high-level type of the account (e.g., "depository").
 * @property {string | null} subtype - The specific subtype of the account (e.g., "checking").
 * @property {Balance} balance - The balance of funds in the account.
 */
@ObjectType({ description: 'A financial account, owned by the accounts-service.' })
@Directive('@key(fields: "id")')
export class Account {
  @Field(() => ID, {
    description: "The account's unique identifier, typically from the data provider or internal system.",
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
 * @ObjectType User
 * @description Extends the federated `User` entity (owned by user-service)
 * to contribute the `accounts` field from this service's domain.
 * @property {string} id - The unique identifier of the user (primary key).
 * @property {Account[]} accounts - The financial accounts associated with this user.
 */
@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;

  @Field(() => [Account])
  accounts: Account[];
}

/**
 * @Resolver AccountResolver
 * @description A GraphQL resolver for handling queries and entity references related to the `Account` entity.
 * This is a "Query" adapter in the Hexagonal Architecture. It delegates all data retrieval to the
 * application's query service port (`IAccountQueryService`).
 */
@Resolver(() => Account)
export class AccountResolver {
  private readonly logger = new Logger(AccountResolver.name);

  /**
   * @constructor
   * @param {IAccountQueryService} accountQueryService - Injects the application's query service via its defined port.
   */
  constructor(
    @Inject(ACCOUNT_QUERY_SERVICE)
    private readonly accountQueryService: IAccountQueryService,
  ) {}

  /**
   * @Query account
   * @description Retrieves a single account by its unique ID.
   * @param {string} id - The ID of the account to retrieve.
   * @returns {Promise<AccountProjection | null>} The account projection if found, otherwise null.
   */
  @Query(() => Account, {
    name: 'account',
    nullable: true,
    description: 'Retrieves a single account by its ID.',
  })
  async getAccountById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<AccountProjection | null> {
    this.logger.log(`GraphQL Query: getAccountById for ID: ${id}`);
    return this.accountQueryService.findAccountById(id);
  }

  /**
   * @Query myAccounts
   * @description Retrieves all accounts for the currently authenticated user.
   * The user's ID is extracted from the JWT in the GraphQL context.
   * @param {string} userId - The authenticated user's ID, injected by the CurrentGqlUser decorator.
   * @returns {Promise<AccountProjection[]>} A list of the user's accounts.
   */
  @Query(() => [Account], {
    name: 'myAccounts',
    description: 'Retrieves all accounts for the currently authenticated user.',
  })
  async getMyAccounts(@CurrentGqlUser('sub') userId: string): Promise<AccountProjection[]> {
    this.logger.log(`GraphQL Query: getMyAccounts for authenticated user ID: ${userId}`);
    return this.accountQueryService.findAccountsByUserId(userId);
  }

  /**
   * @ResolveReference
   * @description Resolves an `Account` entity reference for Apollo Federation.
   * This is called by the gateway when another service returns a stub of an Account.
   * @param {{ __typename: string; id: string }} reference - The entity stub with the ID.
   * @returns {Promise<AccountProjection>} The fully resolved account object.
   */
  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: string },
  ): Promise<AccountProjection> {
    this.logger.debug(
      `Federation: Resolving reference for Account with ID: ${reference.id}`,
    );
    const account = await this.accountQueryService.findAccountById(reference.id);
    if (!account) {
      this.logger.warn(
        `Federation: Account with ID ${reference.id} not found during reference resolution.`,
      );
      // In a federated graph, it's crucial to resolve the reference or throw.
      // Returning null can cause unexpected graph-wide nullability issues.
      throw new Error(`Account with ID ${reference.id} not found.`);
    }
    return account;
  }
}

/**
 * @Resolver UserAccountsResolver
 * @description A GraphQL resolver for extending the federated `User` entity.
 * It provides the `accounts` field, linking data from the accounts-service
 * to the core User entity defined in the user-service.
 */
@Resolver(() => User)
export class UserAccountsResolver {
  private readonly logger = new Logger(UserAccountsResolver.name);

  /**
   * @constructor
   * @param {IAccountQueryService} accountQueryService - Injects the application's query service.
   */
  constructor(
    @Inject(ACCOUNT_QUERY_SERVICE)
    private readonly accountQueryService: IAccountQueryService,
  ) {}

  /**
   * @ResolveField accounts
   * @description Resolves the `accounts` field for a `User` entity.
   * This method is triggered by the Apollo Gateway whenever a query requests the `accounts` field on a `User`.
   * @param {User} user - The parent User object stub, containing the `id`.
   * @returns {Promise<AccountProjection[]>} A list of financial accounts associated with the user.
   */
  @ResolveField('accounts', () => [Account], {
    description: 'Retrieves all financial accounts associated with a user.',
  })
  getAccounts(@Parent() user: User): Promise<AccountProjection[]> {
    this.logger.log(`GraphQL ResolveField: getAccounts for user ID: ${user.id}`);
    return this.accountQueryService.findAccountsByUserId(user.id);
  }
}
