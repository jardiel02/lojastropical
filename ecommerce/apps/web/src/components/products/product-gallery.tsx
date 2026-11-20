"use client";

import Image from "next/image";
import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { Dialog } from "radix-ui";
import { imageSrc } from "@/lib/product-view";
import { cn } from "@/lib/utils";

/** Galeria com miniaturas e imagem principal ampliável. */
export function ProductGallery({ images, name, coverFirst }: { images: string[]; name: string; coverFirst: boolean }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)] ?? images[0]!;
  const fit = coverFirst && index === 0 ? "object-cover" : "object-contain";

  return (
    <div className="grid items-start gap-3.5 min-[861px]:grid-cols-[84px_minmax(0,1fr)]">
      {images.length > 1 && (
        <div className="no-scrollbar order-2 flex gap-2.5 overflow-x-auto min-[861px]:order-none min-[861px]:max-h-[560px] min-[861px]:flex-col min-[861px]:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "relative aspect-square w-[68px] flex-none rounded-[10px] border-2 bg-white p-1 min-[861px]:w-full",
                i === index ? "border-brand" : "border-line",
              )}
            >
              <Image src={imageSrc(img)} alt="" width={76} height={76} className="size-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-[var(--radius)] border border-line bg-white cursor-zoom-in",
              images.length < 2 && "min-[861px]:col-span-2",
            )}
            aria-label={`Ampliar foto ${index + 1} de ${name}`}
          >
            <Image
              src={imageSrc(current)}
              alt={`${name}, foto ${index + 1}`}
              fill
              priority
              sizes="(max-width: 860px) 100vw, 600px"
              className={fit}
            />
            <ZoomIn aria-hidden className="absolute right-3 bottom-3 size-6 text-muted-foreground" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <Dialog.Content className="fixed inset-2 z-50 grid place-items-center rounded-xl bg-white p-2 min-[861px]:inset-10">
            <Dialog.Title className="sr-only">{name}</Dialog.Title>
            <Dialog.Description className="sr-only">Foto ampliada</Dialog.Description>
            <div className="relative size-full">
              <Image src={imageSrc(current)} alt={`${name}, foto ${index + 1} ampliada`} fill sizes="100vw" className="object-contain" />
            </div>
            <Dialog.Close className="absolute top-3 right-3 rounded-full bg-chip px-4 py-2 font-bold text-[#231a18]">Fechar</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
