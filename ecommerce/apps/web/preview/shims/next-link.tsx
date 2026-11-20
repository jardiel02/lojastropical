import type { AnchorHTMLAttributes, Ref } from "react";
/* eslint-disable @typescript-eslint/no-unused-vars -- props do Next descartadas de propósito */
import { hrefToHash } from "../location";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; search?: string };
  prefetch?: unknown;
  replace?: boolean;
  scroll?: boolean;
  ref?: Ref<HTMLAnchorElement>;
};

/** next/link da prévia: um <a> comum apontando para a rota em "#". */
export default function Link({ href, prefetch: _prefetch, replace: _replace, scroll: _scroll, ...rest }: Props) {
  const target = typeof href === "string" ? href : `${href.pathname ?? "/"}${href.search ?? ""}`;
  return <a href={hrefToHash(target)} {...rest} />;
}
