import { IssuePriority, IssueStatus, ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { normalizeProjectKey } from "@/lib/keys";

const cuidSchema = z.string().cuid();

export const createTeamSchema = z.object({
  key: z.string().min(2).max(12).transform((value) => value.trim().toUpperCase()),
  name: z.string().min(2).max(120),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(120),
});

export const addMemberSchema = z
  .object({
    userId: cuidSchema.optional(),
    clerkUserId: z.string().min(1).optional(),
  })
  .refine((value) => value.userId || value.clerkUserId, {
    message: "userId or clerkUserId is required",
  });

export const createProjectSchema = z.object({
  key: z.string().min(2).max(64).transform(normalizeProjectKey),
  name: z.string().min(2).max(200),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  leadUserId: cuidSchema.optional().nullable(),
  memberIds: z.array(cuidSchema).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  leadUserId: cuidSchema.optional().nullable(),
});

export const createReleaseSchema = z.object({
  name: z.string().min(1).max(120),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export const updateReleaseSchema = createReleaseSchema.extend({
  releaseId: cuidSchema,
});

export const deleteReleaseSchema = z.object({
  releaseId: cuidSchema,
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(64).transform((value) => value.trim().toLowerCase()),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(64).transform((value) => value.trim().toLowerCase()).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const createIssueSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(IssueStatus).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  teamId: cuidSchema,
  projectId: cuidSchema.optional().nullable(),
  assigneeUserId: cuidSchema.optional().nullable(),
  assigneeClerkUserId: z.string().min(1).optional().nullable(),
  labelId: cuidSchema.optional().nullable(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(IssueStatus).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  teamId: cuidSchema.optional(),
  projectId: cuidSchema.optional().nullable(),
  assigneeUserId: cuidSchema.optional().nullable(),
  assigneeClerkUserId: z.string().min(1).optional().nullable(),
  labelId: cuidSchema.optional().nullable(),
});

export const createDependencySchema = z.object({
  blockedByIssueId: cuidSchema,
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

export const updateCommentSchema = z.object({
  commentId: cuidSchema,
  body: z.string().min(1).max(10000),
});

export const deleteCommentSchema = z.object({
  commentId: cuidSchema,
});

export const notificationPatchSchema = z.object({
  action: z.enum(["read", "unread", "all-read"]),
  notificationId: cuidSchema.optional(),
});
