import { previewData } from "../data";

/** Retrato do feed do Instagram do dia do build, com as fotos publicadas junto da prévia. */
export async function getInstagramFeed() {
  return previewData.instagram;
}
