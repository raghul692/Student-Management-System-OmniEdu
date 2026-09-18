/**
 * OMNIEDU — REAL PROMETHEUS METRICS REGISTRY
 * Tracks live HTTP latencies, status codes, AI provider performance,
 * fallback occurrences, queue depth, and memory stats.
 */

interface HistogramData {
  count: number;
  sum: number;
  buckets: Record<number, number>; // upper bound -> cumulative count
}

const DEFAULT_LATENCY_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

class MetricsRegistry {
  public totalRequests = 0;
  public activeRequests = 0;
  public requestsByStatus: Record<string, number> = {};
  public requestsByMethod: Record<string, number> = {};
  public requestsByRoute: Record<string, number> = {};

  // Latency Histograms
  private httpLatency: HistogramData = {
    count: 0,
    sum: 0,
    buckets: Object.fromEntries(DEFAULT_LATENCY_BUCKETS.map((b) => [b, 0])),
  };

  // AI Metrics
  public aiRequestsTotal: Record<string, number> = {};
  public aiRequestDurationSumMs: Record<string, number> = {};
  public aiRequestCount: Record<string, number> = {};
  public aiFallbacksTotal: Record<string, number> = {};

  // Queue Metrics
  public queueJobsTotal: Record<string, number> = {};
  public queueProcessingDurationSumMs: Record<string, number> = {};
  public queueProcessingCount: Record<string, number> = {};

  // Cache Metrics
  public cacheHitsTotal = 0;
  public cacheMissesTotal = 0;

  // DB Metrics
  public dbQueriesTotal = 0;
  public dbQueryDurationSumMs = 0;

  public startTime = Date.now();

  /**
   * Record completed HTTP request.
   */
  public recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    const methodKey = method.toUpperCase();
    this.requestsByMethod[methodKey] = (this.requestsByMethod[methodKey] || 0) + 1;

    const statusKey = statusCode.toString();
    this.requestsByStatus[statusKey] = (this.requestsByStatus[statusKey] || 0) + 1;

    const routeKey = route || 'unknown';
    this.requestsByRoute[routeKey] = (this.requestsByRoute[routeKey] || 0) + 1;

