"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/features/auth/components/field";
import {
  inviteMemberAction,
  removeMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
  updateMemberRoleAction,
} from "@/features/workspaces/actions";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import type { Role } from "@/config/permissions";

type MemberRow = {
  id: string;
  userId: string;
  role: Role;
  readonly: boolean;
  email: string;
  name: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

export function TeamSettings({
  slug,
  currentUserId,
  currentRole,
  members,
  invitations,
}: {
  slug: string;
  currentUserId: string;
  currentRole: Role;
  members: MemberRow[];
  invitations: InvitationRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [planLimitMessage, setPlanLimitMessage] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "AGENT">("AGENT");

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {planLimitMessage ? (
        <UpgradePrompt slug={slug} description={planLimitMessage} />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Members</h2>
            <p className="text-muted-foreground text-sm">
              Roles control what teammates can change.
            </p>
          </div>
          <Button disabled={pending} onClick={() => setInviteOpen(true)}>
            Invite
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a teammate</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Field label="Email" htmlFor="invite-email">
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </Field>
                <Field label="Role" htmlFor="invite-role">
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => {
                      if (value === "ADMIN" || value === "AGENT") {
                        setInviteRole(value);
                      }
                    }}
                  >
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button
                  disabled={pending || !inviteEmail.trim()}
                  onClick={() => {
                    setError(null);
                    setPlanLimitMessage(null);
                    startTransition(async () => {
                      const result = await inviteMemberAction(slug, {
                        email: inviteEmail,
                        role: inviteRole,
                      });
                      if (!result.ok) {
                        if (result.error.code === "PLAN_LIMIT") {
                          setPlanLimitMessage(result.error.message);
                          setInviteOpen(false);
                          return;
                        }
                        setError(result.error.message);
                        return;
                      }
                      setInviteEmail("");
                      setInviteOpen(false);
                      refresh();
                    });
                  }}
                >
                  {pending ? "Sending…" : "Send invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="font-medium">
                    {member.name ?? member.email}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {member.email}
                    {member.readonly ? " · read-only" : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={member.role}
                    disabled={
                      pending ||
                      member.userId === currentUserId ||
                      (member.role === "OWNER" && currentRole !== "OWNER")
                    }
                    onValueChange={(value) => {
                      if (
                        value !== "OWNER" &&
                        value !== "ADMIN" &&
                        value !== "AGENT"
                      ) {
                        return;
                      }
                      setError(null);
                      startTransition(async () => {
                        const result = await updateMemberRoleAction(slug, {
                          membershipId: member.id,
                          role: value,
                        });
                        if (!result.ok) {
                          setError(result.error.message);
                          return;
                        }
                        refresh();
                      });
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      pending ||
                      member.userId === currentUserId ||
                      (member.role === "OWNER" && currentRole !== "OWNER")
                    }
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const result = await removeMemberAction(slug, {
                          membershipId: member.id,
                        });
                        if (!result.ok) {
                          setError(result.error.message);
                          return;
                        }
                        refresh();
                      });
                    }}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <p className="text-muted-foreground text-sm">
            Resend or revoke open invites.
          </p>
        </div>
        {invitations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending invitations.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setError(null);
                        startTransition(async () => {
                          const result = await resendInvitationAction(slug, {
                            invitationId: invite.id,
                          });
                          if (!result.ok) {
                            setError(result.error.message);
                            return;
                          }
                          refresh();
                        });
                      }}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setError(null);
                        startTransition(async () => {
                          const result = await revokeInvitationAction(slug, {
                            invitationId: invite.id,
                          });
                          if (!result.ok) {
                            setError(result.error.message);
                            return;
                          }
                          refresh();
                        });
                      }}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
