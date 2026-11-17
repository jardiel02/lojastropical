export function whatsappLink(phoneDigits: string, message?: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
