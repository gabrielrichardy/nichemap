import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { getApifyToken } from "./env";
import type { RawBusinessDiscovery, RawMedia } from "./graph";
import { logger } from "./logger";

// Unofficial Instagram source: Apify's public profile scraper, used only for opted-in accounts.
const ENDPOINT = "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items";
const CACHE_SECONDS = 21600; // 6 h per username

export class PrivateProfileError extends Error {
  constructor() {
    super("Perfil privado.");
    this.name = "PrivateProfileError";
  }
}

export class ProfileNotFoundError extends Error {
  constructor() {
    super("Perfil não encontrado.");
    this.name = "ProfileNotFoundError";
  }
}

const MEDIA_TYPES = { Image: "IMAGE", Video: "VIDEO", Sidecar: "CAROUSEL_ALBUM" } as const;
// Apify sends null for missing values; RawMedia/RawBusinessDiscovery use undefined.
const optional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((v) => v ?? undefined);

const postSchema = z.object({
  id: z.string(),
  type: z.enum(["Image", "Video", "Sidecar"]).catch("Image"),
  caption: optional(z.string()),
  likesCount: optional(z.number()),
  commentsCount: optional(z.number()),
  timestamp: z.string(),
  url: optional(z.string()),
});

const itemSchema = z.object({
  username: z.string(),
  fullName: optional(z.string()),
  biography: optional(z.string()),
  profilePicUrl: optional(z.string()),
  followersCount: z.number(),
  postsCount: z.number(),
  private: z.boolean().nullish(),
  latestPosts: z.array(postSchema).nullish(),
});

function toRaw(item: z.infer<typeof itemSchema>): RawBusinessDiscovery {
  const media: RawMedia[] = (item.latestPosts ?? []).map((p) => ({
    id: p.id,
    caption: p.caption,
    media_type: MEDIA_TYPES[p.type],
    like_count: p.likesCount,
    comments_count: p.commentsCount,
    timestamp: p.timestamp,
    permalink: p.url,
  }));
  return {
    username: item.username,
    name: item.fullName,
    biography: item.biography,
    profile_picture_url: item.profilePicUrl,
    followers_count: item.followersCount,
    media_count: item.postsCount,
    media: { data: media },
  };
}

// Uncached call. `username` must already be validated. The token goes only in the header.
export async function fetchApifyProfile(username: string, token: string): Promise<RawBusinessDiscovery> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    logger.warn({ target: username, status: res.status }, "Apify profile request failed");
    throw new Error(`Apify respondeu ${res.status}`);
  }
  const items = z.array(z.unknown()).safeParse(await res.json());
  if (items.success && items.data.length === 0) throw new ProfileNotFoundError();
  const item = items.success ? itemSchema.safeParse(items.data[0]) : null;
  if (!item?.success) {
    logger.warn({ target: username, status: res.status }, "Apify profile response malformed");
    throw new Error("Resposta inesperada do Apify.");
  }
  if (item.data.private) throw new PrivateProfileError();
  return toRaw(item.data);
}

// The token is read inside so it never becomes part of the cache key. Thrown errors are not cached.
const cachedProfile = unstable_cache(
  async (username: string) => {
    const token = getApifyToken();
    if (!token) throw new Error("Fonte não oficial desligada.");
    return fetchApifyProfile(username, token);
  },
  ["apify-profile"],
  { revalidate: CACHE_SECONDS },
);

export async function getApifyProfile(username: string): Promise<RawBusinessDiscovery> {
  if (!getApifyToken()) throw new Error("Fonte não oficial desligada.");
  return cachedProfile(username);
}
