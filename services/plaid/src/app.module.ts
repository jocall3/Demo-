import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { PlaidModule } from './plaid/plaid.module';
import configuration from './config/configuration';
import { join } from 'path';

@Module({
  imports: [
    // Global configuration module using a typed configuration file.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
      // In a microservice context, we use a .env file specific to this service
      envFilePath: `.env`,
    }),

    // GraphQL module configured for Apollo Federation v2.
    // This turns our NestJS application into a GraphQL subgraph.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      // autoSchemaFile tells the driver to automatically generate the GraphQL schema.
      // The `federation: 2` option ensures it's compatible with Apollo Federation 2.
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
    }),

    // The feature module containing all Plaid-related resolvers and services.
    PlaidModule,
  ],
})
export class AppModule {}
