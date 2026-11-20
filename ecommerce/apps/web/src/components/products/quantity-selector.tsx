"use client";

export function QuantitySelector({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  const btn = "size-11 text-[22px] font-bold text-brand-text disabled:opacity-30";
  return (
    <div className="grid gap-2">
      <span className="text-[15px] font-bold" id="qtd-label">
        Quantidade
      </span>
      <div className="inline-flex items-center self-start justify-self-start overflow-hidden rounded-[10px] border-2 border-brand" role="group" aria-labelledby="qtd-label">
        <button type="button" className={btn} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Diminuir quantidade">
          −
        </button>
        <output aria-live="polite" className="min-w-10 text-center text-lg font-bold tabular-nums">
          {value}
        </output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Aumentar quantidade">
          +
        </button>
      </div>
    </div>
  );
}
