// tests/normalize.test.ts
import { describe, it, expect } from "vitest";
import { normalizeMention } from "../src/services/normalize";
import { RawMention } from "../src/types/mention";

describe("Data Normalization Service", () => {
  it("should capitalize the first letter of the source and trim whitespace", () => {
    const raw: RawMention = {
      source: "  thestar   ",
      content: "test",
      url: "http://test.com",
    };
    const result = normalizeMention(raw);
    expect(result.source).toBe("Thestar");
  });

  it("should aggressively strip HTML tags to prevent XSS", () => {
    const raw: RawMention = {
      source: "News",
      content:
        '<p>Banjir di <b>Jakarta</b></p> <script>alert("Hacked!")</script>',
      url: "http://test.com",
    };
    const result = normalizeMention(raw);
    expect(result.content).toBe('Banjir di Jakarta alert("Hacked!")');
  });

  it("should parse comma-separated engagement strings into pure integers", () => {
    const raw: RawMention = {
      source: "News",
      content: "test",
      url: "http://test.com",
      engagement: "1,204",
    };
    const result = normalizeMention(raw);
    expect(result.engagement).toBe(1204);
  });

  it("should parse unix timestamps into valid Date objects", () => {
    const raw: RawMention = {
      source: "News",
      content: "test",
      url: "http://test.com",
      published_at: 1786435200,
    };
    const result = normalizeMention(raw);
    expect(result.published_at?.toISOString()).toContain("2026-08-11");
  });
});
