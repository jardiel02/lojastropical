import type { Availability } from "@/lib/product-view";

export function ProductAvailability({ status }: { status: Availability }) {
  if (status === "unknown") return null;
  return status === "in-stock" ? (
    <span className="font-bold text-buy-text">Em estoque</span>
  ) : (
    <span className="text-brand-text">
      <b>Esgotado</b> no momento
    </span>
  );
}
