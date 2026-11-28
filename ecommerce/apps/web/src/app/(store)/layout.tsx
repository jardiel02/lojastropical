import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LegacyHashRedirect } from "@/components/layout/legacy-hash-redirect";
import { TopBar } from "@/components/layout/top-bar";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { navCategories } from "@/lib/nav";
import { catalog } from "@/modules/catalog";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, company] = await Promise.all([navCategories(), catalog.getCompany()]);
  return (
    <CartProvider>
      <a
        href="#conteudo"
        className="absolute -top-20 left-3 z-50 rounded-[10px] bg-sun px-4 py-2.5 font-bold text-sun-foreground focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <TopBar />
      <Header categories={categories} />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer company={company} />
      <WhatsAppFloat />
      <CartDrawer />
      <LegacyHashRedirect />
    </CartProvider>
  );
}
