# Fromistargram Infrastructure & Crawler

Fromistargram is a multi-service stack that indexes Instagram content harvested
with [instaloader](https://instaloader.github.io/) and exposes it through a
Fastify API as well as optimized thumbnails via [imgproxy](https://imgproxy.net/).
This README documents how to bootstrap the crawler, configure Docker Compose,
and monitor performance so the feed API responds in under 200 ms.

## Repository Structure

```
backend/   # Fastify API server (Node.js + Prisma)
frontend/  # React SPA for feed browsing (not covered by this plan)
plans/     # Implementation plans & progress tracking
docker-compose.yml  # Production-like stack definition
```

## Prerequisites

- Docker & Docker Compose v2
- Access to an Instagram account whose session can crawl the target profiles
- A PostgreSQL volume of ~5 GB and persistent storage for downloaded media

## Configuration

1. Copy `.env.sample` to `.env` and customize the values:

   ```bash
   cp .env.sample .env
   ```

2. Update the following keys:

   - `INSTAGRAM_USERNAME` / `INSTAGRAM_PASSWORD`: Credentials for the crawler
     account. The password is only required the first time; afterwards the
     session file stored under the `sessions` volume is reused.
   - `CRAWL_ACCOUNTS`: Comma-separated list of Instagram usernames to index.
   - `DATABASE_URL`: Prisma/Postgres connection string (defaults to the bundled
     Postgres service).
   - `IMGPROXY_KEY` & `IMGPROXY_SALT`: Optional signing secrets for hardened
     thumbnail URLs. Leave blank to disable signature enforcement.
   - `API_PORT` / `THUMBNAIL_PORT`: Published ports for the API and thumbnail
     proxy.

## Running the Stack

> The compose file provisions shared volumes that mirror the production layout:
> `data_root` (`/data` inside containers) for crawled assets, `sessions` for
> instaloader sessions, and `pg_data` for PostgreSQL state.

1. Build and start the services:

   ```bash
   docker compose up --build -d
   ```

2. Verify the health endpoints:

   ```bash
   curl http://localhost:4000/healthz
   curl http://localhost:8080/health
   ```

3. Inspect crawler logs to ensure accounts are processed sequentially with
   session reuse and retries applied:

   ```bash
   docker compose logs -f crawler
   ```

The crawler schedules runs based on `CRAWL_INTERVAL_MINUTES` (default 180).
Adjust the value for more frequent synchronisation or pass `--interval` when
running the container manually.

## Manual Crawler Execution

For one-off executions or smoke tests, you can run the crawler locally:

```bash
python crawler/main.py \
  --accounts your_account \
  --max-posts 5 \
  --data-root ./sample-data \
  --session-dir ./sessions
```

The script validates that every generated file matches the
`<timestamp>_UTC_{n}.ext` pattern and archives profile images whenever the hash
changes.

## Monitoring & Performance Targets

- **Feed latency**: The Fastify server logs per-request durations. Use
  [`autocannon`](https://github.com/mcollina/autocannon) to benchmark the feed
  endpoints and ensure the 95th percentile stays below 200 ms.

  ```bash
  npx autocannon http://localhost:4000/api/feed?limit=24
  ```

- **Thumbnail optimisation**: imgproxy automatically converts and resizes media
  served from the shared `/data` volume. Tune the `IMGPROXY_` environment
  variables in `.env` (quality, formats, cache TTL) to meet bandwidth targets.

- **Metrics collection**: Fastify logs include `durationMs`, which can be
  scraped into systems like Prometheus or Loki. Configure your log shipper to
  parse the structured JSON logs emitted by the API container. For deeper
  metrics, add `/metrics` endpoints or integrate with Prometheus Fastify
  plugins—hooks are already in place to capture per-request timings.

## Backups & Disaster Recovery

- **Media & sessions**: Back up the `data_root` and `sessions` volumes on a
  nightly basis. They contain the only copies of downloaded Instagram assets and
  authentication sessions.
- **Database**: Use `pg_dump` against the `db` container or your external
  PostgreSQL instance. Schedule dumps alongside the crawler interval to maintain
  a consistent snapshot.

## Troubleshooting

- **Session expired**: Remove the corresponding `.session` file from the
  `sessions` volume and restart the crawler. It will log in with the password
  provided via environment variables and persist a fresh session file.
- **Rate limiting**: Increase `CRAWL_INTERVAL_MINUTES` or reduce the number of
  accounts crawled per cycle to stay within Instagram's request budget.
- **Slow responses**: Use the Fastify logs to identify slow routes and consider
  enabling caching (`REDIS_URL`) or increasing Postgres resources.

## Next Steps

- Wire up Prometheus scraping and Grafana dashboards for live latency graphs.
- Implement admin-only APIs once Authentik integration is available.
- Automate crawler triggers from the admin panel via REST calls to the API
  service.
