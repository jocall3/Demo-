import { Controller, Get, Res, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Observability')
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Exposes application metrics in Prometheus format.
   * This endpoint is designed to be scraped by a Prometheus server for monitoring and alerting.
   * It uses the underlying Express response object to correctly set the 'Content-Type' header
   * for the plain text format that Prometheus requires.
   *
   * @param res The Express Response object, injected by NestJS.
   */
  @Get()
  @ApiOperation({
    summary: 'Get application metrics for Prometheus scraping.',
    description: 'Exposes application and system metrics in the Prometheus text-based format.',
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics.',
    headers: {
      'Content-Type': {
        schema: { type: 'string' },
        description: 'text/plain; version=0.0.4; charset=utf-8',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error if metrics generation fails.',
  })
  async getMetrics(@Res() res: Response) {
    try {
      this.logger.log('Scraping Prometheus metrics.');
      // Set the appropriate content type for Prometheus
      res.header('Content-Type', this.metricsService.getContentType());
      // Send the collected metrics as a plain text response
      const metrics = await this.metricsService.getMetrics();
      res.send(metrics);
    } catch (error) {
      this.logger.error('Failed to generate Prometheus metrics.', error.stack);
      // Use HttpException to let NestJS handle the error response format
      throw new HttpException('Could not generate metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
