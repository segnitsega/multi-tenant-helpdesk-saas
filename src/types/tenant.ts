import type { Role } from "@/config/permissions";

export type TenantContext = {
  userId: string;
  workspaceId: string;
  membershipId: string;
  role: Role;
  readonly: boolean;
  slug: string;
};
