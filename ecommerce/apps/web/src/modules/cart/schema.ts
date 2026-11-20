import { z } from "zod";

export const MAX_QTY_PER_LINE = 20;
export const MAX_LINES = 50;

/** O navegador só informa O QUE quer comprar. Preço e disponibilidade são sempre do servidor. */
export const cartLineInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120),
  color: z.string().max(60).nullable(),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});
export const cartQuoteRequestSchema = z.object({
  items: z.array(cartLineInputSchema).max(MAX_LINES),
});
export type CartLineInput = z.infer<typeof cartLineInputSchema>;
