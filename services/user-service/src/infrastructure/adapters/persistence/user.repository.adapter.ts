import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../../application/ports/user.repository.port';

/**
 * @class UserRepositoryAdapter
 * @classdesc This class is the persistence adapter for User aggregates. It implements
 * the `UserRepositoryPort` interface defined in the application layer, acting as a
 * bridge between the core application logic and the database infrastructure (TypeORM).
 * This adherence to Hexagonal Architecture ensures that the application's core is
 * completely decoupled from the persistence mechanism.
 * @implements {UserRepositoryPort}
 */
@Injectable()
export class UserRepositoryAdapter implements UserRepositoryPort {
  private readonly logger = new Logger(UserRepositoryAdapter.name);

  /**
   * @constructor
   * @param {Repository<User>} userRepository - The injected TypeORM repository for the User entity.
   * This dependency couples the adapter to TypeORM, which is its specific purpose.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * @method findById
   * @description Finds a single user by their unique identifier (UUID).
   * @param {string} id - The ID of the user to find.
   * @returns {Promise<User | null>} A promise that resolves to the User entity if found, or null otherwise.
   */
  async findById(id: string): Promise<User | null> {
    this.logger.debug(`Finding user by ID: ${id}`);
    return this.userRepository.findOneBy({ id });
  }

  /**
   * @method findByEmail
   * @description Finds a single user by their email address.
   * @param {string} email - The email address of the user to find.
   * @returns {Promise<User | null>} A promise that resolves to the User entity if found, or null otherwise.
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`Finding user by email: ${email}`);
    return this.userRepository.findOneBy({ email });
  }

  /**
   * @method findByAuthId
   * @description Finds a single user by their external authentication provider ID.
   * @param {string} authId - The external authentication ID of the user to find.
   * @returns {Promise<User | null>} A promise that resolves to the User entity if found, or null otherwise.
   */
  async findByAuthId(authId: string): Promise<User | null> {
    this.logger.debug(`Finding user by authId: ${authId}`);
    return this.userRepository.findOneBy({ authId });
  }

  /**
   * @method findAll
   * @description Retrieves all user entities from the database. In a production system,
   * this method should implement pagination.
   * @returns {Promise<User[]>} A promise that resolves to an array of all User entities.
   */
  async findAll(): Promise<User[]> {
    this.logger.debug('Finding all users');
    return this.userRepository.find();
  }

  /**
   * @method save
   * @description Persists a User entity to the database. This method can be used for both
   * creating a new user and updating an existing one.
   * @param {User} user - The User entity to be persisted.
   * @returns {Promise<User>} A promise that resolves to the saved User entity, including
   * any database-generated values (like ID or timestamps).
   */
  async save(user: User): Promise<User> {
    this.logger.debug(`Saving user with ID: ${user.id || 'new'}`);
    return this.userRepository.save(user);
  }

  /**
   * @method deleteById
   * @description Removes a user from the database by their unique identifier.
   * @param {string} id - The ID of the user to be deleted.
   * @returns {Promise<boolean>} A promise that resolves to true if the user was found and deleted,
   * false otherwise.
   */
  async deleteById(id: string): Promise<boolean> {
    this.logger.debug(`Deleting user with ID: ${id}`);
    const result = await this.userRepository.delete(id);
    return result.affected !== 0;
  }
}
