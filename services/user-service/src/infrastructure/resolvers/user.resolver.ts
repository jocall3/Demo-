import {
  Args,
  Directive,
  Field,
  ID,
  InputType,
  ObjectType,
  Mutation,
  Query,
  Resolver,
  ResolveReference,
  PartialType,
} from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
// Assumed paths for Hexagonal Architecture components
import { UserApplicationService } from '../../application/user.application.service';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

/**
 * @class UserObject
 * @description GraphQL Object Type for a user. This is a federated entity, serving as the source of truth for user profiles.
 * It can be extended by other services to add domain-specific fields.
 * TSDoc for every property as per architectural directives.
 */
@ObjectType('User')
@Directive('@key(fields: "id")')
export class UserObject {
  /**
   * @property id The unique identifier for the user (UUID).
   * @type {string}
   */
  @Field(() => ID, { description: 'The unique identifier for the user (UUID).' })
  id: string;

  /**
   * @property email The user's primary email address. Must be unique.
   * @type {string}
   */
  @Field({ description: "The user's primary email address. Must be unique." })
  email: string;

  /**
   * @property name The user's full name.
   * @type {string}
   */
  @Field({ description: "The user's full name." })
  name: string;

  /**
   * @property title An optional title for the user, e.g., "Founder".
   * @type {string | undefined}
   */
  @Field({ nullable: true, description: 'An optional title for the user, e.g., "Founder".' })
  title?: string;

  /**
   * @property avatarUrl An optional URL for the user's avatar image.
   * @type {string | undefined}
   */
  @Field({ nullable: true, description: "An optional URL for the user's avatar image." })
  avatarUrl?: string;
}

/**
 * @class CreateUserInput
 * @description GraphQL input type for creating a new user. This is typically used for administrative
 * purposes or flows where a user profile is created separate from the IdP registration event.
 */
@InputType({ description: 'Input data for creating a new user profile.' })
export class CreateUserInput {
  /**
   * @property authId The unique identifier from the authentication provider (e.g., Keycloak sub).
   * @type {string}
   */
  @Field(() => ID, { description: "The user's unique identifier from the authentication provider (e.g., Keycloak's `sub` claim)." })
  authId: string;

  /**
   * @property email The email address for the new user. Should match the IdP record.
   * @type {string}
   */
  @Field({ description: "The new user's email address. Should match the record in the Identity Provider." })
  email: string;

  /**
   * @property name The full name of the new user.
   * @type {string}
   */
  @Field({ description: "The new user's full name." })
  name: string;
}

/**
 * @class UpdateUserInput
 * @description GraphQL input type for updating an existing user's profile.
 * It includes the user ID and makes other profile fields optional.
 */
@InputType({ description: "Input data for updating an existing user's profile." })
export class UpdateUserInput {
  /**
   * @property id The unique ID of the user to update.
   * @type {string}
   */
  @Field(() => ID, { description: 'The unique ID of the user to update.' })
  id: string;

  /**
   * @property email The new email address for the user.
   * @type {string | undefined}
   */
  @Field({ nullable: true, description: "The user's new email address." })
  email?: string;

  /**
   * @property name The new full name for the user.
   * @type {string | undefined}
   */
  @Field({ nullable: true, description: "The user's new full name." })
  name?: string;
}

/**
 * @class UserResolver
 * @description GraphQL resolver for User queries and mutations. This is an "Adapter" in Hexagonal Architecture.
 * It translates incoming GraphQL requests into calls to the application service (the "Port").
 * All operations are protected by a JWT authentication guard.
 * @see UserApplicationService
 */
@Resolver(() => UserObject)
@UseGuards(GqlAuthGuard)
export class UserResolver {
  private readonly logger = new Logger(UserResolver.name);

  /**
   * @constructor
   * @param {UserApplicationService} userAppService - Injects the application service that implements the application's use cases (port).
   */
  constructor(private readonly userAppService: UserApplicationService) {}

  /**
   * Retrieves a single user by their unique ID.
   * @param {string} id - The ID of the user to retrieve.
   * @returns {Promise<UserObject | null>} The found user object or null.
   */
  @Query(() => UserObject, { name: 'user', nullable: true, description: 'Find a user by their ID.' })
  async findOneById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<UserObject | null> {
    this.logger.log(`Handling 'user' query for ID: ${id}`);
    return this.userAppService.getUserById(id);
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * The user's identity is extracted from the JWT provided in the request context.
   * @param {object} user - The user object with `userId` (the 'sub' claim) injected by the CurrentUser decorator.
   * @returns {Promise<UserObject | null>} The authenticated user's profile.
   */
  @Query(() => UserObject, { name: 'me', description: "Get the currently authenticated user's profile." })
  async me(@CurrentUser() user: { userId: string }): Promise<UserObject | null> {
    this.logger.log(`Handling 'me' query for authenticated user ID: ${user.userId}`);
    return this.userAppService.getUserByAuthId(user.userId);
  }

  /**
   * Creates a user profile. While primary user creation is event-driven from the auth provider,
   * this mutation allows for administrative or alternative creation flows.
   * @param {CreateUserInput} createUserInput - The data for the new user.
   * @returns {Promise<UserObject>} The newly created user object.
   */
  @Mutation(() => UserObject, { description: 'Create a new user profile.' })
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<UserObject> {
    this.logger.log(`Handling 'createUser' mutation for email: ${createUserInput.email}`);
    return this.userAppService.createUser(createUserInput);
  }

  /**
   * Updates a user's profile information.
   * @param {UpdateUserInput} updateUserInput - The data for the user update.
   * @returns {Promise<UserObject>} The updated user object.
   */
  @Mutation(() => UserObject, { description: "Update a user's profile." })
  async updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ): Promise<UserObject> {
    this.logger.log(`Handling 'updateUser' mutation for user ID: ${updateUserInput.id}`);
    return this.userAppService.updateUser(updateUserInput);
  }

  /**
   * Resolves a User entity for Apollo Federation. This is called by the Apollo Gateway when another
   * service returns a reference to a User (e.g., `{ __typename: 'User', id: 'some-id' }`).
   * @param {{ __typename: string; id: string }} reference - The reference object from the gateway.
   * @returns {Promise<UserObject>} The resolved user object.
   */
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<UserObject> {
    this.logger.debug(`Resolving federated reference for User with ID: ${reference.id}`);
    return this.userAppService.getUserById(reference.id);
  }
}
