import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, id, aside }: { eyebrow: string; title: string; id?: string; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={id} className="text-[clamp(28px,3.6vw,40px)]">
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}
