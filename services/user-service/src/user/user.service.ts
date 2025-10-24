import { Injectable, Logger, NotFoundException, Inject, OnModuleInit, OnModuleDestroy, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';

import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { CreateUserEvent } from './events/create-user.event';
import { EVENT_BUS_SERVICE } from '../event-bus/event-bus.module';

/**
 * Service responsible for user profile business logic.
 *
 * This service is the core of the User microservice. It manages user data persistence,
 * interacts with the database via TypeORM, and communicates with other services
 * by emitting events to the message bus (Kafka).
 *
 * It has been refactored to use a PostgreSQL database via TypeORM's repository pattern,
 * replacing the previous in-memory array for production-grade persistence.
 */
@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(EVENT_BUS_SERVICE)
    private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * Creates a user profile based on an event from an external authentication provider.
   * This is the primary method for user creation in the new architecture.
   *
   * @param eventPayload - Data from the `auth.user.created` event.
   * @returns The newly created user entity.
   */
  async createUser(eventPayload: CreateUserEvent): Promise<User> {
    const { authId, email, name } = eventPayload;

    const existingUser = await this.userRepository.findOne({ where: [{ authId }, { email }] });
    if (existingUser) {
      this.logger.warn(`User creation from event skipped: User with authId ${authId} or email ${email} already exists.`);
      // This can happen in at-least-once delivery systems; we handle it idempotently by returning the existing user.
      return existingUser;
    }

    const newUser = this.userRepository.create({
      authId,
      email,
      name,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`Created user profile with ID ${savedUser.id} from event for authId ${authId}.`);

    // Publish an event to notify other services that a user profile has been created.
    this.kafkaClient.emit('user.profile.created', JSON.stringify(savedUser));
    
    return savedUser;
  }

  /**
   * (DEPRECATED - for admin use only) Creates a user profile directly via API.
   * In the new auth architecture, this should be restricted to administrative purposes,
   * as the primary user creation flow is handled via events from the Identity Provider.
   *
   * @param createUserInput - Data for the new user from the GraphQL mutation.
   * @returns The newly created user entity.
   */
  async create(createUserInput: CreateUserInput): Promise<User> {
    this.logger.warn(`Direct user creation via API. This should be an administrative action.`);
    
    const { email, name } = createUserInput;

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
        throw new ConflictException(`User with email ${email} already exists.`);
    }

    // In an admin flow, we might not have an authId. A real system would need to handle this relationship with the IdP.
    const newUser = this.userRepository.create({
      email,
      name,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(`Created user profile with ID ${savedUser.id} from admin request.`);

    this.kafkaClient.emit('user.profile.created', JSON.stringify(savedUser));
    
    return savedUser;
  }

  /**
   * Retrieves a single user by their unique ID.
   * This is essential for GraphQL Federation's entity resolution (`@ResolveReference`).
   *
   * @param id - The UUID of the user to find.
   * @returns The found user entity.
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
   * Retrieves all users.
   * Note: In a production environment, this should be paginated.
   * @returns An array of all user entities.
   */
  async findAll(): Promise<User[]> {
      this.logger.log('Fetching all users');
      return this.userRepository.find();
  }

  /**
   * Updates an existing user's profile information.
   *
   * @param id - The ID of the user to update.
   * @param updateUserInput - The fields to update.
   * @returns The updated user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   */
  async update(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    const user = await this.userRepository.preload({
      id,
      ...updateUserInput,
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Updated user profile with ID ${id}`);

    // Publish an event to notify other services of the profile update.
    this.kafkaClient.emit('user.profile.updated', JSON.stringify(updatedUser));

    return updatedUser;
  }
  
  /**
   * Removes a user from the system.
   * In a real application, this would likely be a soft delete.
   * @param id - The ID of the user to remove.
   * @returns The user entity that was removed.
   */
  async remove(id: string): Promise<User> {
    const user = await this.findOneById(id);

    await this.userRepository.remove(user);
    this.logger.log(`Removed user with ID ${id}`);
    
    this.kafkaClient.emit('user.profile.deleted', JSON.stringify({ id }));

    return user;
  }

  /**
   * Connects to the Kafka client when the module initializes.
   */
  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('Successfully connected to Kafka message bus.');
    } catch (err) {
      this.logger.error('Failed to connect to Kafka', err);
    }
  }

  /**
   * Disconnects from the Kafka client during application shutdown.
   */
  async onModuleDestroy() {
    await this.kafkaClient.close();
    this.logger.log('Kafka client disconnected.');
  }
}
