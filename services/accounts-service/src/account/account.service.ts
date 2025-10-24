import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { PlaidItem } from './entities/plaid-item.entity';
import { PlaidService } from './plaid.service';
import { Account as PlaidAccountDto } from 'plaid';

/**
 * @description Defines the structure of the payload for a 'user.created' event.
 */
interface UserCreatedPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * @description Defines the structure of the payload for a 'plaid.item.created' event.
 */
interface PlaidItemCreatedPayload {
  userId: string;
  itemId: string;
  institutionName: string;
}

/**
 * Service responsible for managing user financial accounts.
 *
 * This service handles the business logic for creating and retrieving account information.
 * It interacts with the database to persist account data and communicates with the
 * dedicated Plaid Integration Service (via an injected PlaidService client) to fetch
 * account details from external institutions.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(PlaidItem)
    private readonly plaidItemRepository: Repository<PlaidItem>,
    private readonly plaidService: PlaidService,
  ) {}

  /**
   * Creates a default internal "Demo Bank" account for a new user.
   * This is triggered by a `user.created` event from the message bus.
   * @param payload - Data for the new user.
   * @returns The created account entity.
   */
  async createDefaultAccountForUser(payload: UserCreatedPayload): Promise<Account> {
    this.logger.log(`Creating default "Demo Bank" account for user ${payload.userId}`);
    const existingAccount = await this.accountRepository.findOne({
      where: { userId: payload.userId, institutionName: 'Demo Bank' },
    });

    if (existingAccount) {
      this.logger.warn(`Default account already exists for user ${payload.userId}.`);
      return existingAccount;
    }

    const defaultAccount = this.accountRepository.create({
      // Using a predictable ID for the internal account for easier reference.
      id: `demobank-acct-${payload.userId}`,
      userId: payload.userId,
      name: 'Demo Bank Checking',
      mask: '0000',
      type: 'depository',
      subtype: 'checking',
      institutionName: 'Demo Bank',
      currentBalance: 1000, // Starting balance for new users
      availableBalance: 1000,
      isoCurrencyCode: 'USD',
    });

    return this.accountRepository.save(defaultAccount);
  }

  /**
   * Links an external institution to a user after a successful Plaid Link flow.
   * This is triggered by a `plaid.item.created` event. It fetches account details
   * from the Plaid Integration Service and persists them.
   * @param payload - Event data containing user, item, and institution info.
   */
  async linkExternalInstitution(payload: PlaidItemCreatedPayload): Promise<void> {
    const { userId, itemId, institutionName } = payload;
    this.logger.log(`Linking institution for user ${userId}, itemId ${itemId}`);

    const existingItem = await this.plaidItemRepository.findOne({ where: { itemId } });
    if (existingItem) {
      this.logger.warn(`Plaid item ${itemId} has already been processed.`);
      return;
    }

    // Persist the Plaid item to our database. We DO NOT store access tokens here.
    const newPlaidItem = this.plaidItemRepository.create({
      itemId,
      userId,
      institutionName,
    });
    await this.plaidItemRepository.save(newPlaidItem);

    try {
      this.logger.log(`Fetching accounts from Plaid Integration Service for user ${userId}`);
      // The injected PlaidService acts as a client to the dedicated Plaid microservice.
      const plaidAccounts: PlaidAccountDto[] = await this.plaidService.getAccounts(userId);
      this.logger.log(`Received ${plaidAccounts.length} accounts from Plaid Integration Service.`);

      const accountEntities = plaidAccounts.map((plaidAccount) =>
        this.accountRepository.create({
          id: plaidAccount.account_id,
          userId: userId,
          plaidItem: newPlaidItem,
          name: plaidAccount.name,
          mask: plaidAccount.mask,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype,
          institutionName: institutionName,
          currentBalance: plaidAccount.balances.current,
          availableBalance: plaidAccount.balances.available,
          isoCurrencyCode: plaidAccount.balances.iso_currency_code,
        }),
      );

      await this.accountRepository.save(accountEntities);
      this.logger.log(`Successfully saved ${accountEntities.length} new accounts for user ${userId}.`);
    } catch (error) {
      this.logger.error(
        `Failed to fetch or save accounts from Plaid Integration Service for user ${userId}.`,
        error.stack,
      );
      // In a real system, implement retry logic or a dead-letter queue for this failed event.
      throw new Error(`Could not sync accounts for item ${itemId}.`);
    }
  }

  /**
   * Finds all accounts for a user from this service's local database.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to an array of account objects formatted for GraphQL.
   */
  async findAccountsByUserId(userId: string): Promise<any[]> {
    this.logger.log(`Finding accounts in local DB for user ${userId}`);
    const accounts = await this.accountRepository.find({
      where: { userId },
      order: { institutionName: 'ASC', name: 'ASC' },
    });
    return accounts.map(this.mapEntityToGqlObject);
  }

  /**
   * Finds a single account by its ID from the local database.
   * @param id - The unique ID of the account.
   * @returns A promise that resolves to a single account object formatted for GraphQL, or null.
   */
  async findAccountById(id: string): Promise<any | null> {
    this.logger.log(`Finding account by ID ${id} in local DB`);
    const account = await this.accountRepository.findOne({ where: { id } });
    return this.mapEntityToGqlObject(account);
  }

  /**
   * Maps a flat database entity to the nested GraphQL object structure.
   * This decouples the database schema from the GraphQL API schema.
   * @param accountEntity - The TypeORM Account entity from the database.
   * @returns An object matching the structure of the GraphQL Account type.
   */
  private mapEntityToGqlObject(accountEntity: Account | null): any {
    if (!accountEntity) {
      return null;
    }

    // This destructuring assumes the entity has flat columns for balance.
    const {
      currentBalance,
      availableBalance,
      isoCurrencyCode,
      plaidItem, // Exclude the relation object from the final output
      ...rest
    } = accountEntity;

    return {
      ...rest,
      // Reconstruct the nested 'balance' object expected by the GraphQL schema.
      balance: {
        current: currentBalance,
        available: availableBalance,
        iso_currency_code: isoCurrencyCode,
      },
    };
  }
}
