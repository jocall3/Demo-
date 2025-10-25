import { AccountAggregate } from '../../../domain/aggregates/account.aggregate';
import { AccountReadModel } from '../../queries/read-models/account.read-model';

/**
 * @interface AccountRepositoryPort
 * @description An outbound port defining the contract for account persistence. This interface
 * separates the application's core logic from the specific database implementation (the adapter).
 * It adheres to CQRS by providing distinct methods for interacting with the write model (Aggregates)
 * and the read model (Projections).
 * @see {@link AccountAggregate} - The write model.
 * @see {@link AccountReadModel} - The read model.
 * @version 1.0.0
 * @author Elite AI Implementation Team
 */
export interface AccountRepositoryPort {
  // --- COMMAND (WRITE) SIDE METHODS --- //

  /**
   * @method findById
   * @description Retrieves an `AccountAggregate` by its unique identifier. In an Event Sourcing
   * context, this involves loading all domain events for the aggregate from the event store
   * and rehydrating them to reconstruct the aggregate's current state.
   * @param {string} id The unique identifier of the account aggregate.
   * @returns {Promise<AccountAggregate | null>} A promise that resolves to the rehydrated
   * account aggregate, or `null` if no events are found for the given ID.
   */
  findById(id: string): Promise<AccountAggregate | null>;

  /**
   * @method save
   * @description Persists the state changes of an `AccountAggregate`. In an Event Sourcing
   * context, this involves appending the aggregate's uncommitted domain events to the
   * event store and publishing them to the message bus.
   * @param {AccountAggregate} account The account aggregate instance containing uncommitted events.
   * @returns {Promise<void>} A promise that resolves when the events have been successfully persisted.
   */
  save(account: AccountAggregate): Promise<void>;

  // --- QUERY (READ) SIDE METHODS --- //

  /**
   * @method findProjectionById
   * @description Retrieves a denormalized `AccountReadModel` (projection) by its unique
   * identifier directly from the read database (e.g., MongoDB, PostgreSQL).
   * @param {string} id The unique identifier of the account.
   * @returns {Promise<AccountReadModel | null>} A promise that resolves to the account
   * read model, or `null` if not found.
   */
  findProjectionById(id: string): Promise<AccountReadModel | null>;

  /**
   * @method findProjectionsByUserId
   * @description Finds all denormalized `AccountReadModel` projections associated with a specific user ID.
   * @param {string} userId The ID of the user whose accounts are to be retrieved.
   * @returns {Promise<AccountReadModel[]>} A promise that resolves to an array of account read models.
   */
  findProjectionsByUserId(userId: string): Promise<AccountReadModel[]>;
}

/**
 * @const ACCOUNT_REPOSITORY_PORT
 * @description Injection token for the `AccountRepositoryPort`.
 * This token is used in NestJS's dependency injection system to provide the concrete
 * infrastructure adapter that implements the `AccountRepositoryPort` interface.
 * @example constructor(@Inject(ACCOUNT_REPOSITORY_PORT) private readonly accountRepository: AccountRepositoryPort)
 */
export const ACCOUNT_REPOSITORY_PORT = Symbol('ACCOUNT_REPOSITORY_PORT');
