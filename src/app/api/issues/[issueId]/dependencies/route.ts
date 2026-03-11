import { NextResponse } from "next/server";
import { assertIssueAccess } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateDependencyEdge } from "@/lib/dependencies";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { createDependencySchema } from "@/lib/validators";

type Params = Promise<{ issueId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const dependencies = await prisma.issueDependency.findMany({
      where: { issueId },
      include: {
        blockedByIssue: {
          select: { id: true, key: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: dependencies });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const parsed = await parseBody(request, createDependencySchema);
    if (parsed.error) {
      return parsed.error;
    }

    await assertIssueAccess(user, parsed.data.blockedByIssueId);

    const existing = await prisma.issueDependency.findUnique({
      where: {
        issueId_blockedByIssueId: {
          issueId,
          blockedByIssueId: parsed.data.blockedByIssueId,
        },
      },
      select: { id: true },
    });

    validateDependencyEdge(issueId, parsed.data.blockedByIssueId, Boolean(existing));

    const dependency = await prisma.issueDependency.create({
      data: {
        issueId,
        blockedByIssueId: parsed.data.blockedByIssueId,
      },
      include: {
        blockedByIssue: {
          select: {
            id: true,
            key: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({ data: dependency }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const parsed = await parseBody(request, createDependencySchema);
    if (parsed.error) {
      return parsed.error;
    }

    await prisma.issueDependency.delete({
      where: {
        issueId_blockedByIssueId: {
          issueId,
          blockedByIssueId: parsed.data.blockedByIssueId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
