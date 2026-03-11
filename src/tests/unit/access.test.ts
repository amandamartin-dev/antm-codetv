import { issueAccessWhere, projectAccessWhere, teamAccessWhere } from "@/lib/access";

describe("access control guards", () => {
  it("grants unrestricted where-clauses to all users", () => {
    const user = { id: "user-id", role: "MEMBER" as const };

    expect(teamAccessWhere(user)).toEqual({});
    expect(projectAccessWhere(user)).toEqual({});
    expect(issueAccessWhere(user)).toEqual({});
  });
});
