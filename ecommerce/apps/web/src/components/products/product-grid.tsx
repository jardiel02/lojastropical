import type { CardProduct } from "@/lib/card";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, empty }: { products: CardProduct[]; empty?: React.ReactNode }) {
  if (!products.length) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-line p-10 text-center text-muted-foreground">{empty}</div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 min-[481px]:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] min-[481px]:gap-[18px]">
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
