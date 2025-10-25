import { User } from '../../../domain/user.entity';

/**
 * @file This file defines the "incoming" or "driver" ports for the user-service application layer,
 * as per the Hexagonal Architecture pattern. These interfaces represent the application's
 * core use cases and serve as the contract between the application's core logic and any
 * external adapters (e.g., GraphQL resolvers, REST controllers, Kafka consumers).
 * @author Elite AI Implementation Team
 * @version 1.0.0
 * @see Mandate Hexagonal Architecture (Ports and Adapters) in All Backend Services
 * @see Mandate Comprehensive JSDoc/TSDoc and Introduce Architectural Decision Records (ADRs)
 */

// =================================================================================
// COMMAND OBJECTS
// These objects encapsulate the data required to execute a state-changing use case.
// =================================================================================

/**
 * @interface CreateUserCommand
 * @description Represents the data required to create a new user profile.
 * This is typically triggered by an event from an authentication provider.
 */
export interface CreateUserCommand {
  /**
   * @property {string} authId - The unique identifier from the external authentication provider (e.g., Keycloak 'sub' claim).
   */
  readonly authId: string;
  /**
   * @property {string} email - The user's email address. Must be unique across the system.
   */
  readonly email: string;
  /**
   * @property {string} name - The user's full name.
   */
  readonly name: string;
  /**
   * @property {string | null} [avatarUrl] - Optional URL for the user's profile picture.
   */
  readonly avatarUrl?: string | null;
}

/**
 * @interface UpdateUserCommand
 * @description Represents the data required to update an existing user's profile.
 * Fields that are undefined will not be updated.
 */
export interface UpdateUserCommand {
  /**
   * @property {string} id - The unique ID of the user to update.
   */
  readonly id: string;
  /**
   * @property {string} [name] - The user's new full name.
   */
  readonly name?: string;
  /**
   * @property {string} [avatarUrl] - The new URL for the user's avatar image.
   */
  readonly avatarUrl?: string;
  /**
   * @property {string} [title] - The user's new title or role (e.g., "Founder").
   */
  readonly title?: string;
}

// =================================================================================
// USE CASE INTERFACES (INCOMING PORTS)
// =================================================================================

/**
 * @interface ICreateUserUseCase
 * @description Port for the use case of creating a new user profile.
 * The implementation of this port is responsible for handling the business rules
 * associated with user creation, such as checking for duplicates and persisting the new user.
 */
export interface ICreateUserUseCase {
  /**
   * @method createUser
   * @description Handles the creation of a new user profile from a command object.
   * @param {CreateUserCommand} command - The command object containing the new user's data.
   * @returns {Promise<User>} A promise that resolves to the newly created User domain entity.
   * @throws {ConflictException} If a user with the same email or authId already exists.
   */
  createUser(command: CreateUserCommand): Promise<User>;
}

/**
 * @interface IUpdateUserUseCase
 * @description Port for the use case of updating an existing user's profile information.
 */
export interface IUpdateUserUseCase {
  /**
   * @method updateUser
   * @description Handles the update of a user's profile.
   * @param {UpdateUserCommand} command - The command object containing the user's ID and the fields to update.
   * @returns {Promise<User>} A promise that resolves to the updated User domain entity.
   * @throws {NotFoundException} If the user with the specified ID does not exist.
   */
  updateUser(command: UpdateUserCommand): Promise<User>;
}

/**
 * @interface IDeleteUserUseCase
 * @description Port for the use case of deleting a user profile.
 */
export interface IDeleteUserUseCase {
  /**
   * @method deleteUser
   * @description Handles the deletion (soft or hard) of a user profile.
   * @param {string} id - The unique ID of the user to delete.
   * @returns {Promise<void>} A promise that resolves when the deletion is complete.
   * @throws {NotFoundException} If the user with the specified ID does not exist.
   */
  deleteUser(id: string): Promise<void>;
}

/**
 * @interface IGetUserUseCase
 * @description Port for the use case of retrieving user information. This represents the query-side
 * of the application's responsibilities.
 */
export interface IGetUserUseCase {
  /**
   * @method findOneById
   * @description Finds a single user by their unique internal identifier.
   * @param {string} id - The unique ID of the user to retrieve.
   * @returns {Promise<User>} A promise that resolves to the User domain entity.
   * @throws {NotFoundException} If the user with the specified ID does not exist.
   */
  findOneById(id: string): Promise<User>;

  /**
   * @method findAll
   * @description Retrieves a list of all users.
   * @returns {Promise<User[]>} A promise that resolves to an array of User domain entities.
   */
  findAll(): Promise<User[]>;
}
