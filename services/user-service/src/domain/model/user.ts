/**
 * @file This file defines the core User domain model (Aggregate Root) for the user-service,
 * adhering to Domain-Driven Design (DDD) and Hexagonal Architecture principles.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * @interface UserPreferences
 * @description Defines the structure for user-specific preferences, acting as a Value Object.
 * These are settings that a user can customize.
 * @property {string} theme - The user's preferred visual theme (e.g., 'dark', 'light').
 * @property {string} language - The user's preferred language (e.g., 'en-US').
 * @property {boolean} receiveMarketingEmails - Whether the user opts in to marketing communications.
 */
export interface UserPreferences {
  theme: 'dark' | 'light';
  language: string;
  receiveMarketingEmails: boolean;
}

/**
 * @class User
 * @description Represents the User aggregate root in the domain model.
 * It encapsulates the state and business logic related to a user, ensuring
 * that all state changes are valid and consistent.
 */
export class User {
  /**
   * The unique identifier for the user profile (UUID).
   * @private
   */
  private readonly _id: string;

  /**
   * The unique identifier from the external authentication provider (e.g., Keycloak sub).
   * @private
   */
  private _authId: string;

  /**
   * The user's email address.
   * @private
   */
  private _email: string;

  /**
   * The user's full name.
   * @private
   */
  private _name: string;

  /**
   * The user's hashed password. This should never be the plaintext password.
   * @private
   */
  private _passwordHash: string;

  /**
   * User-specific preferences.
   * @private
   */
  private _preferences: UserPreferences;

  /**
   * The timestamp when the user profile was created.
   * @private
   */
  private readonly _createdAt: Date;

  /**
   * The timestamp when the user profile was last updated.
   * @private
   */
  private _updatedAt: Date;

  /**
   * @constructor
   * @private To enforce creation via the static `create` factory method.
   * @param {string} id - The user's UUID.
   * @param {string} authId - The ID from the authentication provider.
   * @param {string} email - The user's email.
   * @param {string} name - The user's name.
   * @param {string} passwordHash - The user's hashed password.
   * @param {UserPreferences} preferences - The user's preferences.
   * @param {Date} createdAt - Creation timestamp.
   * @param {Date} updatedAt - Update timestamp.
   */
  private constructor(
    id: string,
    authId: string,
    email: string,
    name: string,
    passwordHash: string,
    preferences: UserPreferences,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._authId = authId;
    this._email = email;
    this._name = name;
    this._passwordHash = passwordHash;
    this._preferences = preferences;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * @static
   * @method create
   * @description Factory method to create a new User instance. This ensures that
   * every new user is created in a valid initial state.
   * @param {object} props - The properties for the new user.
   * @param {string} props.authId - The unique ID from the authentication provider.
   * @param {string} props.email - The user's email address. Must be a valid format.
   * @param {string} props.name - The user's name. Cannot be empty.
   * @param {string} props.passwordHash - The pre-hashed password.
   * @returns {User} A new User instance.
   * @throws {Error} if validation of initial properties fails.
   */
  public static create(props: {
    authId: string;
    email: string;
    name: string;
    passwordHash: string;
  }): User {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('User name cannot be empty.');
    }
    if (!props.email || !/\S+@\S+\.\S+/.test(props.email)) {
      throw new Error('Invalid email format provided.');
    }

    const now = new Date();
    const defaultPreferences: UserPreferences = {
      theme: 'dark',
      language: 'en-US',
      receiveMarketingEmails: false,
    };

    return new User(
      uuidv4(),
      props.authId,
      props.email,
      props.name,
      props.passwordHash,
      defaultPreferences,
      now,
      now,
    );
  }

  /**
   * @method updateProfile
   * @description Updates the user's name and/or email.
   * @param {object} data - The data to update.
   * @param {string} [data.name] - The new name for the user.
   * @param {string} [data.email] - The new email for the user.
   * @throws {Error} if the provided name or email is invalid.
   */
  public updateProfile(data: { name?: string; email?: string }): void {
    if (data.name && data.name.trim().length === 0) {
      throw new Error('User name cannot be empty.');
    }
    if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
      throw new Error('Invalid email format provided.');
    }

    if (data.name) {
      this._name = data.name;
    }
    if (data.email) {
      this._email = data.email;
    }
    this._updatedAt = new Date();
  }

  /**
   * @method changePassword
   * @description Updates the user's password hash.
   * @param {string} newPasswordHash - The new, securely hashed password.
   */
  public changePassword(newPasswordHash: string): void {
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
  }

  /**
   * @method updatePreferences
   * @description Updates the user's preferences.
   * @param {Partial<UserPreferences>} newPreferences - The preference fields to update.
   */
  public updatePreferences(newPreferences: Partial<UserPreferences>): void {
    this._preferences = { ...this._preferences, ...newPreferences };
    this._updatedAt = new Date();
  }

  // --- GETTERS ---

  /**
   * @returns {string} The user's unique ID.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * @returns {string} The user's external authentication provider ID.
   */
  public get authId(): string {
    return this._authId;
  }

  /**
   * @returns {string} The user's email address.
   */
  public get email(): string {
    return this._email;
  }

  /**
   * @returns {string} The user's full name.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * @returns {string} The user's hashed password.
   */
  public get passwordHash(): string {
    return this._passwordHash;
  }

  /**
   * @returns {UserPreferences} The user's preferences object.
   */
  public get preferences(): UserPreferences {
    return this._preferences;
  }

  /**
   * @returns {Date} The creation timestamp.
   */
  public get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * @returns {Date} The last update timestamp.
   */
  public get updatedAt(): Date {
    return this._updatedAt;
  }
}
