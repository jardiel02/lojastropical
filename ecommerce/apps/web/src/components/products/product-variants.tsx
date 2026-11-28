"use client";

import { cn } from "@/lib/utils";

export function ProductVariants({
  colors,
  selected,
  onSelect,
}: {
  colors: { name: string; css: string }[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  if (!colors.length) return null;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[15px] font-bold">
        Cor: <span className="font-medium text-muted-foreground">{colors[selected]?.name}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c, i) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={i === selected}
            onClick={() => onSelect(i)}
            className={cn(
              "inline-flex items-center rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold",
              i === selected ? "border-brand bg-chip" : "border-line bg-surface",
            )}
          >
            <span aria-hidden className="mr-1.5 inline-block size-4 rounded-full shadow-[0_0_0_1px_#b9aca7]" style={{ background: c.css }} />
            {c.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
