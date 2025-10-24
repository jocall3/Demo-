import { Injectable, Logger } from '@nestjs/common';

/**
 * The AppService provides essential application-level methods.
 * In the new microservice architecture, this service is minimal and primarily
 * supports operational endpoints like health checks for the API gateway.
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  /**
   * Provides a simple health check response.
   * This is used by the AppController to expose a root REST endpoint for
   * monitoring services and container liveness/readiness probes.
   * @returns An object indicating the service status is 'ok'.
   */
  getHealthStatus(): { status: string } {
    this.logger.log('Health check endpoint was hit.');
    return {
      status: 'ok',
    };
  }
}
