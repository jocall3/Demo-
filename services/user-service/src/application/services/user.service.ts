import { Inject, Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { User } from '../../domain/aggregates/user.aggregate';
import { CreateUserCommand, UpdateUserCommand } from '../commands/user.commands';
import { FindUserByIdQuery, FindAllUsersQuery } from '../queries/user.queries';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../ports/event-publisher.port';

/**
 * @class UserService
 * @description This is the application service for the User bounded context, adhering to Hexagonal Architecture.
 * It orchestrates the application's use cases (commands and queries) by interacting with domain aggregates
 * and infrastructure via ports (interfaces). It is completely decoupled from the delivery mechanism (e.g., GraphQL, REST, event handlers)
 * and the persistence technology (e.g., TypeORM, Mongoose).
 *
 * @see IUserRepository
 * @see IEventPublisher
 * @see User
 * @public
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  /**
   * Constructs the UserService.
   * Dependencies are injected using NestJS's dependency injection system, referencing
   * abstractions (ports) rather than concrete implementations (adapters).
   *
   * @param {IUserRepository} userRepository - The repository port for user aggregate persistence.
   * @param {IEventPublisher} eventPublisher - The event publisher port for dispatching domain events.
   */
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {}

  /**
   * Handles the "Create User" use case. This is typically triggered by an event
   * from an authentication provider (e.g., Keycloak) when a new user signs up.
   * It creates a new User aggregate, persists it, and publishes the resulting domain events.
   *
   * @param {CreateUserCommand} command - The command containing data for the new user,
   * including the external authentication provider's ID.
   * @returns {Promise<User>} The newly created User aggregate instance.
   * @throws {ConflictException} If a user with the same email or authId already exists,
   * indicating a duplicate event or a race condition.
   */
  async createUser(command: CreateUserCommand): Promise<User> {
    this.logger.log(`Executing CreateUserCommand for authId: ${command.authId}`);

    // Business Rule: Ensure idempotency by checking if user already exists.
    const existingUser = await this.userRepository.findByAuthId(command.authId);
    if (existingUser) {
      this.logger.warn(`User with authId ${command.authId} already exists. Command is idempotent.`);
      return existingUser;
    }

    // Use the User aggregate's static factory method to create a new instance.
    // This encapsulates the creation logic and initial event generation within the domain model.
    const user = User.create(
      command.authId,
      command.email,
      command.name,
    );

    // Persist the new aggregate via the repository port. The adapter implementation
    // is responsible for transactionally saving the aggregate state and its events.
    await this.userRepository.save(user);
    this.logger.log(`User aggregate created and saved with ID: ${user.id}`);

    // Publish the domain events to the message bus via the event publisher port.
    // This notifies other bounded contexts (e.g., Accounts service) of the new user.
    await this.eventPublisher.publish(user.getUncommittedEvents());
    user.commit(); // Clears the uncommitted events from the aggregate.

    return user;
  }

  /**
   * Handles the "Update User Profile" use case. It retrieves an existing user,
   * applies profile changes, persists the new state, and publishes resulting domain events.
   *
   * @param {UpdateUserCommand} command - The command containing the user ID and fields to update.
   * @returns {Promise<User>} The updated User aggregate instance.
   * @throws {NotFoundException} If the user with the specified ID is not found.
   */
  async updateUserProfile(command: UpdateUserCommand): Promise<User> {
    const { id, name, title, avatarUrl } = command;
    this.logger.log(`Executing UpdateUserCommand for user ID: ${id}`);

    // 1. Retrieve the aggregate root from the repository.
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    // 2. Execute domain logic by calling methods on the aggregate.
    // This allows the aggregate to enforce its invariants (business rules)
    // and generate the appropriate domain events.
    if (name) user.changeName(name);
    user.updateProfile({ title, avatarUrl }); // Pass all optional fields

    // 3. Persist the updated aggregate.
    await this.userRepository.save(user);
    this.logger.log(`User aggregate updated for ID: ${user.id}`);

    // 4. Publish any new domain events.
    await this.eventPublisher.publish(user.getUncommittedEvents());
    user.commit();

    return user;
  }

  /**
   * Handles the "Find User By ID" query. It retrieves a user aggregate by its unique ID.
   * Note: In a strict CQRS pattern, this would query a separate read model. Here, for simplicity,
   * we use the same repository, which is acceptable for many systems.
   *
   * @param {FindUserByIdQuery} query - The query containing the user ID.
   * @returns {Promise<User>} The found User aggregate.
   * @throws {NotFoundException} If the user is not found.
   */
  async findOneById(query: FindUserByIdQuery): Promise<User> {
    this.logger.debug(`Executing FindUserByIdQuery for ID: ${query.id}`);
    const user = await this.userRepository.findById(query.id);
    if (!user) {
      throw new NotFoundException(`User with ID "${query.id}" not found.`);
    }
    return user;
  }

  /**
   * Handles the "Find All Users" query. Retrieves all user aggregates.
   * In a production application, this should implement pagination.
   *
   * @param {FindAllUsersQuery} query - The query object (currently empty, can be extended for pagination).
   * @returns {Promise<User[]>} An array of User aggregates.
   */
  async findAll(query: FindAllUsersQuery): Promise<User[]> {
    this.logger.log(`Executing FindAllUsersQuery.`);
    return this.userRepository.findAll();
  }
}
