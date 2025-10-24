import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenaiResolver } from './genai.resolver';
import { GenaiService } from './genai.service';

/**
 * The GenaiModule encapsulates all logic related to Generative AI features
 * for the GenAI microservice subgraph.
 *
 * It provides the GenaiResolver and GenaiService to the application. As a feature module,
 * it relies on the root AppModule to configure global modules like GraphQLModule
 * and the base ConfigModule.
 */
@Module({
  // Import ConfigModule to make ConfigService available for injection within this module's providers.
  // Although ConfigModule is configured as global in AppModule, this import makes
  // the dependency explicit and is good practice.
  imports: [ConfigModule],

  // Register the resolver and service with Nest's dependency injection container.
  providers: [GenaiResolver, GenaiService],

  // Export GenaiService so it can be potentially used by other modules within this microservice
  // in a more complex scenario.
  exports: [GenaiService],
})
export class GenaiModule {}
