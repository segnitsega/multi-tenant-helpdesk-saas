import "server-only";
import { systemDb } from "@/server/db/system";
import { hashPassword } from "./password";
import { generateToken, hashToken } from "./tokens";

export async function findUserByEmail(email: string) {
  return systemDb.orm.public.User.where({
    email: email.trim().toLowerCase(),
  }).first();
}

export async function createUserWithPassword(input: {
  email: string;
  name: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  return systemDb.orm.public.User.create({
    email: input.email.trim().toLowerCase(),
    name: input.name,
    passwordHash,
  });
}

export async function createPasswordResetForEmail(email: string) {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) return null;

  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await systemDb.orm.public.PasswordResetToken.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return { user, token };
}

export async function consumePasswordResetToken(input: {
  token: string;
  password: string;
}) {
  const tokenHash = hashToken(input.token);
  const record = await systemDb.orm.public.PasswordResetToken.where({
    tokenHash,
  }).first();

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const user = await systemDb.orm.public.User.where({
    id: record.userId,
  }).first();
  if (!user) return null;

  const passwordHash = await hashPassword(input.password);
  await systemDb.orm.public.User.where({ id: user.id }).update({
    passwordHash,
  });
  await systemDb.orm.public.PasswordResetToken.where({ id: record.id }).update({
    usedAt: new Date(),
  });

  return user;
}
