import "server-only";
import { z } from "zod";

/** Feed público do Instagram da loja via Behold (mesmo feed do site original). */
const FEED_URL = "https://feeds.behold.so/NozZDJuPxZmzuThXTKHs";
const MAX_POSTS = 6;

const feedSchema = z.object({
  username: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  followersCount: z.number().optional(),
  posts: z
    .array(
      z.object({
        permalink: z.string().url(),
        mediaType: z.string().optional(),
        mediaUrl: z.string().optional(),
        prunedCaption: z.string().optional(),
        caption: z.string().optional(),
        sizes: z.record(z.string(), z.object({ mediaUrl: z.string().optional() }).passthrough()).optional(),
      }),
    )
    .default([]),
});

export type InstagramPost = { link: string; type: string; image: string; caption: string };
export type InstagramFeed = { username: string; picture: string | null; followers: number | null; posts: InstagramPost[] };

/** Atualiza no máximo 1x por dia (economiza as visualizações do plano grátis do Behold). Falha = seção oculta. */
export async function getInstagramFeed(): Promise<InstagramFeed | null> {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 60 * 60 * 24 }, headers: { "User-Agent": "LojasTropicalSite/2.0" } });
    if (!res.ok) return null;
    const feed = feedSchema.parse(await res.json());
    const posts = feed.posts
      .slice(0, MAX_POSTS)
      .map((p) => ({
        link: p.permalink,
        type: p.mediaType ?? "IMAGE",
        image: p.sizes?.medium?.mediaUrl ?? p.sizes?.small?.mediaUrl ?? p.sizes?.large?.mediaUrl ?? p.mediaUrl ?? "",
        caption: (p.prunedCaption ?? p.caption ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
      }))
      .filter((p) => p.image.startsWith("https://"));
    if (!posts.length) return null;
    return {
      username: feed.username ?? "lojastropicaloficial",
      picture: feed.profilePictureUrl ?? null,
      followers: feed.followersCount ?? null,
      posts,
    };
  } catch {
    return null;
  }
}
