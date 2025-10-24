import {
  Args,
  Directive,
  Field,
  ID,
  InputType,
  ObjectType,
  PartialType,
  Resolver,
  Query,
  ResolveReference,
  Mutation,
} from '@nestjs/graphql';
import { UserService } from './user.service';

// =============================================================================
// GraphQL Object Type
// =============================================================================

/**
 * The canonical representation of a User in the federated graph.
 * This service is the owner of the User entity. Other services
 * can extend this entity by referencing its key (`id`).
 */
@ObjectType()
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID, { description: 'The unique identifier for the user.' })
  id: string;

  @Field({ description: "The user's primary email address." })
  email: string;

  @Field({ description: "The user's full name." })
  name: string;

  @Field({ nullable: true, description: 'The user\'s title, e.g., "Founder".' })
  title?: string;

  @Field({ nullable: true, description: "URL for the user's avatar image." })
  avatarUrl?: string;
}

// =============================================================================
// GraphQL Input Types (DTOs)
// =============================================================================

@InputType()
export class CreateUserInput {
  @Field({ description: "The new user's email address." })
  email: string;

  @Field({ description: "The new user's full name." })
  name: string;

  @Field({ nullable: true, description: "The new user's title." })
  title?: string;

  @Field({ nullable: true, description: "URL for the new user's avatar." })
  avatarUrl?: string;
}

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => ID)
  id: string;
}

// =============================================================================
// Resolver
// =============================================================================

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  /**
   * Finds a single user by their unique ID.
   * @param id The user's unique ID.
   * @returns The user object.
   */
  @Query(() => User, { name: 'user', description: 'Find a user by their ID.' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<User> {
    // In a real application, this would fetch from a database.
    return this.userService.findOneById(id);
  }

  /**
   * Retrieves the currently authenticated user.
   * NOTE: In a real application, this would use a @CurrentUser() decorator
   * to extract user information from the authenticated session (e.g., JWT).
   * @returns The currently authenticated user.
   */
  @Query(() => User, { name: 'me', description: 'Get the currently authenticated user.' })
  async me(): Promise<User> {
    // For demonstration, we'll return a mock user.
    // The real implementation would be something like: return this.userService.findOneById(currentUser.id);
    return this.userService.findOneById('user-visionary-001');
  }

  /**
   * Creates a new user.
   * @param createUserInput The data for the new user.
   * @returns The newly created user object.
   */
  @Mutation(() => User, { description: 'Create a new user.' })
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    return this.userService.create(createUserInput);
  }

  /**
   * Updates an existing user's profile.
   * @param updateUserInput The data to update for the user.
   * @returns The updated user object.
   */
  @Mutation(() => User, { description: "Update a user's profile." })
  async updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
  ): Promise<User> {
    // The ID would typically come from the authenticated context.
    return this.userService.update(updateUserInput.id, updateUserInput);
  }

  /**
   * This is a resolver for the federated User entity. It allows other
   * subgraphs to resolve a User object by its ID.
   * @param reference An object containing the __typename and id of the entity.
   * @returns The fully resolved User object.
   */
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<User> {
    return this.userService.findOneById(reference.id);
  }
}
