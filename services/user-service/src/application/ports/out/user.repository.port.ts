/**
 * @file user.repository.port.ts
 * @description Defines the outbound port for user data persistence.
 *
 * This file specifies the IUserRepository interface, which acts as a contract
 * for any storage adapter (e.g., TypeORM, Prisma, in-memory) that needs to
 * interact with the application's core logic for user data. This adheres to
 * the Hexagonal Architecture principle by decoupling the application core from
 * specific database technologies.
 */

// Assuming the core domain entity is defined here.
// In a Hexagonal Architecture, ports operate on domain entities, not DTOs or database models.
import { User } from '../../../domain/entities/user.entity';

/**
 * @constant USER_REPOSITORY_PORT
 * @description Injection token for the user repository port.
 * This token is used to inject the concrete repository implementation (the adapter)
 * into the application services that need it.
 */
export const USER_REPOSITORY_PORT = 'UserRepositoryPort';

/**
 * @interface IUserRepository
 * @description An interface (outbound port) that defines the contract for user data persistence.
 * Adapters in the infrastructure layer will implement this interface to provide
 * the actual data storage logic.
 */
export interface IUserRepository {
  /**
   * @description Finds a user by their unique identifier.
   * @param {string} id - The unique ID of the user.
   * @returns {Promise<User | null>} A promise that resolves to the User entity or null if not found.
   */
  findById(id: string): Promise<User | null>;

  /**
   * @description Finds a user by their email address.
   * @param {string} email - The email address of the user.
   * @returns {Promise<User | null>} A promise that resolves to the User entity or null if not found.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * @description Finds a user by their external authentication provider ID.
   * @param {string} authId - The authentication provider's unique ID for the user.
   * @returns {Promise<User | null>} A promise that resolves to the User entity or null if not found.
   */
  findByAuthId(authId: string): Promise<User | null>;

  /**
   * @description Persists a new user or updates an existing one.
   * @param {User} user - The User domain entity to save.
   * @returns {Promise<User>} A promise that resolves to the saved User entity.
   */
  save(user: User): Promise<User>;

  /**
   * @description Deletes a user by their unique identifier.
   * @param {string} id - The unique ID of the user to delete.
   * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful.
   */
  delete(id: string): Promise<boolean>;

  /**
   * @description Retrieves all users.
   * @note In a production application, this method should be paginated.
   * @returns {Promise<User[]>} A promise that resolves to an array of all User entities.
   */
  findAll(): Promise<User[]>;
}
