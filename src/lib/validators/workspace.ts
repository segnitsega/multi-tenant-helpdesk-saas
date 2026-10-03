import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .max(48, "Slug is too long")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens",
      ),
  );

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: slugSchema,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["ADMIN", "AGENT"]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "AGENT"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const membershipIdSchema = z.object({
  membershipId: z.string().uuid(),
});

export const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});
