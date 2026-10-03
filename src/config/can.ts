import { PERMISSIONS, type Permission, type Role } from "@/config/permissions";

export function can(
  role: Role,
  permission: Permission,
  readonly = false,
): boolean {
  if (readonly && permission !== "ticket.view") return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
