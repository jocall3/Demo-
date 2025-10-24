import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root controller for the BFF application.
 * Handles basic health checks and status endpoints.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * @returns A status object indicating that the BFF service is running.
   * This endpoint is typically used by monitoring services to check the
   * health of the application.
   */
  @Get()
  getHealthStatus() {
    return this.appService.getHealthStatus();
  }
}
