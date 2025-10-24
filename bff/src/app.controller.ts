import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Controller for application health checks.
 * While the primary API is transitioning to GraphQL, this standard REST endpoint is maintained
 * for operational purposes such as liveness/readiness probes in container orchestrators
 * or simple uptime checks from monitoring services.
 */
@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * @returns A status object indicating that the API Gateway service is running.
   */
  @Get()
  @ApiOperation({
    summary: 'Get the health status of the service.',
    description:
      'Provides a simple health check endpoint for monitoring systems.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: {
          type: 'string',
          example: '2023-10-27T10:00:00.000Z',
          format: 'date-time',
        },
      },
    },
  })
  getHealthStatus(): { status: string; timestamp: string } {
    return this.appService.getHealthStatus();
  }
}
