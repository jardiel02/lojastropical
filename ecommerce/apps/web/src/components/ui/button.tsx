import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[filter,background-color,color] disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:brightness-110",
        buy: "bg-buy text-white hover:brightness-110 uppercase tracking-[.08em]",
        outlineBuy: "border-2 border-buy-text text-buy-text bg-transparent hover:bg-buy/10 uppercase tracking-[.08em]",
        sun: "bg-sun text-sun-foreground hover:bg-white",
        whatsapp: "bg-whatsapp text-whatsapp-foreground hover:brightness-105",
        ghostLight: "border-2 border-white/55 text-white bg-transparent hover:bg-white/12",
        subtle: "bg-chip text-foreground hover:brightness-95",
        outline: "border-2 border-foreground bg-transparent text-foreground hover:bg-chip",
        link: "text-brand-text underline-offset-4 hover:underline p-0",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[10px]",
        md: "h-11 px-4 text-[15px] rounded-[10px]",
        lg: "h-14 px-5 text-[17px] rounded-xl",
        pill: "h-11 px-4 rounded-full",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
