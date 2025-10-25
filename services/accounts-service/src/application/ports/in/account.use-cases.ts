/**
 * @file Defines the inbound ports (use case interfaces) for the Account bounded context,
 * adhering to Hexagonal Architecture principles. These interfaces represent the contract
 * for all application-level operations, separating the core logic from the driving adapters
 * (e.g., GraphQL resolvers, REST controllers, or event listeners).
 */

import { Account } from '../../../domain/entities/account.aggregate';
import { AccountView } from '../../queries/account.view';

// --- Injection Tokens for Use Cases ---

export const CREATE_ACCOUNT_USE_CASE = Symbol('ICreateAccountUseCase');
export const DEPOSIT_MONEY_USE_CASE = Symbol('IDepositMoneyUseCase');
export const WITHDRAW_MONEY_USE_CASE = Symbol('IWithdrawMoneyUseCase');
export const GET_ACCOUNT_QUERY_USE_CASE = Symbol('IGetAccountQueryUseCase');
export const GET_USER_ACCOUNTS_QUERY_USE_CASE = Symbol('IGetUserAccountsQueryUseCase');

// --- Command and Query DTOs ---

/**
 * @interface CreateAccountCommand
 * @description Command to create a new account for a user.
 */
export interface CreateAccountCommand {
  /** The unique identifier of the user for whom the account is being created. */
  readonly userId: string;
  /** The type of account to create (e.g., checking or savings). */
  readonly accountType: 'checking' | 'savings';
  /** Optional initial balance for the account. Defaults to 0. */
  readonly initialBalance?: number;
  /** The ISO 4217 currency code for the account. Defaults to 'USD'. */
  readonly currency?: string;
}

/**
 * @interface DepositMoneyCommand
 * @description Command to deposit money into a specific account.
 */
export interface DepositMoneyCommand {
  /** The unique identifier of the target account. */
  readonly accountId: string;
  /** The amount of money to deposit. Must be a positive number. */
  readonly amount: number;
  /** The ISO 4217 currency code of the amount. */
  readonly currency: string;
  /** A unique identifier for the transaction to ensure idempotency. */
  readonly transactionId: string;
}

/**
 * @interface WithdrawMoneyCommand
 * @description Command to withdraw money from a specific account.
 */
export interface WithdrawMoneyCommand {
  /** The unique identifier of the target account. */
  readonly accountId: string;
  /** The amount of money to withdraw. Must be a positive number. */
  readonly amount: number;
  /** The ISO 4217 currency code of the amount. */
  readonly currency: string;
  /** A unique identifier for the transaction to ensure idempotency. */
  readonly transactionId: string;
}

/**
 * @interface GetAccountByIdQuery
 * @description Query to retrieve the details of a single account.
 */
export interface GetAccountByIdQuery {
  /** The unique identifier of the account to retrieve. */
  readonly accountId: string;
}

/**
 * @interface GetAccountsByUserIdQuery
 * @description Query to retrieve all accounts for a specific user.
 */
export interface GetAccountsByUserIdQuery {
  /** The unique identifier of the user whose accounts are to be retrieved. */
  readonly userId: string;
}

// --- Use Case Interfaces (Inbound Ports) ---

/**
 * @port ICreateAccountUseCase
 * @description Inbound port for the use case of creating a new account. This is a command-side operation.
 */
export interface ICreateAccountUseCase {
  /**
   * Executes the account creation command.
   * @param {CreateAccountCommand} command - The command containing the details for the new account.
   * @returns {Promise<Account>} A promise that resolves to the newly created Account aggregate.
   */
  createAccount(command: CreateAccountCommand): Promise<Account>;
}

/**
 * @port IDepositMoneyUseCase
 * @description Inbound port for the use case of depositing money into an account. This is a command-side operation.
 */
export interface IDepositMoneyUseCase {
  /**
   * Executes the deposit command.
   * @param {DepositMoneyCommand} command - The command containing the details of the deposit.
   * @returns {Promise<void>} A promise that resolves when the deposit has been processed and corresponding events have been stored.
   */
  depositMoney(command: DepositMoneyCommand): Promise<void>;
}

/**
 * @port IWithdrawMoneyUseCase
 * @description Inbound port for the use case of withdrawing money from an account. This is a command-side operation.
 */
export interface IWithdrawMoneyUseCase {
  /**
   * Executes the withdrawal command.
   * @param {WithdrawMoneyCommand} command - The command containing the details of the withdrawal.
   * @returns {Promise<void>} A promise that resolves when the withdrawal has been processed and corresponding events have been stored.
   */
  withdrawMoney(command: WithdrawMoneyCommand): Promise<void>;
}

/**
 * @port IGetAccountQueryUseCase
 * @description Inbound port for querying the details of a single account. This is a query-side operation that targets a read model.
 */
export interface IGetAccountQueryUseCase {
  /**
   * Executes the query to get an account by its ID.
   * @param {GetAccountByIdQuery} query - The query containing the account ID.
   * @returns {Promise<AccountView | null>} A promise that resolves to the account's read model projection, or null if not found.
   */
  getAccount(query: GetAccountByIdQuery): Promise<AccountView | null>;
}

/**
 * @port IGetUserAccountsQueryUseCase
 * @description Inbound port for querying all accounts belonging to a user. This is a query-side operation that targets a read model.
 */
export interface IGetUserAccountsQueryUseCase {
  /**
   * Executes the query to get all accounts for a user.
   * @param {GetAccountsByUserIdQuery} query - The query containing the user ID.
   * @returns {Promise<AccountView[]>} A promise that resolves to an array of the user's account projections.
   */
  getAccountsByUserId(query: GetAccountsByUserIdQuery): Promise<AccountView[]>;
}
