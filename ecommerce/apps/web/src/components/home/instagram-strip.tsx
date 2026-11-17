import { Layers, Play } from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";
import type { InstagramFeed } from "@/modules/instagram";

/** Fileira de posts passando sozinha; pausa com mouse/foco/toque; sem animação para quem pediu menos movimento. */
export function InstagramStrip({ feed }: { feed: InstagramFeed }) {
  const profile = `https://www.instagram.com/${feed.username}/`;
  const item = (p: InstagramFeed["posts"][number], copy: boolean, i: number) => (
    <li key={`${copy ? "c" : "o"}-${i}`} aria-hidden={copy || undefined} className="w-[150px] flex-none min-[861px]:w-[220px] motion-reduce:[&[aria-hidden]]:hidden">
      <a
        href={p.link}
        target="_blank"
        rel="noopener"
        tabIndex={copy ? -1 : undefined}
        aria-label={`Abrir post no Instagram${p.caption ? `: ${p.caption}` : ""}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-[10px] bg-chip"
      >
        {/* Imagens do Instagram: URLs temporárias da CDN deles, sem otimização local */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-250 hover:scale-[1.04] motion-reduce:transition-none" />
        {p.type === "VIDEO" && <Play aria-hidden className="absolute top-2 right-2 size-[22px] fill-white text-white drop-shadow" />}
        {p.type === "CAROUSEL_ALBUM" && <Layers aria-hidden className="absolute top-2 right-2 size-[22px] text-white drop-shadow" />}
      </a>
    </li>
  );
  return (
    <section className="border-y border-line bg-surface py-11" aria-labelledby="ig-titulo">
      <div className="wrap">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3.5">
          <a href={profile} target="_blank" rel="noopener" className="flex items-center gap-3.5">
            <span className="block size-16 flex-none rounded-full bg-[linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)] p-[3px]">
              {feed.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={feed.picture} alt="" width={64} height={64} className="size-full rounded-full border-[3px] border-surface bg-surface object-cover" />
              ) : null}
            </span>
            <span>
              <b className="block text-[clamp(18px,2.2vw,22px)]">@{feed.username}</b>
              <small className="block text-sm text-muted-foreground">
                {feed.followers ? `${feed.followers.toLocaleString("pt-BR")} seguidores` : "Instagram da Lojas Tropical"}
              </small>
            </span>
          </a>
          <a
            href={profile}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(45deg,#f09433,#dc2743_50%,#bc1888)] px-[18px] py-[11px] font-bold text-white"
          >
            <InstagramIcon className="size-[18px]" />
            Seguir no Instagram
          </a>
        </div>
        <h2 id="ig-titulo" className="sr-only">
          Últimas postagens no Instagram
        </h2>
        <div className="group overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
          <ul
            className="flex w-max gap-2 animate-[ig-passa_var(--ig-tempo)_linear_infinite] group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] active:[animation-play-state:paused] motion-reduce:animate-none min-[861px]:gap-3"
            style={{ "--ig-tempo": `${Math.max(24, feed.posts.length * 7)}s` } as React.CSSProperties}
          >
            {feed.posts.map((p, i) => item(p, false, i))}
            {feed.posts.map((p, i) => item(p, true, i))}
          </ul>
        </div>
      </div>
    </section>
  );
}
