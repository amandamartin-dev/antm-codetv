import { validateDependencyEdge } from "@/lib/dependencies";

describe("dependency validation", () => {
  it("rejects self dependency", () => {
    expect(() => validateDependencyEdge("issue-1", "issue-1", false)).toThrow(
      "Issue cannot depend on itself",
    );
  });

  it("rejects duplicate dependencies", () => {
    expect(() => validateDependencyEdge("issue-1", "issue-2", true)).toThrow(
      "Dependency already exists",
    );
  });

  it("allows valid dependency edges", () => {
    expect(() => validateDependencyEdge("issue-1", "issue-2", false)).not.toThrow();
  });
});
