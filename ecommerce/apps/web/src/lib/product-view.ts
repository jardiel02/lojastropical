import { isOutOfStock, type Product } from "@lojas-tropical/shared";

/** Fotos da galeria para a cor escolhida (mesma regra do site original). */
export function imagesForColor(p: Product, colorIndex: number | null): string[] {
  if (colorIndex === null || !p.colors[colorIndex]) return p.images;
  const colorImage = p.colors[colorIndex].image;
  if (colorImage.startsWith("v")) {
    // fotos separadas por cor: v<código>-<cor>-<n>.jpg
    const base = colorImage.replace(/-\d+\.jpg$/, "");
    const same = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+\\.jpg$`);
    return [colorImage, ...p.images.filter((f) => f !== colorImage && same.test(f))];
  }
  return [colorImage, ...p.images.filter((f) => f !== colorImage && !p.colors.some((c) => c.image === f))];
}

export function colorCss(name: string, hex: Record<string, string>): string {
  const parts = name.split(/ e |\//).map((n) => hex[n.trim()] ?? "#cccccc");
  return parts.length > 1 ? `linear-gradient(135deg, ${parts[0]} 50%, ${parts[1]} 50%)` : (parts[0] ?? "#cccccc");
}

/** Ficha técnica exibida: marca, ficha do produto, cores e código (como no site original). */
export function specsTable(p: Product): [string, string][] {
  const rows: [string, string][] = [["Marca", p.brand], ...Object.entries(p.specs)];
  if (p.colors.length && !("Cor" in p.specs) && !("Cores" in p.specs)) {
    rows.push(["Cores disponíveis", p.colors.map((c) => c.name).join(", ")]);
  }
  if (p.erpCode) rows.push(["Código do produto", p.erpCode]);
  return rows;
}

export type Availability = "in-stock" | "out-of-stock" | "unknown";
export function availability(p: Product): Availability {
  if (p.stockQuantity === null) return "unknown";
  return isOutOfStock(p) ? "out-of-stock" : "in-stock";
}

export const imageSrc = (file: string) => `/img/${file}`;
