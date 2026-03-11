import { buildNextIssueKey, normalizeProjectKey } from "@/lib/keys";

describe("key generation", () => {
  it("generates sequential issue keys for a team prefix", () => {
    const result = buildNextIssueKey("ENG", ["ENG-1", "ENG-2", "ENG-8", "OPS-3"]);
    expect(result).toBe("ENG-9");
  });

  it("starts at 1 when no existing issue key matches", () => {
    const result = buildNextIssueKey("ENG", ["OPS-1", "CORE-2"]);
    expect(result).toBe("ENG-1");
  });

  it("normalizes project keys to immutable uppercase slug format", () => {
    expect(normalizeProjectKey(" core platform v2 ")).toBe("CORE-PLATFORM-V2");
  });
});
