import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

/**
 * The UserModule encapsulates all logic related to user management,
 * including profile data, authentication details, and preferences.
 *
 * As part of the `user-service` microservice, this module defines the core
 * User entity for the entire federated graph and provides the necessary
 * resolvers and services to manage user data.
 *
 * It integrates with a database via TypeOrmModule to persist user information.
 */
@Module({
  imports: [
    // Register the User entity with TypeORM, making the UserRepository available
    // for injection within this module's scope.
    TypeOrmModule.forFeature([User]),
  ],
  // The resolver handles GraphQL queries/mutations, and the service contains the business logic.
  providers: [UserResolver, UserService],
  // Exporting the service makes it available for injection in other modules if needed (e.g., in a root App module).
  exports: [UserService],
})
export class UserModule {}
