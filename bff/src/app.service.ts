import { Injectable, Logger } from '@nestjs/common';

/**
 * The AppService provides essential application-level methods, such as health checks.
 * In the new GraphQL Gateway architecture, this service is minimal, as the gateway's
 * primary responsibility is to compose subgraphs, not to implement business logic.
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  /**
   * Provides a simple health check response.
   * This is used by the AppController to expose a root endpoint for
   * monitoring services and liveness probes.
   * @returns An object indicating the service status and the current timestamp.
   */
  getHealthStatus(): { status: string; timestamp: string } {
    this.logger.log('Health check endpoint was hit.');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
