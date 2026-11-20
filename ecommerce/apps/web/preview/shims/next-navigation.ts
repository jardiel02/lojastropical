import { useSyncExternalStore } from "react";
import { locationStore, navigate } from "../location";

export class PreviewNotFound extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

export function notFound(): never {
  throw new PreviewNotFound();
}

export function usePathname(): string {
  return useSyncExternalStore(locationStore.subscribe, () => locationStore.get().pathname, () => "/");
}

const router = {
  push: (href: string) => navigate(href),
  replace: (href: string) => navigate(href),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => undefined,
  prefetch: () => undefined,
};

export function useRouter() {
  return router;
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(locationStore.subscribe, () => locationStore.get().search, () => "");
  return new URLSearchParams(search);
}
