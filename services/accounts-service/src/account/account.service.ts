import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Account as PlaidAccountDto } from 'plaid';

// --- DDD Domain Layer: Aggregates, Value Objects, Domain Events --- 

/**
 * @description Represents a value object for a financial account balance.
 * Immutability is key for Value Objects.
 */
class BalanceValueObject {
  private constructor(
    public readonly current: number,
    public readonly available: number | null,
    public readonly isoCurrencyCode: string | null,
  ) {
    if (current < 0) throw new Error('Current balance cannot be negative.');
  }

  /**
   * Creates a new BalanceValueObject instance.
   * @param current The total amount of funds in the account.
   * @param available The amount of funds available for use.
   * @param isoCurrencyCode The ISO-4217 currency code. 
   */
  static create(current: number, available: number | null, isoCurrencyCode: string | null): BalanceValueObject {
    return new BalanceValueObject(current, available, isoCurrencyCode);
  }

  /**
   * Checks if two BalanceValueObjects are equal by comparing their properties.
   * @param other The other BalanceValueObject to compare.
   */
  equals(other: BalanceValueObject): boolean {
    if (!(other instanceof BalanceValueObject)) return false;
    return (
      this.current === other.current &&
      this.available === other.available &&
      this.isoCurrencyCode === other.isoCurrencyCode
    );
  }
}

/**
 * @description Base class for all Domain Events.
 * Domain Events are immutable facts about something that happened in the domain.
 */
abstract class DomainEvent {
  public readonly timestamp: Date;
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly eventType: string;
  public readonly version: number;

