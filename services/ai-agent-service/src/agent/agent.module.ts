import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AgentService } from './agent.service';
import { AgentResolver } from './agent.resolver';

/**
 * The AgentModule encapsulates the core logic for the AI Agent.
 * It sets up the necessary providers for the agent's functionality,
 * including the AgentService for business logic and the AgentResolver for GraphQL interactions.
 *
 * This module also configures a client for the message bus (Kafka), enabling the agent
 * to communicate asynchronously with other microservices as per the event-driven architecture.
 */
@Module({
  imports: [
    ConfigModule,
    // Register the Kafka client asynchronously to inject the ConfigService.
    // This allows the Kafka broker URLs to be managed via environment variables.
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'ai-agent-service',
              brokers: configService.get<string>('KAFKA_BROKERS').split(','),
            },
            consumer: {
              groupId: 'ai-agent-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [AgentResolver, AgentService],
  exports: [AgentService],
})
export class AgentModule {}
