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
 * @interface IDomainEvent
 */
interface IDomainEvent {
  /** The timestamp when the event occurred. */
  readonly occurredOn: Date;
  /** The ID of the aggregate root that this event belongs to. */
  readonly aggregateId: string;
  /** The name of the event. */
  readonly eventName: string;
  /** The data payload associated with the event. */
  readonly payload: any;
}

/**
 * @description Published when a new user profile is created.
 * @class UserProfileCreatedEvent
 */
class UserProfileCreatedEvent implements IDomainEvent {
  readonly occurredOn: Date = new Date();
  readonly eventName = 'user.profile.created';

  /**
   * @param aggregateId The ID of the created user.
   * @param payload The data of the created user.
   */
  constructor(readonly aggregateId: string, readonly payload: any) {}
}

/**
 * @description Published when a user profile is updated.
 * @class UserProfileUpdatedEvent
 */
class UserProfileUpdatedEvent implements IDomainEvent {
  readonly occurredOn: Date = new Date();
  readonly eventName = 'user.profile.updated';

  /**
   * @param aggregateId The ID of the updated user.
   * @param payload The updated data of the user.
   */
  constructor(readonly aggregateId: string, readonly payload: any) {}
}

/**
 * @description Published when a user profile is deleted.
 * @class UserProfileDeletedEvent
 */
class UserProfileDeletedEvent implements IDomainEvent {
  readonly occurredOn: Date = new Date();
  readonly eventName = 'user.profile.deleted';

  /**
   * @param aggregateId The ID of the deleted user.
   * @param payload An object containing the ID of the deleted user.
   */
  constructor(readonly aggregateId: string, readonly payload: { id: string }) {}
}

/**
 * @interface IEventPublisher
 * @description Defines the port for publishing domain events. Implementations (adapters)
 * will handle sending these events to an external message bus like Kafka.
 */
interface IEventPublisher {
  /**
   * Publishes a single domain event.
   * @param {IDomainEvent} event The domain event to publish.
   * @returns {Promise<void>}
   */
  publish(event: IDomainEvent): Promise<void>;
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
export class UserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // This is the TypeORM adapter for the IUserRepository port.
    @Inject(EVENT_BUS_SERVICE)
    private readonly eventPublisher: ClientKafka, // This is the Kafka adapter for the IEventPublisher port.
  ) {}

  /**
   * @method onModuleInit
   * @description Connects to the event bus client when the module initializes.
   */
  async onModuleInit() {
    try {
      await this.eventPublisher.connect();
      this.logger.log('UserService connected to Kafka message bus.');
    } catch (err) {
      this.logger.error('Failed to connect UserService to Kafka', err);
    }
  }

  /**
   * @method onModuleDestroy
   * @description Disconnects from the event bus client during application shutdown.
   */
  async onModuleDestroy() {
    await this.eventPublisher.close();
    this.logger.log('UserService disconnected from Kafka.');
  }

  /**
   * @method createUser
   * @description Creates a new user profile based on an event from an external authentication provider.
   * This is the primary method for user creation in the event-driven architecture.
   * @param {CreateUserEvent} eventPayload Data from the `auth.user.created` event.
   * @returns {Promise<User>} The newly created or existing user entity.
   * @emits UserProfileCreatedEvent upon successful creation.
   */
  async createUser(eventPayload: CreateUserEvent): Promise<User> {
    const { authId, email, name } = eventPayload;

    const existingUser = await this.userRepository.findOne({ where: [{ authId }, { email }] });
    if (existingUser) {
      this.logger.warn(`User creation from event skipped: User with authId ${authId} or email ${email} already exists.`);
      return existingUser;
    }

    const newUser = this.userRepository.create({ authId, email, name });
    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`Created user profile with ID ${savedUser.id} for authId ${authId}.`);

    const event = new UserProfileCreatedEvent(savedUser.id, savedUser);
    await this.eventPublisher.emit(event.eventName, JSON.stringify(event.payload)).toPromise();

    return savedUser;
  }

  /**
   * @method create
   * @description Creates a new user via a direct API call (e.g., GraphQL mutation).
   * @param {CreateUserInput} createUserInput Data for the new user.
   * @returns {Promise<User>} The newly created user entity.
   * @emits UserProfileCreatedEvent upon successful creation.
   */
  async create(createUserInput: CreateUserInput): Promise<User> {
    this.logger.log(`Creating a new user directly for email: ${createUserInput.email}.`);
    const existingUser = await this.userRepository.findOneBy({ email: createUserInput.email });
    if (existingUser) {
      throw new ConflictException(`User with email ${createUserInput.email} already exists.`);
    }

    const newUser = this.userRepository.create(createUserInput);
    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`Created user with ID ${savedUser.id}.`);

    const event = new UserProfileCreatedEvent(savedUser.id, savedUser);
    await this.eventPublisher.emit(event.eventName, JSON.stringify(event.payload)).toPromise();

    return savedUser;
  }

  /**
   * @method findOneById
   * @description Retrieves a single user by their unique ID. This is a query operation.
   * @param {string} id The UUID of the user to find.
   * @returns {Promise<User>} The found user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   */
  async findOneById(id: string): Promise<User> {
    this.logger.debug(`Finding user by ID: ${id}`);
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  /**
   * @method update
   * @description Updates an existing user's profile information. This is a command operation.
   * @param {string} id The ID of the user to update.
   * @param {UpdateUserInput} updateUserInput The fields to update.
   * @returns {Promise<User>} The updated user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   * @emits UserProfileUpdatedEvent upon successful update.
   */
  async update(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    const user = await this.userRepository.preload({ id, ...updateUserInput });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Updated user profile with ID ${id}.`);

    const event = new UserProfileUpdatedEvent(updatedUser.id, updatedUser);
    await this.eventPublisher.emit(event.eventName, JSON.stringify(event.payload)).toPromise();

    return updatedUser;
  }
}