  protected constructor(aggregateId: string, aggregateType: string, eventType: string, version: number = 1) {
    this.eventId = `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.timestamp = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventType = eventType;
    this.version = version;
  }
}

/**
 * @description Domain Event: Indicates that a new financial account has been created.
 */
class AccountCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string, // Account ID
    public readonly userId: string,
    public readonly name: string,
    public readonly mask: string | null,
    public readonly type: string,
    public readonly subtype: string | null,
    public readonly institutionName: string,
    public readonly balance: BalanceValueObject,
    version: number = 1,
  ) {
    super(aggregateId, 'AccountAggregate', 'AccountCreated', version);
  }
}

/**
 * @description Domain Event: Indicates that a Plaid Item (connection to an external institution) has been linked.
 */
class PlaidItemLinkedEvent extends DomainEvent {
  constructor(
    aggregateId: string, // Plaid Item ID
    public readonly userId: string,
    public readonly institutionName: string,
    version: number = 1,
  ) {
    super(aggregateId, 'PlaidItemAggregate', 'PlaidItemLinked', version);
  }
}

/**
 * @description Domain Event: Indicates that new external accounts from a Plaid Item have been added.
 */
class ExternalAccountsAddedEvent extends DomainEvent {
  constructor(
    aggregateId: string, // Plaid Item ID
    public readonly userId: string,
    public readonly newAccounts: {
        id: string;
        name: string;
        mask: string | null;
        type: string;
        subtype: string | null;
        balance: BalanceValueObject;
        institutionName: string;
    }[],
    version: number, // Increment version for PlaidItemAggregate
  ) {
    super(aggregateId, 'PlaidItemAggregate', 'ExternalAccountsAdded', version);
  }
}


/**
 * @description Represents a DDD Aggregate Root for a financial account.
 * Aggregates are responsible for maintaining their own consistency rules and emitting events.
 */
class AccountAggregate {
  private id: string;
  private userId: string;
  private name: string;
  private mask: string | null;
  private type: string;
  private subtype: string | null;
  private institutionName: string;
  private balance: BalanceValueObject;
  private version: number = 0;
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(id: string) {
    this.id = id;
  }

  static create(
    id: string,
    userId: string,
    name: string,
    mask: string | null,
    type: string,
    subtype: string | null,
    institutionName: string,
    balance: BalanceValueObject,
  ): AccountAggregate {
    const aggregate = new AccountAggregate(id);
    aggregate.applyEvent(
      new AccountCreatedEvent(id, userId, name, mask, type, subtype, institutionName, balance, 1),
    );
    return aggregate;
  }

  /**
   * Hydrates an aggregate from historical events (Event Sourcing).
   * @param id The ID of the aggregate.
   * @param events All historical domain events for this aggregate.
   */
  static fromEvents(id: string, events: DomainEvent[]): AccountAggregate {
      const aggregate = new AccountAggregate(id);
      events.forEach(event => aggregate.mutate(event));
      return aggregate;
  }

  private applyEvent(event: DomainEvent): void {
      this.mutate(event);
      this.uncommittedEvents.push(event);
  }

  /**
   * Mutates the aggregate's state based on a given domain event.
   * This method applies the changes described by the event to the aggregate's state.
   * @param event The domain event to apply.
   */
  private mutate(event: DomainEvent): void {
      this.version = event.version; // Update aggregate version from event
      switch (event.eventType) {
          case 'AccountCreated':
              const accountCreated = event as AccountCreatedEvent;
              this.userId = accountCreated.userId;
              this.name = accountCreated.name;
              this.mask = accountCreated.mask;
              this.type = accountCreated.type;
              this.subtype = accountCreated.subtype;
              this.institutionName = accountCreated.institutionName;
              this.balance = accountCreated.balance;
              break;
          // Add other event handlers for state changes here (e.g., BalanceUpdated)
      }
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  getId(): string {
    return this.id;
  }
  getUserId(): string {
    return this.userId;
  }
  getName(): string {
    return this.name;
  }
  getMask(): string | null {
    return this.mask;
  }
  getType(): string {
    return this.type;
  }
  getSubtype(): string | null {
    return this.subtype;
  }
  getInstitutionName(): string {
    return this.institutionName;
  }
  getBalance(): BalanceValueObject {
    return this.balance;
  }
  getVersion(): number {
    return this.version;
  }
}

/**
 * @description Represents a DDD Aggregate Root for a Plaid Item (connection to an external financial institution).
 */
class PlaidItemAggregate {
  private id: string; // Plaid Item ID
  private userId: string;
  private institutionName: string;
  private linkedAccounts: {
    id: string; // Account ID
    name: string;
    mask: string | null;
    type: string;
    subtype: string | null;
    balance: BalanceValueObject;
    institutionName: string;
  }[] = [];
  private version: number = 0;
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(id: string) {
    this.id = id;
  }

  static create(id: string, userId: string, institutionName: string): PlaidItemAggregate {
    const aggregate = new PlaidItemAggregate(id);
    aggregate.applyEvent(new PlaidItemLinkedEvent(id, userId, institutionName, 1));
    return aggregate;
  }
  
  /**
   * Hydrates an aggregate from historical events (Event Sourcing).
   * @param id The ID of the aggregate.
   * @param events All historical domain events for this aggregate.
   */
  static fromEvents(id: string, events: DomainEvent[]): PlaidItemAggregate {
      const aggregate = new PlaidItemAggregate(id);
      events.forEach(event => aggregate.mutate(event));
      return aggregate;
  }

  private applyEvent(event: DomainEvent): void {
      this.mutate(event);
      this.uncommittedEvents.push(event);
  }

  /**
   * Mutates the aggregate's state based on a given domain event.
   * @param event The domain event to apply.
   */
  private mutate(event: DomainEvent): void {
      this.version = event.version; // Update aggregate version from event
      switch (event.eventType) {
          case 'PlaidItemLinked':
              const plaidItemLinked = event as PlaidItemLinkedEvent;
              this.userId = plaidItemLinked.userId;
              this.institutionName = plaidItemLinked.institutionName;
              break;
          case 'ExternalAccountsAdded':
              const externalAccountsAdded = event as ExternalAccountsAddedEvent;
              this.linkedAccounts = externalAccountsAdded.newAccounts;
              break;
      }
  }

  /**
   * Links new accounts to this Plaid Item. This is a command on the aggregate that emits a new event.
   * @param accounts Plaid account DTOs.
   * @param institutionName The name of the institution.
   */
  addExternalAccounts(accounts: PlaidAccountDto[], institutionName: string): void {
    const newLinkedAccounts = accounts.map(plaidAccount => ({
        id: plaidAccount.account_id,
        name: plaidAccount.name,
        mask: plaidAccount.mask,
        type: plaidAccount.type,
        subtype: plaidAccount.subtype,
        balance: BalanceValueObject.create(
            plaidAccount.balances.current,
            plaidAccount.balances.available,
            plaidAccount.balances.iso_currency_code
        ),
        institutionName: institutionName,
    }));
    this.applyEvent(new ExternalAccountsAddedEvent(this.id, this.userId, newLinkedAccounts, this.version + 1));
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  getId(): string {
    return this.id;
  }
  getUserId(): string {
    return this.userId;
  }
  getInstitutionName(): string {
    return this.institutionName;
  }
  getLinkedAccounts(): any[] {
    return this.linkedAccounts;
  }
  getVersion(): number {
    return this.version;
  }
}

// --- Application Layer: Commands --- 

/**
 * @description Command to create a default account for a new user.
 */
class CreateDefaultAccountCommand {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}

/**
 * @description Command to link an external financial institution via Plaid.
 */
class LinkExternalInstitutionCommand {
  constructor(
    public readonly userId: string,
    public readonly itemId: string,
    public readonly institutionName: string,
    public readonly plaidAccounts: PlaidAccountDto[],
  ) {}
}


// --- Infrastructure Layer: Ports (Interfaces for Repositories and Event Store) --- 

/**
 * @description Port for the Event Store, responsible for loading and appending domain events.
 */
interface IEventStore {
  /**
   * Loads all historical events for a given aggregate.
   * @param aggregateId The ID of the aggregate.
   * @param aggregateType The type of the aggregate.
   * @returns A promise that resolves to an array of Domain Events.
   */
  loadEvents(aggregateId: string, aggregateType: string): Promise<DomainEvent[]>;

  /**
   * Appends new domain events to the event stream for an aggregate.
   * @param events An array of new Domain Events to append.
   * @param expectedVersion The expected current version of the aggregate for optimistic concurrency control.
   */
  appendEvents(events: DomainEvent[], expectedVersion: number): Promise<void>;
}

/**
 * @description Port for the Plaid Service client, enabling communication with the external Plaid Integration Service.
 */
interface IPlaidServiceClient {
  getAccounts(userId: string): Promise<PlaidAccountDto[]>;
  // Add other Plaid-related methods if needed by commands (e.g., getTransactions, webhook processing).
}


// --- Adapters (Mock/Dummy Implementations for Ports) ---
// In a real application, these would be in separate files (e.g., adapters/event-store/in-memory.event-store.ts)
// and implement the `IEventStore` or `IPlaidServiceClient` interfaces.

/**
 * @description Mock in-memory implementation of IEventStore for demonstration purposes.
 * This is not suitable for production.
 */
class InMemoryEventStore implements IEventStore {
  private readonly logger = new Logger(InMemoryEventStore.name);
  private events: Map<string, DomainEvent[]> = new Map(); // Key: aggregateId, Value: events array

  async loadEvents(aggregateId: string, aggregateType: string): Promise<DomainEvent[]> {
    this.logger.debug(`Loading events for ${aggregateType} ${aggregateId}`);
    return this.events.get(aggregateId) || [];
  }

  async appendEvents(newEvents: DomainEvent[], expectedVersion: number): Promise<void> {
    if (newEvents.length === 0) return;

    const aggregateId = newEvents[0].aggregateId;
    const currentEvents = this.events.get(aggregateId) || [];
    const currentVersion = currentEvents.length > 0 ? currentEvents[currentEvents.length - 1].version : 0;

    // Optimistic concurrency control
    // In a real system, this check would happen atomically within the persistence layer.
    if (currentVersion !== expectedVersion) {
      throw new Error(`Concurrency conflict: Expected version ${expectedVersion}, but found ${currentVersion}.`);
    }

    // Assign versions to new events sequentially from the expected current version + 1
    let nextVersion = expectedVersion + 1;
    newEvents.forEach(event => {
      // This ensures each event has a unique, sequential version within the aggregate stream.
      (event as any).version = nextVersion++; 
      currentEvents.push(event);
    });

    this.events.set(aggregateId, currentEvents);
    this.logger.log(`Appended ${newEvents.length} events for aggregate ${aggregateId}. New latest version: ${nextVersion - 1}`);

    // In a real Event Sourcing system, these events would also be published to a message bus (Kafka)
    // for read model projectors to consume and update their state. For this mock, we directly
    // notify the in-memory read model.
  }
}

/**
 * @description Mock in-memory implementation for IPlaidServiceClient.
 * In a real scenario, this would be an actual HTTP or gRPC client to the PlaidIntegrationService.
 */
class MockPlaidServiceClient implements IPlaidServiceClient {
    private readonly logger = new Logger(MockPlaidServiceClient.name);

    async getAccounts(userId: string): Promise<PlaidAccountDto[]> {
        this.logger.log(`Mock: Fetching accounts from Plaid Integration Service for user ${userId}`);
        // Simulate a call and return dummy data
        return [
            {
                account_id: `plaid-account-checking-${userId}`,
                balances: {
                    available: 5000 + Math.random() * 1000,
                    current: 5200 + Math.random() * 1000,
                    iso_currency_code: 'USD',
                    limit: null,
                    unofficial_currency_code: null,
                },
                mask: '1234',
                name: 'Plaid Checking',
                official_name: 'Plaid Bank Checking',
                subtype: 'checking',
                type: 'depository',
                verification_status: null,
            },
            {
                account_id: `plaid-account-savings-${userId}`,
                balances: {
                    available: 10000 + Math.random() * 2000,
                    current: 10500 + Math.random() * 2000,
                    iso_currency_code: 'USD',
                    limit: null,
                    unofficial_currency_code: null,
                },
                mask: '5678',
                name: 'Plaid Savings',
                official_name: 'Plaid Bank Savings',
                subtype: 'savings',
                type: 'depository',
                verification_status: null,
            },
        ];
    }
}


// --- Query Side / Read Model (Simulated) ---
// This represents a denormalized projection of the aggregate events, optimized for queries.
// In a full CQRS setup, this would be managed by a separate projection service
// that subscribes to Domain Events.

interface AccountReadModel {
  id: string;
  userId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  institutionName: string;
  balance: {
    current: number;
    available: number | null;
    iso_currency_code: string | null;
  };
}

/**
 * @description Simulated in-memory read model for accounts.
 * In a real system, this would be a dedicated database (e.g., PostgreSQL, Elasticsearch)
 * populated by event processors (projectors).
 */
class InMemoryAccountReadModel {
  private readonly logger = new Logger(InMemoryAccountReadModel.name);
  private accounts: Map<string, AccountReadModel> = new Map(); // Key: accountId

  // For simplicity, directly updating the read model here when events are "appended".
  // In reality, this would be an async event handler.
  updateFromEvent(event: DomainEvent): void {
      if (event.aggregateType === 'AccountAggregate' && event.eventType === 'AccountCreated') {
          const accountCreated = event as AccountCreatedEvent;
          const newAccount: AccountReadModel = {
              id: accountCreated.aggregateId,
              userId: accountCreated.userId,
              name: accountCreated.name,
              mask: accountCreated.mask,
              type: accountCreated.type,
              subtype: accountCreated.subtype,
              institutionName: accountCreated.institutionName,
              balance: {
                  current: accountCreated.balance.current,
                  available: accountCreated.balance.available,
                  iso_currency_code: accountCreated.balance.isoCurrencyCode,
              },
          };
          this.accounts.set(newAccount.id, newAccount);
          this.logger.debug(`Read model updated: Added account ${newAccount.id}`);
      } else if (event.aggregateType === 'PlaidItemAggregate' && event.eventType === 'ExternalAccountsAdded') {
          const externalAccountsAdded = event as ExternalAccountsAddedEvent;
          externalAccountsAdded.newAccounts.forEach(accountData => {
              const newAccount: AccountReadModel = {
                  id: accountData.id,
                  userId: externalAccountsAdded.userId, // Use userId from the PlaidItemAggregate event
                  name: accountData.name,
                  mask: accountData.mask,
                  type: accountData.type,
                  subtype: accountData.subtype,
                  institutionName: accountData.institutionName,
                  balance: {
                      current: accountData.balance.current,
                      available: accountData.balance.available,
                      iso_currency_code: accountData.balance.isoCurrencyCode,
                  },
              };
              this.accounts.set(newAccount.id, newAccount);
              this.logger.debug(`Read model updated: Added external account ${newAccount.id}`);
          });
      }
      // Handle other events to update the read model (e.g., balance updates)
  }

  async findAccountsByUserId(userId: string): Promise<AccountReadModel[]> {
    return Array.from(this.accounts.values()).filter(acc => acc.userId === userId);
  }

  async findAccountById(id: string): Promise<AccountReadModel | null> {
    return this.accounts.get(id) || null;
  }
}


/**
 * Service responsible for managing user financial accounts using CQRS and Event Sourcing principles.
 * This is the "Command" side of the Accounts domain.
 *
 * It orchestrates state changes by:
 * 1. Loading the Aggregate (e.g., AccountAggregate, PlaidItemAggregate) from the Event Store.
 * 2. Executing commands that produce new Domain Events on the Aggregate.
 * 3. Appending these new Domain Events back to the Event Store.
 *
 * Query operations are delegated to a separate Read Model, which is updated asynchronously.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  // Inject ports (interfaces) rather than concrete implementations for Hexagonal Architecture.
  // The actual implementations (Adapters) will be provided by NestJS modules.
  constructor(
    private readonly eventStore: IEventStore,
    private readonly plaidServiceClient: IPlaidServiceClient,
    // We're injecting a direct instance of the in-memory read model here for simplicity in this single-file solution.
    // In a full CQRS setup, the read model would typically be queried by a separate Query Service,
    // and updated by event handlers/projectors that are external to this command-side service.
    private readonly accountReadModel: InMemoryAccountReadModel,
  ) {
    // For demonstration purposes, we're hooking the event store appends to update the in-memory read model.
    // This simulates the work of an asynchronous projector.
    const originalAppendEvents = this.eventStore.appendEvents.bind(this.eventStore);
    (this.eventStore as InMemoryEventStore).appendEvents = async (events, expectedVersion) => {
        await originalAppendEvents(events, expectedVersion);
        events.forEach(event => this.accountReadModel.updateFromEvent(event));
    };
  }

  /**
   * Handles the `CreateDefaultAccountCommand` to create a default internal "Demo Bank" account for a new user.
   * This is a Command-side operation that generates and persists Domain Events.
   * @param command - The command to create a default account.
   * @returns The ID of the created account.
   */
  async createDefaultAccountForUser(command: CreateDefaultAccountCommand): Promise<string> {
    this.logger.log(`Handling CreateDefaultAccountCommand for user ${command.userId}`);

    const newAccountId = `demobank-acct-${command.userId}`;
    
    // In an Event Sourcing system, checking for existence often means loading events.
    const existingEvents = await this.eventStore.loadEvents(newAccountId, 'AccountAggregate');
    if (existingEvents.length > 0) {
        this.logger.warn(`Default account already exists for user ${command.userId}. Idempotency handled.`);
        return newAccountId;
    }

    const initialBalance = BalanceValueObject.create(1000, 1000, 'USD');
    const accountAggregate = AccountAggregate.create(
      newAccountId,
      command.userId,
      'Demo Bank Checking',
      '0000',
      'depository',
      'checking',
      'Demo Bank',
      initialBalance,
    );

    // The current version of a newly created aggregate is 0. The first event will make it version 1.
    await this.eventStore.appendEvents(accountAggregate.getUncommittedEvents(), 0);
    accountAggregate.markEventsAsCommitted();

    this.logger.log(`Default "Demo Bank" account created for user ${command.userId}. Account ID: ${newAccountId}`);
    return newAccountId;
  }

  /**
   * Handles the `LinkExternalInstitutionCommand` to link an external institution and its accounts.
   * This is a Command-side operation that generates and persists Domain Events.
   * @param command - The command to link an external institution.
   */
  async linkExternalInstitution(command: LinkExternalInstitutionCommand): Promise<void> {
    this.logger.log(`Handling LinkExternalInstitutionCommand for user ${command.userId}, item ${command.itemId}`);

    // Load or create the PlaidItemAggregate
    const existingEvents = await this.eventStore.loadEvents(command.itemId, 'PlaidItemAggregate');
    let plaidItemAggregate: PlaidItemAggregate;

    if (existingEvents.length === 0) {
        plaidItemAggregate = PlaidItemAggregate.create(command.itemId, command.userId, command.institutionName);
    } else {
        plaidItemAggregate = PlaidItemAggregate.fromEvents(command.itemId, existingEvents);
    }

    // Execute command on aggregate, which generates a new event.
    // The current version of the aggregate before applying the new event is passed for concurrency control.
    const currentVersionBeforeCommand = plaidItemAggregate.getVersion();
    plaidItemAggregate.addExternalAccounts(command.plaidAccounts, command.institutionName);

    await this.eventStore.appendEvents(plaidItemAggregate.getUncommittedEvents(), currentVersionBeforeCommand);
    plaidItemAggregate.markEventsAsCommitted();

    this.logger.log(`External institution linked and accounts added for user ${command.userId}. Plaid Item ID: ${command.itemId}`);
  }
  
  // --- Query-side operations (interact with a read model/projection) --- 

  /**
   * Retrieves all accounts for a user by querying the read model.
   * This method represents the "Query" side of the CQRS pattern for retrieving account data.
   * It queries a denormalized projection (read model) that is optimized for querying, 
   * rather than rehydrating aggregates from the event store for every read.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to an array of account objects (from the read model).
   */
  async findAccountsByUserId(userId: string): Promise<AccountReadModel[]> {
    this.logger.debug(`Querying read model for accounts for user ${userId}`);
    return this.accountReadModel.findAccountsByUserId(userId);
  }

  /**
   * Retrieves a single account by its ID by querying the read model.
   * This method is also part of the "Query" side, accessing the read-optimized projection.
   * @param id - The unique ID of the account.
   * @returns A promise that resolves to a single account object (from the read model), or null.
   * @throws {NotFoundException} if the account is not found in the read model.
   */
  async findAccountById(id: string): Promise<AccountReadModel | null> {
    this.logger.debug(`Querying read model for account by ID ${id}`);
    const account = await this.accountReadModel.findAccountById(id);
    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found in read model.`);
    }
    return account;
  }
}
