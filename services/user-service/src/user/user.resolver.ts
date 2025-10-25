import {
  Args,
  Context,
  Directive,
  Field,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  ResolveReference,
  PartialType,
} from '@nestjs/graphql';
import { Logger, NotFoundException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User as UserEntity } from './entities/user.entity';

/**
 * @description GraphQL Object Type for a User.
 * This is the public-facing representation of a user, excluding sensitive fields like password hashes.
 * It is a federated entity, identifiable by its 'id'.
 * @class User
 */
@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  /**
   * @description The unique identifier for the user.
   * @type {string}
   */
  @Field(() => ID)
  id: string;

  /**
   * @description The user's primary email address.
   * @type {string}
   */
  @Field()
  email: string;

  /**
   * @description The user's full name.
   * @type {string}
   */
  @Field()
  name: string;

  /**
   * @description The user's professional title, if any (e.g., "Founder").
   * @type {string | undefined}
   */
  @Field({ nullable: true })
  title?: string;

  /**
   * @description URL for the user's avatar image.
   * @type {string | undefined}
   */
  @Field({ nullable: true })
  avatarUrl?: string;
}

/**
 * @description Input type for creating a new user.
 * Includes fields required for user registration via the GraphQL API.
 * @class CreateUserInput
 */
@InputType()
export class CreateUserInput {
  /**
   * @description The new user's full name.
   * @type {string}
   */
  @Field()
  name: string;

  /**
   * @description The new user's email address. Must be unique.
   * @type {string}
   */
  @Field()
  email: string;

  /**
   * @description The new user's plaintext password. Will be hashed by the service.
   * @type {string}
   */
  @Field()
  password: string;

  /**
   * @description Optional title for the new user.
   * @type {string | undefined}
   */
  @Field({ nullable: true })
  title?: string;

  /**
   * @description Optional URL for the new user's avatar.
   * @type {string | undefined}
   */
  @Field({ nullable: true })
  avatarUrl?: string;
}

/**
 * @description Input type for updating an existing user's profile.
 * All fields from CreateUserInput are optional, and an ID is required.
 * @class UpdateUserInput
 */
@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  /**
   * @description The unique ID of the user to update.
   * @type {string}
   */
  @Field(() => ID)
  id: string;
}

/**
 * @description The GraphQL resolver for the User entity.
 * This class handles all GraphQL queries and mutations related to users, acting as the primary
 * inbound adapter for the user-service subgraph in the Hexagonal Architecture. It delegates all
 * business logic to the injected `UserService`.
 * @class UserResolver
 */
@Resolver(() => User)
export class UserResolver {
  private readonly logger = new Logger(UserResolver.name);

  /**
   * @constructor
   * @param {UserService} userService - The application service for user business logic.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * @description Retrieves the currently authenticated user's profile.
   * This query requires an authenticated context.
   * @param {any} context - The GraphQL execution context, containing the request with user data.
   * @returns {Promise<UserEntity>} The profile of the currently logged-in user.
   */
  @Query(() => User, { name: 'me', description: 'Get the currently authenticated user.' })
  async me(@Context() context: any): Promise<UserEntity> {
    const gqlContext = GqlExecutionContext.create(context);
    const user = gqlContext.getContext().req.user;

    if (!user || !user.userId) {
      throw new NotFoundException('Authenticated user not found in context.');
    }

    this.logger.log(`Resolving 'me' query for user ID: ${user.userId}`);
    return this.userService.findOneById(user.userId);
  }

  /**
   * @description Finds a single user by their unique ID.
   * @param {string} id - The ID of the user to find.
   * @returns {Promise<UserEntity>} The found user.
   */
  @Query(() => User, { name: 'user', description: 'Find a user by their ID.' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<UserEntity> {
    this.logger.log(`Resolving 'user' query for ID: ${id}`);
    return this.userService.findOneById(id);
  }

  /**
   * @description Retrieves a list of all users.
   * @returns {Promise<UserEntity[]>} An array of all users.
   */
  @Query(() => [User], { name: 'users', description: 'Get a list of all users.' })
  async findAll(): Promise<UserEntity[]> {
    this.logger.log(`Resolving 'users' query.`);
    return this.userService.findAll();
  }

  /**
   * @description Registers a new user with an email and password.
   * @param {CreateUserInput} createUserInput - The data for the new user.
   * @returns {Promise<UserEntity>} The newly created user profile.
   */
  @Mutation(() => User, { description: 'Register a new user.' })
  async registerUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<UserEntity> {
    this.logger.log(`Handling 'registerUser' mutation for email: ${createUserInput.email}`);
    return this.userService.registerUser(createUserInput);
  }

  /**
   * @description Updates an existing user's profile information.
   * @param {UpdateUserInput} updateUserInput - The new data for the user profile.
   * @returns {Promise<UserEntity>} The updated user profile.
   */
  @Mutation(() => User, { description: "Update a user's profile." })
  async updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ): Promise<UserEntity> {
    this.logger.log(`Handling 'updateUser' mutation for user ID: ${updateUserInput.id}`);
    return this.userService.updateProfile(updateUserInput.id, updateUserInput);
  }

  /**
   * @description Deletes a user from the system.
   * @param {string} id - The ID of the user to delete.
   * @returns {Promise<UserEntity>} The profile of the user that was deleted.
   */
  @Mutation(() => User, { description: 'Delete a user.' })
  async removeUser(@Args('id', { type: () => ID }) id: string): Promise<UserEntity> {
    this.logger.log(`Handling 'removeUser' mutation for user ID: ${id}`);
    return this.userService.removeUser(id);
  }

  /**
   * @description Resolves a reference to a User entity from another subgraph.
   * This is a key part of the Apollo Federation specification.
   * @param {{ __typename: string; id: string }} reference - The reference object from the gateway.
   * @returns {Promise<UserEntity>} The resolved user entity.
   */
  @ResolveReference()
  async resolveReference(reference: {
    __typename: string;
    id: string;
  }): Promise<UserEntity> {
    this.logger.debug(`Federation: Resolving reference for User with ID: ${reference.id}`);
    return this.userService.findOneById(reference.id);
  }
}
