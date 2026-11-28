/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars -- a prévia não tem o otimizador do Next */
import type { CSSProperties, ImgHTMLAttributes } from "react";

/** /img/foto.jpg → img/foto.webp (cópia otimizada publicada junto com a prévia). */
export function previewImage(src: string): string {
  if (!src.startsWith("/img/")) return src;
  const file = src.slice("/img/".length);
  return /\.svg$/i.test(file) ? `img/${file}` : `img/${file.replace(/\.[a-z0-9]+$/i, "")}.webp`;
}

type Src = string | { src: string };
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: Src;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  unoptimized?: boolean;
};

const srcOf = (s: Src) => previewImage(typeof s === "string" ? s : s.src);

export default function Image({ src, fill, priority, quality: _q, placeholder: _p, unoptimized: _u, style, loading, width, height, ...rest }: Props) {
  const fillStyle: CSSProperties | undefined = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style;
  return (
    <img
      src={srcOf(src)}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding="async"
      style={fillStyle}
      {...rest}
    />
  );
}

export function getImageProps(p: Props) {
  const url = srcOf(p.src);
  return {
    props: {
      src: url,
      srcSet: url,
      alt: p.alt,
      width: p.width,
      height: p.height,
      loading: p.priority ? undefined : p.loading,
      decoding: "async" as const,
    },
  };
}
