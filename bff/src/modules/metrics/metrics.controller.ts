import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * DEPRECATED: This controller is deprecated in favor of the OpenTelemetry SDK's
 * PrometheusExporter, which exposes a /metrics endpoint on a dedicated port (9464).
 * This file is kept for historical reference during the transition but will be removed.
 * The Prometheus service should be configured to scrape the OTel port directly.
 */
@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get application metrics for Prometheus.',
    deprecated: true,
  })
  @ApiResponse({ status: 200, description: 'Prometheus metrics.' })
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.metricsService.getContentType());
    res.end(await this.metricsService.getMetrics());
  }
}
