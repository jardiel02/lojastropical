"use client";

import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Painel lateral acessível (foco preso, Esc fecha, leitor de tela anuncia como diálogo). */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export function SheetContent({
  className,
  children,
  title,
  description,
  side = "right",
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { title: string; description?: string; side?: "right" | "left" }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-black/45 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-full max-w-[420px] flex-col bg-surface text-foreground shadow-[-10px_0_30px_rgb(0_0_0/.25)]",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          side === "right" ? "right-0" : "left-0",
          className,
        )}
        {...props}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <SheetPrimitive.Title className="font-display text-[26px] font-bold">{title}</SheetPrimitive.Title>
          <SheetPrimitive.Close className="grid size-[38px] place-items-center rounded-full bg-chip text-foreground" aria-label="Fechar">
            <X aria-hidden className="size-5" />
          </SheetPrimitive.Close>
        </header>
        <SheetPrimitive.Description className="sr-only">{description ?? title}</SheetPrimitive.Description>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
