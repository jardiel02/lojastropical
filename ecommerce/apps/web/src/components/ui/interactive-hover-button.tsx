import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botão com animação ao passar o mouse: o texto sai para a direita, uma bolinha cresce e
 * preenche o botão, e o texto volta com uma seta. Adaptado do "Interactive Hover Button"
 * para as cores da loja: largura pelo conteúdo (não fixa), ícone opcional, cor do
 * preenchimento configurável, e o mesmo efeito no foco pelo teclado. Quem pede menos
 * movimento no sistema não vê a animação. A bolinha fica na borda esquerda, fora do texto. Em celular (sem mouse) fica o botão normal.
 */
export const interactiveHoverClasses =
  "group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full font-bold whitespace-nowrap outline-offset-2";

type ContentProps = {
  text: ReactNode;
  icon?: ReactNode;
  /** Cor da bolinha que preenche o botão (ex.: "bg-sun"). */
  fillClassName?: string;
  /** Cor do texto depois de preenchido (ex.: "text-sun-foreground"). */
  hoverTextClassName?: string;
  /** Classes do texto (ex.: esconder no celular e deixar só o ícone). */
  textClassName?: string;
};

export function InteractiveHoverContent({ text, icon, fillClassName = "bg-primary", hoverTextClassName = "text-primary-foreground", textClassName }: ContentProps) {
  const motion = "transition-all duration-300 motion-reduce:transition-none";
  return (
    <>
      <span className={cn("relative z-20 inline-flex items-center gap-2 group-hover:translate-x-12 group-hover:opacity-0 group-focus-visible:translate-x-12 group-focus-visible:opacity-0", motion)}>
        {icon}
        <span className={textClassName}>{text}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 z-30 flex translate-x-12 items-center justify-center gap-1.5 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100",
          motion,
          hoverTextClassName,
        )}
      >
        <span className={textClassName}>{text}</span>
        <ArrowRight className="size-4 shrink-0" />
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute top-[calc(50%-3px)] left-[5px] z-10 size-1.5 rounded-lg group-hover:top-0 group-hover:left-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-focus-visible:top-0 group-focus-visible:left-0 group-focus-visible:h-full group-focus-visible:w-full group-focus-visible:scale-[1.8]",
          motion,
          fillClassName,
        )}
      />
    </>
  );
}

interface InteractiveHoverButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<ContentProps, "text"> {
  text?: string;
}

const InteractiveHoverButton = forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
  ({ text = "Button", icon, fillClassName, hoverTextClassName, textClassName, className, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(interactiveHoverClasses, "h-11 border bg-background px-4", className)} {...props}>
      <InteractiveHoverContent text={text} icon={icon} fillClassName={fillClassName} hoverTextClassName={hoverTextClassName} textClassName={textClassName} />
    </button>
  ),
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
