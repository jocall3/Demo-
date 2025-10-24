import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigService available throughout the app
    }),
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => {
        return {
          autoSchemaFile: {
            federation: 2,
            path: join(process.cwd(), 'src/schema.gql'),
          },
          sortSchema: true,
          playground: configService.get<string>('NODE_ENV') !== 'production',
        };
      },
      inject: [ConfigService],
    }),
    MetricsModule,
  ],
})
export class AppModule {}
