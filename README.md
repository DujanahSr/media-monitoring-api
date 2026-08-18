# Media Monitoring API

A backend service for pulling, normalizing, storing, and analyzing media mentions. Built with Node.js, TypeScript, Express, and PostgreSQL (raw `pg` driver, no ORM).

## How to Run It

We will need Node.js (v20+) and a running PostgreSQL instance.

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd media-monitoring-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   - Create a new PostgreSQL database (e.g., `media_monitoring`).
   - Run the schema migration script located in `migrations/001_init.sql` against your new database to create the `mentions` table and its indexes.

4. **Environment Variables**
   - Create a `.env` file in the root of the project.
   - Add your database connection string:
     ```env
     PORT=3000
     DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database_name>
     ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000`.

## Schema & Modelling Reasoning

The schema is defined via a raw SQL migration file.
- **`id (UUID)`**: Used as the primary key instead of auto-incrementing integers to prevent ID enumeration and ensure global uniqueness if scaling horizontally.
- **`url (TEXT UNIQUE NOT NULL)`**: Enforced at the database level to act as our primary constraint for deduplication (Idempotency).
- **`published_at (TIMESTAMPTZ)`**: Stored as a timezone-aware timestamp to handle various input formats uniformly.
- **Indexes**: Added indexes on `source` and `published_at` to optimize the search and stats aggregation queries.

## Duplicate-Detection Rule & Why

**Rule:** A mention is considered a duplicate *if and only if it has the exact same `url`*. 

**Reasoning:** 
1. **Canonical Identity:** In the real world, a URL serves as the canonical address of a web resource. If an ingestion scraper hits the same URL twice (even if the `engagement` metric was updated, as seen in the sample data), it represents the same physical article.
2. **Syndication Handling:** The sample data contains articles with different URLs but identical news content (e.g., Bernama news syndicated to The Star and New Straits Times). In Media Monitoring, PR Analysts usually want to track *all* domains that published the press release. Using `url` ensures syndicated articles are correctly tracked as separate publications.
3. **Performance:** Enforcing a `UNIQUE` constraint on the URL at the database layer (`ON CONFLICT DO NOTHING`) is computationally cheap, robust, and highly scalable compared to hashing strings or doing text-similarity comparisons on the fly.

## Assumptions Made
- **Engagement numbers:** Commas in engagement values (e.g., `"1,204"`) are formatting artifacts and should be stripped and parsed as integers.
- **HTML tags:** The raw `<script>` and HTML tags in the content are considered dirty/malicious data and must be aggressively stripped out during the normalization phase to prevent XSS and ensure clean data storage.
- **Unix Timestamps:** Timestamps like `1786435200` are assumed to be in seconds, not milliseconds, and were converted accordingly.

## Trade-offs Knowingly Accepted
1. **No Content-Based Deduplication:** By relying solely on the URL for deduplication, we accept that two articles with identical text but different URLs (e.g., `mkn-1201` and `mkn-1202` from the sample) will be stored as two separate records. Given the lack of a clear directive on this, I chose the standard web canonicalization approach over expensive fuzzy-matching algorithms.
2. **Raw `pg` over ORM:** To strictly adhere to the "no ORM auto-magic" constraint, I used the native `pg` driver and wrote parameterized SQL queries manually. This trades off some developer velocity (writing raw queries takes longer) for absolute control over performance and schema transparency.

## Time Spent
Roughly **[ISI OLEH ANDA: contoh 4]** hours spent across **[ISI OLEH ANDA: contoh 2]** sessions.

## With another week, I would...
1. **Implement Redis Caching:** The `/stats` endpoint aggregates data. With a growing dataset, querying this constantly will degrade DB performance. I would add Redis to cache stats results and invalidate them periodically.
2. **Advanced Full-Text Search:** The current `ILIKE` search is fine for a small dataset but scales poorly. I would implement PostgreSQL's native `tsvector` and `tsquery` for highly performant, indexed full-text search across `title` and `content`.
3. **Automated CI/CD & Migration Runner:** Implement a proper migration tool (like `node-pg-migrate`) to apply SQL changes automatically instead of running `.sql` files manually, integrated into a GitHub Actions pipeline.
