import { Role } from "@prisma/client";
import { issueAccessWhere, projectAccessWhere, teamAccessWhere } from "@/lib/access";

describe("access control guards", () => {
  it("grants unrestricted where-clauses to admins", () => {
    const user = { id: "admin-id", role: Role.ADMIN };

    expect(teamAccessWhere(user)).toEqual({});
    expect(projectAccessWhere(user)).toEqual({});
    expect(issueAccessWhere(user)).toEqual({});
  });

  it("scopes members to assigned teams/projects/issues", () => {
    const user = { id: "member-id", role: Role.MEMBER };

    expect(teamAccessWhere(user)).toEqual({
      members: {
        some: {
          userId: "member-id",
        },
      },
    });

    expect(projectAccessWhere(user)).toMatchObject({
      OR: [
        {
          members: {
            some: {
              userId: "member-id",
            },
          },
        },
        {
          leadUserId: "member-id",
        },
      ],
    });

    expect(issueAccessWhere(user)).toMatchObject({
      OR: expect.any(Array),
    });
  });
});
