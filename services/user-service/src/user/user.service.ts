import { Injectable, Logger, NotFoundException, Inject, OnModuleInit, OnModuleDestroy, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { CreateUserEvent } from './events/create-user.event';
import { EVENT_BUS_SERVICE } from '../event-bus/event-bus.module';
import * as bcrypt from 'bcrypt';

// =============================================================================
// DOMAIN LAYER (Ports and Domain Events)
// These interfaces define the 'ports' of the Hexagonal Architecture, decoupling
// the core domain logic from external infrastructure concerns.
// =============================================================================

/**
 * @description Represents a domain event, indicating a significant change within the domain.
 */
interface IDomainEvent {
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly eventName: string;
  readonly payload: any;
}

/**
 * @description Published when a new user profile is created.
 */
class UserProfileCreatedEvent implements IDomainEvent {
  readonly occurredOn: Date = new Date();
  readonly eventName = 'user.profile.created';

  constructor(readonly aggregateId: string, readonly payload: any) {}
}

/**
 * @description Published when a user profile is updated.
 */
class UserProfileUpdatedEvent implements IDomainEvent {
  readonly occurredOn: Date = new Date();
  readonly eventName = 'user.profile.updated';

  constructor(readonly aggregateId: string, readonly payload: any) {}
}

/**
 * @description Published when a user profile is deleted.
 */
class UserProfileDeletedEvent implements IDomainEvent {
  readonly occurredOn: Date = new Date();
  readonly eventName = 'user.profile.deleted';

  constructor(readonly aggregateId: string, readonly payload: { id: string }) {}
}

/**
 * @interface IEventPublisher
 * @description Defines the port for publishing domain events. Implementations (adapters)
 * will handle sending these events to an external message bus like Kafka.
 */
interface IEventPublisher {
  publish(event: IDomainEvent): Promise<void>;
}

/**
 * @interface IUserRepository
 * @description Defines the port for persisting `User` aggregate roots.
 * This interface abstracts away the underlying database technology.
 */
interface IUserRepository {
  findOneById(id: string): Promise<User | null>;
  findOneByAuthIdOrEmail(authId?: string, email?: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  remove(user: User): Promise<void>;
}

// =============================================================================
// INFRASTRUCTURE LAYER (Adapters)
// These classes implement the ports defined above, providing concrete
// implementations using specific technologies (TypeORM, Kafka).
// =============================================================================

/**
 * @class TypeOrmUserRepositoryAdapter
 * @implements {IUserRepository}
 * @description Adapts TypeORM's `Repository<User>` to the `IUserRepository` port.
 * This class handles direct database interactions for the `User` entity.
 */
@Injectable()
class TypeOrmUserRepositoryAdapter implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * @method findOneById
   * @description Finds a single user by their unique ID.
   * @param id The UUID of the user to find.
   * @returns The found user entity or null.
   */
  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  /**
   * @method findOneByAuthIdOrEmail
   * @description Finds a single user by either their authentication ID or email address.
   * @param authId Optional authentication ID.
   * @param email Optional email address.
   * @returns The found user entity or null.
   */
  async findOneByAuthIdOrEmail(authId?: string, email?: string): Promise<User | null> {
    if (authId && email) {
      return this.userRepository.findOne({ where: [{ authId }, { email }] });
    } else if (authId) {
      return this.userRepository.findOneBy({ authId });
    } else if (email) {
      return this.userRepository.findOneBy({ email });
    }
    return null;
  }

  /**
   * @method findAll
   * @description Retrieves all user entities.
   * @returns An array of all user entities.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * @method save
   * @description Persists a user entity to the database. Creates if new, updates if existing.
   * @param user The user entity to save.
   * @returns The saved user entity.
   */
  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  /**
   * @method remove
   * @description Removes a user entity from the database.
   * @param user The user entity to remove.
   */
  async remove(user: User): Promise<void> {
    await this.userRepository.remove(user);
  }
}

/**
 * @class KafkaEventPublisherAdapter
 * @implements {IEventPublisher}
 * @description Adapts NestJS Kafka `ClientKafka` to the `IEventPublisher` port.
 * This class handles publishing domain events to a Kafka message bus.
 */
@Injectable()
class KafkaEventPublisherAdapter implements IEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventPublisherAdapter.name);

  constructor(
    @Inject(EVENT_BUS_SERVICE)
    private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * @method publish
   * @description Publishes a domain event to the configured Kafka topic.
   * @param event The domain event to publish.
   */
  async publish(event: IDomainEvent): Promise<void> {
    this.logger.log(`Publishing event: ${event.eventName} for aggregate ${event.aggregateId}`);
    try {
      await this.kafkaClient.emit(event.eventName, JSON.stringify(event.payload)).toPromise();
      this.logger.debug(`Event ${event.eventName} published successfully.`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventName}: ${error.message}`, error.stack);
      // In a production system, this would involve robust error handling, e.g., dead-letter queues, retries.
      throw error; 
    }
  }

  /**
   * @method onModuleInit
   * @description Connects to the Kafka client when the module initializes.
   */
  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('KafkaEventPublisherAdapter connected to Kafka message bus.');
    } catch (err) {
      this.logger.error('Failed to connect KafkaEventPublisherAdapter to Kafka', err);
    }
  }

  /**
   * @method onModuleDestroy
   * @description Disconnects from the Kafka client during application shutdown.
   */
  async onModuleDestroy() {
    await this.kafkaClient.close();
    this.logger.log('KafkaEventPublisherAdapter disconnected from Kafka.');
  }
}

// =============================================================================
// APPLICATION LAYER (Service)
// This layer contains the application-specific business logic, orchestrating
// interactions between the domain and infrastructure via ports.
// =============================================================================

/**
 * @class UserService
 * @description Manages user profile business logic, acting as the application service
 * within the User microservice's bounded context. It orchestrates user creation, retrieval,
 * updates, and deletion, leveraging domain models and infrastructure adapters.
 * Adheres to Hexagonal Architecture by interacting with `IUserRepository` and `IEventPublisher` ports.
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: TypeOrmUserRepositoryAdapter, // Injected as an adapter
    private readonly eventPublisher: KafkaEventPublisherAdapter, // Injected as an adapter
  ) {}

  /**
   * @method createUser
   * @description Creates a new user profile based on an event from an external authentication provider.
   * This is the primary method for user creation in the event-driven architecture.
   * It ensures idempotency for at-least-once delivery semantics from the event bus.
   * @param eventPayload Data from the `auth.user.created` event, including `authId` for external identity linkage.
   * @returns The newly created or existing user entity.
   * @emits UserProfileCreatedEvent upon successful creation.
   */
  async createUser(eventPayload: CreateUserEvent): Promise<User> {
    const { authId, email, name, passwordHash } = eventPayload; // passwordHash added to eventPayload for completeness

    let existingUser = await this.userRepository.findOneByAuthIdOrEmail(authId, email);
    if (existingUser) {
      this.logger.warn(`User creation from event skipped: User with authId ${authId} or email ${email} already exists. Returning existing user.`);
      return existingUser;
    }

    const newUser = new User(); // Assuming User is a TypeORM entity that can be instantiated directly
    newUser.authId = authId;
    newUser.email = email;
    newUser.name = name;
    newUser.passwordHash = passwordHash; // Store password hash from the auth service event

    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`Created user profile with ID ${savedUser.id} for authId ${authId}.`);

    // Publish domain event after successful persistence.
    await this.eventPublisher.publish(new UserProfileCreatedEvent(savedUser.id, savedUser));

    return savedUser;
  }

  /**
   * @method registerUser
   * @description Registers a new user directly via the API. This typically includes hashing the password.
   * This method is intended for internal or direct API-driven user registration flows, potentially for admin users.
   * @param createUserInput Data for the new user, including a plaintext password.
   * @returns The newly created user entity.
   * @throws {ConflictException} If a user with the given email already exists.
   * @emits UserProfileCreatedEvent upon successful registration.
   */
  async registerUser(createUserInput: CreateUserInput): Promise<User> {
    this.logger.log(`Attempting direct user registration for email: ${createUserInput.email}.`);
    
    const { email, name, password } = createUserInput;

    const existingUser = await this.userRepository.findOneByAuthIdOrEmail(undefined, email);
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists.`);
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash password with a salt round of 10

    const newUser = new User();
    newUser.email = email;
    newUser.name = name;
    newUser.passwordHash = hashedPassword;
    // Note: authId might be null initially if this is a direct registration not from an external IdP.
    // A proper flow would link this user to an IdP later.

    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`Registered user profile with ID ${savedUser.id} for email ${email}.`);

    await this.eventPublisher.publish(new UserProfileCreatedEvent(savedUser.id, savedUser));
    
    return savedUser;
  }

  /**
   * @method findOneById
   * @description Retrieves a single user by their unique ID.
   * This is essential for GraphQL Federation's entity resolution (`@ResolveReference`).
   * @param id The UUID of the user to find.
   * @returns The found user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   */
  async findOneById(id: string): Promise<User> {
    this.logger.debug(`Finding user by ID: ${id}`);
    const user = await this.userRepository.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  /**
   * @method findAll
   * @description Retrieves all users. In a production environment, this method should be paginated
   * to prevent performance issues with large datasets.
   * @returns An array of all user entities.
   */
  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    return this.userRepository.findAll();
  }

  /**
   * @method updateProfile
   * @description Updates an existing user's profile information. Applies changes directly to the user aggregate.
   * @param id The ID of the user to update.
   * @param updateUserInput The fields to update.
   * @returns The updated user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   * @emits UserProfileUpdatedEvent upon successful update.
   */
  async updateProfile(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Apply updates directly to the domain object (TypeORM entity in this case)
    // In a richer domain model, this would call a method on the User aggregate.
    if (updateUserInput.name) user.name = updateUserInput.name;
    if (updateUserInput.email) user.email = updateUserInput.email;
    if (updateUserInput.title) user.title = updateUserInput.title;
    if (updateUserInput.avatarUrl) user.avatarUrl = updateUserInput.avatarUrl;

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Updated user profile with ID ${id}.`);

    await this.eventPublisher.publish(new UserProfileUpdatedEvent(updatedUser.id, updatedUser));

    return updatedUser;
  }

  /**
   * @method removeUser
   * @description Removes a user from the system. This is typically a 'soft delete' in real-world scenarios.
   * @param id The ID of the user to remove.
   * @returns The user entity that was removed.
   * @throws {NotFoundException} if a user with the given ID is not found.
   * @emits UserProfileDeletedEvent upon successful removal.
   */
  async removeUser(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    await this.userRepository.remove(user);
    this.logger.log(`Removed user with ID ${id}.`);

    await this.eventPublisher.publish(new UserProfileDeletedEvent(id, { id }));

    return user;
  }

  /**
   * @method validateUserCredentials
   * @description Validates user credentials (email and password).
   * This method is part of the user authentication process and typically involves hashing and comparison.
   * @param email The user's email address.
   * @param password The plaintext password provided by the user.
   * @returns The user entity if credentials are valid, otherwise null.
   */
  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOneByAuthIdOrEmail(undefined, email);
    if (user && user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (isPasswordValid) {
        return user;
      }
    }
    return null;
  }
}
