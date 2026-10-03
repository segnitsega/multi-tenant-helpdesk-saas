import { describe, expect, it } from "vitest";
import { PERMISSIONS, type Permission, type Role } from "@/config/permissions";
import { can } from "@/config/can";

const roles: Role[] = ["OWNER", "ADMIN", "AGENT"];
const permissions = Object.keys(PERMISSIONS) as Permission[];

describe("permission matrix", () => {
  for (const permission of permissions) {
    for (const role of roles) {
      const allowed = (PERMISSIONS[permission] as readonly Role[]).includes(
        role,
      );

      it(`${role} ${allowed ? "can" : "cannot"} ${permission}`, () => {
        expect(can(role, permission)).toBe(allowed);
      });

      it(`readonly ${role} cannot ${permission} except ticket.view`, () => {
        const expected = permission === "ticket.view" && allowed;
        expect(can(role, permission, true)).toBe(expected);
      });
    }
  }
});
