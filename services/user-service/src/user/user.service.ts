import { Inject, Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';

@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);

  // In a real-world microservice, this would be replaced with a database repository
  // (e.g., using TypeORM, Prisma, or Mongoose).
  // An in-memory array is used here for demonstration purposes.
  // We include a default user to ensure the gateway can resolve `User { id: '1' }`.
  private readonly users: User[] = [
    {
      id: '1',
      email: 'visionary@demobank.com',
      name: 'The Visionary',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    },
  ];

  // In a production setup, 'KAFKA_SERVICE' would be configured in the module
  // to connect to the central message bus (e.g., Kafka).
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * Creates a new user in the system and emits a `user.created` event.
   * @param createUserInput - Data for the new user.
   * @returns The newly created user entity.
   */
  create(createUserInput: CreateUserInput): User {
    const newUser: User = {
      id: uuidv4(),
      ...createUserInput,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);
    this.logger.log(`Created user with ID ${newUser.id}`);

    // Choreography Pattern: Publish an event to notify other services of the new user.
    this.kafkaClient.emit('user.created', JSON.stringify(newUser));

    return newUser;
  }

  /**
   * Retrieves all users from the data store.
   * @returns A promise resolving to an array of all users.
   */
  findAll(): User[] {
    this.logger.log('Fetching all users');
    return this.users;
  }

  /**
   * Retrieves a single user by their unique ID.
   * This is a key method for GraphQL Federation's entity resolution.
   * @param id - The ID of the user to find.
   * @returns A promise resolving to the found user.
   * @throws {NotFoundException} if a user with the given ID is not found.
   */
  findOne(id: string): User {
    this.logger.log(`Finding user with ID: ${id}`);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      this.logger.warn(`User with ID "${id}" not found.`);
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  /**
   * Updates an existing user's data and emits a `user.updated` event.
   * @param id - The ID of the user to update.
   * @param updateUserInput - The fields to update.
   * @returns The updated user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   */
  update(id: string, updateUserInput: UpdateUserInput): User {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      this.logger.warn(`Attempted to update non-existent user with ID "${id}".`);
      throw new NotFoundException(`User #${id} not found`);
    }

    const user = this.users[userIndex];
    const updatedUser = {
      ...user,
      ...updateUserInput,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;
    this.logger.log(`Updated user with ID ${id}`);

    // Choreography Pattern: Publish an event to notify other services of the update.
    this.kafkaClient.emit('user.updated', JSON.stringify(updatedUser));

    return updatedUser;
  }

  /**
   * Deletes a user from the system and emits a `user.deleted` event.
   * @param id - The ID of the user to delete.
   * @returns The deleted user entity.
   * @throws {NotFoundException} if a user with the given ID is not found.
   */
  remove(id: string): User {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      this.logger.warn(`Attempted to remove non-existent user with ID "${id}".`);
      throw new NotFoundException(`User #${id} not found`);
    }

    const [removedUser] = this.users.splice(userIndex, 1);
    this.logger.log(`Removed user with ID ${id}`);

    // Choreography Pattern: Publish an event to notify other services of the deletion.
    this.kafkaClient.emit('user.deleted', JSON.stringify({ id: removedUser.id }));

    return removedUser;
  }

  /**
   * A NestJS lifecycle hook that is called once the module has been initialized.
   * It ensures the Kafka client is connected before the service starts handling requests.
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
   * A NestJS lifecycle hook that is called when the application is shutting down.
   * It ensures the Kafka client is gracefully disconnected.
   */
  async onModuleDestroy() {
    await this.kafkaClient.close();
    this.logger.log('Kafka client disconnected.');
  }
}
