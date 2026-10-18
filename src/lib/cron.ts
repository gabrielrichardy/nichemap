import "server-only";
import { timingSafeEqual } from "node:crypto";

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Without a secret nobody is authorized.
export function isAuthorizedCron(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
