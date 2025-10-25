/**
 * @file services/accounts-service/src/application/services/account-command.service.ts
 * @description This file contains the command service for the Account bounded context.
 * It adheres to CQRS by handling all state-changing operations (commands) and orchestrating
 * interactions between the domain aggregates and the event store.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { AccountAggregate } from '../../domain/aggregates/account.aggregate';
import { IAccountRepository } from '../../domain/repositories/account.repository.port';
import { ACCOUNT_REPOSITORY } from '../../account.constants';

// --- Event DTOs (interfaces for payloads from other services) ---
// In a real project, these would be in a shared types library.

/**
 * @interface UserCreatedEventPayload
 * @description Defines the structure of the payload for a 'user.created' event.
 */
interface UserCreatedEventPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * @interface PlaidItemCreatedEventPayload
 * @description Defines the structure of the payload for a 'plaid.item.created' event.
 */
interface PlaidItemCreatedEventPayload {
  userId: string;
  itemId: string;
  accessToken: string;
  institutionName: string;
}

/**
 * @interface TransactionsSyncedEventPayload
 * @description Defines the structure of the payload for a 'transactions.synced' event.
 */
interface TransactionsSyncedEventPayload {
  userId: string;
  itemId: string;
  transactions: any[]; // Raw Plaid transaction objects
}

/**
 * @class AccountCommandService
 * @description Application Service for handling commands related to the Account aggregate.
 * This is the primary entry point for state changes in the Account bounded context,
 * adhering to CQRS principles. It orchestrates the loading of aggregates, execution of
 * domain logic, and persistence of resulting events.
 */
@Injectable()
export class AccountCommandService {
  private readonly logger = new Logger(AccountCommandService.name);

  /**
   * @constructor
   * @param {IAccountRepository} accountRepository - Injected repository (adapter) for interacting with the event store.
   */
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) {}

  /**
   * @method createDefaultAccountForUser
   * @description Handles the command to create a default account for a new user, typically triggered by a `user.created` event.
   * @param {UserCreatedEventPayload} payload - The event payload from the user service.
   * @returns {Promise<string>} The ID of the newly created account aggregate.
   */
  async createDefaultAccountForUser(payload: UserCreatedEventPayload): Promise<string> {
    const accountId = `demobank-acct-${payload.userId}`;
    this.logger.log(`Handling command to create default account for user ID: ${payload.userId}`);

    const existingAccount = await this.accountRepository.findById(accountId);
    if (existingAccount) {
      this.logger.warn(`Default account with ID ${accountId} already exists. Command is idempotent.`);
      return accountId;
    }

    const account = AccountAggregate.create(
      accountId,
      payload.userId,
      'Demo Bank Checking',
      'checking',
      'depository',
      'Demo Bank',
      1000, // Starting bonus balance
      'USD',
    );

    await this.accountRepository.save(account);
    this.logger.log(`Successfully created and persisted default account: ${accountId}`);

    return accountId;
  }

  /**
   * @method linkExternalInstitution
   * @description This is a conceptual method triggered by 'plaid.item.created'. It would create `AccountAggregate`
   * instances for each new external account discovered.
   * @param {PlaidItemCreatedEventPayload} payload - The event payload from the plaid-integration-service.
   * @returns {Promise<void>}
   */
  async linkExternalInstitution(payload: PlaidItemCreatedEventPayload): Promise<void> {
    this.logger.log(`Handling command to link external institution for user ${payload.userId}`);
    // In a real implementation, this would fetch account details using the accessToken
    // from the Plaid Integration Service, then create new Account aggregates.
    this.logger.log(`Placeholder for linking external accounts from institution: ${payload.institutionName}`);
  }

  /**
   * @method processSyncedTransactions
   * @description Placeholder for processing synced transactions. In a full event-sourced model,
   * new transactions might trigger balance update commands.
   * @param {TransactionsSyncedEventPayload} payload - The event payload.
   * @returns {Promise<void>}
   */
  async processSyncedTransactions(payload: TransactionsSyncedEventPayload): Promise<void> {
    this.logger.log(`Handling command to process ${payload.transactions.length} synced transactions for item ${payload.itemId}`);
    // This logic would iterate through transactions and dispatch Debit/Credit commands if necessary.
  }

  /**
   * @method debitAccount
   * @description Handles the command to debit funds from an account.
   * @param {string} accountId - The ID of the account to debit.
   * @param {number} amount - The amount to debit.
   * @param {string} transactionId - The unique ID for this transaction, for idempotency.
   * @returns {Promise<void>}
   */
  async debitAccount(accountId: string, amount: number, transactionId: string): Promise<void> {
    this.logger.log(`Handling DebitAccountCommand for account: ${accountId}, amount: ${amount}`);

    const account = await this.accountRepository.findById(accountId);
    account.debit(amount, transactionId);

    await this.accountRepository.save(account);
    this.logger.log(`Successfully processed debit for account: ${accountId}`);
  }

  /**
   * @method creditAccount
   * @description Handles the command to credit funds to an account.
   * @param {string} accountId - The ID of the account to credit.
   * @param {number} amount - The amount to credit.
   * @param {string} transactionId - The unique ID for this transaction, for idempotency.
   * @returns {Promise<void>}
   */
  async creditAccount(accountId: string, amount: number, transactionId: string): Promise<void> {
    this.logger.log(`Handling CreditAccountCommand for account: ${accountId}, amount: ${amount}`);

    const account = await this.accountRepository.findById(accountId);
    account.credit(amount, transactionId);

    await this.accountRepository.save(account);
    this.logger.log(`Successfully processed credit for account: ${accountId}`);
  }

  /**
   * @method refundAccount
   * @description Handles a command to refund a previous debit, typically as part of a compensation saga.
   * @param {string} accountId - The account to refund.
   * @param {number} amount - The amount to refund.
   * @param {string} transactionId - The ID of the original transaction being compensated.
   * @returns {Promise<void>}
   */
  async refundAccount(accountId: string, amount: number, transactionId: string): Promise<void> {
    this.logger.log(`Handling Refund command for account: ${accountId}, amount: ${amount}`);

    const account = await this.accountRepository.findById(accountId);
    account.refund(amount, transactionId);

    await this.accountRepository.save(account);
    this.logger.log(`Successfully processed refund for account: ${accountId}`);
  }
}