    // Record Histogram
    this.httpLatency.count++;
    this.httpLatency.sum += durationMs;
    for (const b of DEFAULT_LATENCY_BUCKETS) {
      if (durationMs <= b) {
        this.httpLatency.buckets[b]++;
      }
    }
  }

  /**
   * Record AI call execution.
   */
  public recordAiCall(provider: string, feature: string, durationMs: number, success: boolean): void {
    const key = `${provider}:${feature}:${success ? 'success' : 'failure'}`;
    this.aiRequestsTotal[key] = (this.aiRequestsTotal[key] || 0) + 1;

    const durationKey = `${provider}:${feature}`;
    this.aiRequestDurationSumMs[durationKey] = (this.aiRequestDurationSumMs[durationKey] || 0) + durationMs;
    this.aiRequestCount[durationKey] = (this.aiRequestCount[durationKey] || 0) + 1;
  }

  /**
   * Record AI provider failover.
   */
  public recordAiFallback(fromProvider: string, toProvider: string): void {
    const key = `${fromProvider}_to_${toProvider}`;
    this.aiFallbacksTotal[key] = (this.aiFallbacksTotal[key] || 0) + 1;
  }

  /**
   * Record Queue Job completion or failure.
   */
  public recordQueueJob(type: string, status: 'COMPLETED' | 'FAILED', durationMs: number): void {
    const key = `${type}:${status.toLowerCase()}`;
    this.queueJobsTotal[key] = (this.queueJobsTotal[key] || 0) + 1;

    this.queueProcessingDurationSumMs[type] = (this.queueProcessingDurationSumMs[type] || 0) + durationMs;
    this.queueProcessingCount[type] = (this.queueProcessingCount[type] || 0) + 1;
  }

  /**
   * Record cache access.
   */
  public recordCacheHit(): void {
    this.cacheHitsTotal++;
  }

  public recordCacheMiss(): void {
    this.cacheMissesTotal++;
  }

  /**
   * Record DB query duration.
   */
  public recordDbQuery(durationMs: number): void {
    this.dbQueriesTotal++;
    this.dbQueryDurationSumMs += durationMs;
  }

  /**
   * Format all collected metrics in standard Prometheus exposition format.
   */
  public toPrometheus(): string {
    const mem = process.memoryUsage();
    const lines: string[] = [
      `# HELP process_uptime_seconds Process uptime in seconds.`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP process_memory_rss_bytes Resident set size in bytes.`,
      `# TYPE process_memory_rss_bytes gauge`,
      `process_memory_rss_bytes ${mem.rss}`,
      ``,
      `# HELP process_memory_heap_used_bytes Heap used in bytes.`,
      `# TYPE process_memory_heap_used_bytes gauge`,
      `process_memory_heap_used_bytes ${mem.heapUsed}`,
      ``,
      `# HELP http_requests_total Total number of HTTP requests processed.`,
      `# TYPE http_requests_total counter`,
      `http_requests_total ${this.totalRequests}`,
      ``,
      `# HELP http_active_requests Currently in-flight HTTP requests.`,
      `# TYPE http_active_requests gauge`,
      `http_active_requests ${this.activeRequests}`,
      ``,
      `# HELP http_request_duration_ms HTTP request latency in milliseconds.`,
      `# TYPE http_request_duration_ms histogram`,
    ];

    for (const b of DEFAULT_LATENCY_BUCKETS) {
      lines.push(`http_request_duration_ms_bucket{le="${b}"} ${this.httpLatency.buckets[b]}`);
    }
    lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${this.httpLatency.count}`);
    lines.push(`http_request_duration_ms_sum ${this.httpLatency.sum}`);
    lines.push(`http_request_duration_ms_count ${this.httpLatency.count}`);
    lines.push(``);

    // Status code distribution
    lines.push(`# HELP http_requests_by_status Total HTTP requests by status code.`);
    lines.push(`# TYPE http_requests_by_status counter`);
    for (const [code, count] of Object.entries(this.requestsByStatus)) {
      lines.push(`http_requests_by_status{status="${code}"} ${count}`);
    }
    lines.push(``);

    // AI Provider Metrics
    lines.push(`# HELP ai_requests_total Total requests executed by AI platform.`);
    lines.push(`# TYPE ai_requests_total counter`);
    for (const [key, count] of Object.entries(this.aiRequestsTotal)) {
      const [provider, feature, status] = key.split(':');
      lines.push(`ai_requests_total{provider="${provider}",feature="${feature}",status="${status}"} ${count}`);
    }
    lines.push(``);

    lines.push(`# HELP ai_provider_fallbacks_total Total AI provider failovers.`);
    lines.push(`# TYPE ai_provider_fallbacks_total counter`);
    for (const [key, count] of Object.entries(this.aiFallbacksTotal)) {
      lines.push(`ai_provider_fallbacks_total{transition="${key}"} ${count}`);
    }
    lines.push(``);

    // Cache Metrics
    lines.push(`# HELP cache_hits_total Total cache hits.`);
    lines.push(`# TYPE cache_hits_total counter`);
    lines.push(`cache_hits_total ${this.cacheHitsTotal}`);
    lines.push(`# HELP cache_misses_total Total cache misses.`);
    lines.push(`# TYPE cache_misses_total counter`);
    lines.push(`cache_misses_total ${this.cacheMissesTotal}`);
    lines.push(``);

    // Queue Metrics
    lines.push(`# HELP queue_jobs_total Total background queue jobs processed.`);
    lines.push(`# TYPE queue_jobs_total counter`);
    for (const [key, count] of Object.entries(this.queueJobsTotal)) {
      const [type, status] = key.split(':');
      lines.push(`queue_jobs_total{type="${type}",status="${status}"} ${count}`);
    }
    lines.push(``);

    return lines.join('\n') + '\n';
  }

  public reset(): void {
    this.totalRequests = 0;
    this.activeRequests = 0;
    this.requestsByStatus = {};
    this.requestsByMethod = {};
    this.requestsByRoute = {};
    this.httpLatency = {
      count: 0,
      sum: 0,
      buckets: Object.fromEntries(DEFAULT_LATENCY_BUCKETS.map((b) => [b, 0])),
    };
    this.aiRequestsTotal = {};
    this.aiRequestDurationSumMs = {};
    this.aiRequestCount = {};
    this.aiFallbacksTotal = {};
    this.queueJobsTotal = {};
    this.queueProcessingDurationSumMs = {};
    this.queueProcessingCount = {};
    this.cacheHitsTotal = 0;
    this.cacheMissesTotal = 0;
    this.dbQueriesTotal = 0;
    this.dbQueryDurationSumMs = 0;
  }
}

export const metricsRegistry = new MetricsRegistry();
