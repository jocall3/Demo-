import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IAccountRepository, IEventPublisher } from './ports/account.ports';
import { AccountAggregate } from './domain/account.aggregate';
import { Balance } from './domain/balance.vo';
import { UserCreatedEventPayload, PlaidItemCreatedEventPayload, TransactionsSyncedEventPayload } from './dto/event.payloads';

/**
 * @class AccountService
 * @description This is the **Application Service** for the Account bounded context, following
 * Hexagonal Architecture and CQRS principles. It is responsible for handling the **command-side**
 * of the application logic. Its primary role is to orchestrate the execution of business logic
 * on domain aggregates.
 *
 * It receives commands (either directly from resolvers/controllers or translated from events),
 * uses a repository (port) to load the appropriate aggregate from the event store,
 * executes a method on the aggregate (which performs business validation and creates domain events),
 * and then uses the repository to save the aggregate's new state (i.e., commit the new events).
 *
 * This service does **not** contain any query logic. All read operations are handled by a separate
 * `AccountQueryService` that queries a denormalized read model (projection).
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @Inject('IAccountRepository')
    private readonly accountRepository: IAccountRepository,
    @Inject('IEventPublisher')
    private readonly eventPublisher: IEventPublisher,
  ) {}

  /**
   * Handles the command to create a default internal account for a newly registered user.
   * This method is idempotent; if an account already exists for the user, it will not create a new one.
   * @param {UserCreatedEventPayload} payload - The data from the 'user.created' event.
   * @returns {Promise<string>} The ID of the created or existing account aggregate.
   */
  async createDefaultAccountForUser(payload: UserCreatedEventPayload): Promise<string> {
    const { userId, name } = payload;
    const accountId = `internal-${userId}`;
    this.logger.log(`Executing CreateDefaultAccount command for user: ${userId}`);

    try {
      // Check for existence by trying to load the aggregate. If it exists, we do nothing.
      const existingAccount = await this.accountRepository.findById(accountId);
      if (existingAccount.getVersion() > 0) {
        this.logger.warn(`Default account with ID ${accountId} already exists for user ${userId}. Command is idempotent.`);
        return accountId;
      }

      // Create a new Account aggregate instance.
      const initialBalance = Balance.create(1000, 1000, 'USD');
      const account = AccountAggregate.create(
        accountId,
        userId,
        `${name}'s Checking Account`,
        '0000',
        'depository',
        'checking',
        'Demo Bank',
        initialBalance,
      );

      // Save the new aggregate, which commits its initial 'AccountCreated' event.
      await this.accountRepository.save(account);

      this.logger.log(`Default account ${accountId} created for user ${userId}.`);
      return accountId;
    } catch (error) {
      this.logger.error(`Error creating default account for user ${userId}: ${error.message}`, error.stack);
      throw error; // Re-throw to be handled by the controller/caller.
    }
  }

  /**
   * Links external financial accounts from a newly connected Plaid item.
   * This is a complex command that results in the creation of multiple new `AccountAggregate` instances.
   * @param {PlaidItemCreatedEventPayload} payload - The data from the 'plaid.item.created' event.
   */
  async linkExternalInstitution(payload: PlaidItemCreatedEventPayload): Promise<void> {
    const { userId, accounts } = payload;
    this.logger.log(`Executing LinkExternalInstitution command for user: ${userId} with ${accounts.length} accounts.`);

    for (const plaidAccount of accounts) {
      try {
        const balance = Balance.create(
          plaidAccount.balances.current,
          plaidAccount.balances.available,
          plaidAccount.balances.iso_currency_code,
        );

        const account = AccountAggregate.create(
          plaidAccount.account_id,
          userId,
          plaidAccount.name,
          plaidAccount.mask,
          plaidAccount.type,
          plaidAccount.subtype,
          payload.institutionName,
          balance,
        );

        await this.accountRepository.save(account);
        this.logger.log(`Created AccountAggregate for external account: ${plaidAccount.account_id}`);
      } catch (error) {
        this.logger.error(`Failed to create aggregate for account ${plaidAccount.account_id}: ${error.message}`, error.stack);
        // Continue processing other accounts
      }
    }
  }

  /**
   * Processes synced transactions, applying debits or credits to the relevant account aggregates.
   * @param {TransactionsSyncedEventPayload} payload - The data from the 'transactions.synced' event.
   */
  async processSyncedTransactions(payload: TransactionsSyncedEventPayload): Promise<void> {
    this.logger.log(`Processing ${payload.transactions.length} synced transactions for item ${payload.itemId}.`);
    for (const transaction of payload.transactions) {
      if (transaction.amount > 0) {
        // Plaid represents debits as positive amounts.
        await this.debitAccount(transaction.account_id, transaction.amount, transaction.transaction_id);
      } else {
        // Plaid represents credits as negative amounts.
        await this.creditAccount(transaction.account_id, Math.abs(transaction.amount), transaction.transaction_id);
      }
    }
  }

  /**
   * Applies a debit to a specific account.
   * @param {string} accountId - The ID of the account to debit.
   * @param {number} amount - The amount to debit.
   * @param {string} transactionId - The ID of the transaction causing the debit, for idempotency and tracing.
   */
  async debitAccount(accountId: string, amount: number, transactionId: string): Promise<void> {
    this.logger.log(`Executing DebitAccount command for account ${accountId}, amount: ${amount}`);
    const account = await this.accountRepository.findById(accountId);
    if (account.getVersion() === 0) throw new Error(`Account with ID ${accountId} not found.`);

    account.debit(amount, transactionId);
    await this.accountRepository.save(account);
    this.logger.log(`Account ${accountId} debited successfully.`);
  }

  /**
   * Applies a credit to a specific account.
   * @param {string} accountId - The ID of the account to credit.
   * @param {number} amount - The amount to credit.
   * @param {string} transactionId - The ID of the transaction causing the credit.
   */
  async creditAccount(accountId: string, amount: number, transactionId: string): Promise<void> {
    this.logger.log(`Executing CreditAccount command for account ${accountId}, amount: ${amount}`);
    const account = await this.accountRepository.findById(accountId);
    if (account.getVersion() === 0) throw new Error(`Account with ID ${accountId} not found.`);

    account.credit(amount, transactionId);
    await this.accountRepository.save(account);
    this.logger.log(`Account ${accountId} credited successfully.`);
  }

  /**
   * Applies a refund to a specific account (a compensating action).
   * @param {string} accountId - The ID of the account to refund.
   * @param {number} amount - The amount to refund.
   * @param {string} originalTransactionId - The ID of the original transaction being refunded.
   */
  async refundAccount(accountId: string, amount: number, originalTransactionId: string): Promise<void> {
    this.logger.log(`Executing RefundAccount command for account ${accountId}, amount: ${amount}`);
    const account = await this.accountRepository.findById(accountId);
    if (account.getVersion() === 0) throw new Error(`Account with ID ${accountId} not found.`);

    account.refund(amount, originalTransactionId);
    await this.accountRepository.save(account);
    this.logger.log(`Account ${accountId} refunded successfully.`);
  }
}
