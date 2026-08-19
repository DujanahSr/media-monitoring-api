# Media Monitoring API

A backend service for pulling, normalizing, storing, and analyzing media mentions. Built with Node.js, TypeScript, Express, and PostgreSQL (raw `pg` driver, no ORM).

## Setup & Running

### Using Docker (Recommended)

If you have Docker installed, the easiest way to run the service and database is via Docker Compose:

```bash
docker-compose up -d
```

This spins up PostgreSQL, automatically executes `migrations/001_init.sql`, and binds the database to port `5433`.

Then, create a `.env` file in the root directory:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:media123@127.0.0.1:5433/media_monitoring
```

Install dependencies and start the server:

```bash
npm install
npm run dev
```

### Local Setup (Without Docker)

1. Create a local PostgreSQL database.
2. Run the `migrations/001_init.sql` script against it.
3. Create a `.env` file pointing to your local database (adjust credentials as needed):
   ```env
   PORT=3000
   DATABASE_URL=postgresql://<user>:<password>@127.0.0.1:5432/<db_name>
   ```
4. Run `npm install` and `npm run dev`.

### Dashboard

A simple, read-only UI is available at `http://localhost:3000` to view the `/stats` endpoint charts. No frontend framework is used (vanilla HTML/JS + Chart.js).

## API Endpoints

1. **`POST /internal/mentions/bulk`**
   - **Description**: Bulk ingest an array of raw mention objects.
   - **Idempotency**: Uses the `url` field to silently ignore duplicates.
2. **`GET /mentions`**
   - **Description**: Search and paginate mentions.
   - **Query Params**: `q` (search title/content), `source` (exact match), `from`/`to` (ISO dates), `page`, `limit`.
3. **`GET /mentions/stats`**
   - **Description**: Aggregate mentions.
   - **Query Params**: `group_by=source` or `group_by=day`.

## Schema & Modelling Reasoning

The schema is defined in `migrations/001_init.sql`.

- **`id` (UUID)**: Used as the primary key instead of auto-incrementing integers to prevent enumeration and ensure uniqueness.
- **`url` (TEXT UNIQUE NOT NULL)**: Acts as the primary constraint for deduplication.
- **`published_at` (TIMESTAMPTZ)**: Stored as a timezone-aware timestamp to uniformly handle various input formats.
- **Indexes**: Added on `source` and `published_at` to optimize search and aggregations.

## Duplicate-Detection Rule

**Rule:** A mention is considered a duplicate if it shares the exact same `url`.

**Reasoning:**
A URL is the canonical address of a web resource. If the scraper hits the same URL twice, it's the same article. Syndicated articles (identical content across different domains like Bernama and The Star) are intentionally treated as separate mentions, as PR analysts typically track reach across multiple publishers. Enforcing a `UNIQUE` constraint on the URL at the database layer is also computationally cheaper than doing text-similarity comparisons on the payload.

## Search & Pagination

The `/mentions` search endpoint implements a stable sort order:

- **Primary Sort:** `published_at DESC NULLS LAST` (newest first, nulls at the bottom).
- **Secondary Sort:** `id DESC` (tie-breaker for articles published at the exact same second, preventing pagination jumps).

## Assumptions & Defensive Programming

- **Engagement numbers:** Commas in values like `"1,204"` are stripped and parsed as integers.
- **HTML tags:** Raw HTML in the content payload is stripped during normalization to prevent XSS.
- **Timezone handling:** For `/mentions/stats?group_by=day`, dates are grouped using PostgreSQL's `TO_CHAR(published_at, 'YYYY-MM-DD')` to prevent the Node.js driver from converting dates to local timezone objects and shifting them a day backward.
- **Pagination:** Query parameters are strictly validated to prevent `NaN` crashes or negative offsets.

## Testing Strategy

Tests are strictly focused on the data normalization service (`tests/normalize.test.ts`). Testing database I/O on standard CRUD endpoints provides low ROI compared to testing the pure functions responsible for sanitizing data, parsing dates, and neutralizing XSS threats (the riskiest logic).

## Trade-offs

1. **No Content-Based Deduplication:** Relying solely on the URL means identical text on different URLs is stored multiple times. I chose the standard web canonicalization approach over expensive fuzzy-matching algorithms.
2. **Raw `pg` over ORM:** To adhere strictly to the "no ORM auto-magic" constraint, I used the native `pg` driver with parameterized queries. This trades developer velocity for absolute control over performance and transparency.

## Time Spent

Roughly **6** hours spent across **3** sessions.

## With another week, I would...

1. **Implement Redis Caching:** Cache the `/stats` aggregation results and invalidate them periodically to reduce database load.
2. **Advanced Full-Text Search:** Replace `ILIKE` with PostgreSQL's native `tsvector` and `tsquery` for performant, indexed full-text search.
3. **Automated Migrations:** Integrate a tool like `node-pg-migrate` to apply schema changes automatically rather than executing raw SQL files manually.
