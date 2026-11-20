import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap grid min-h-[60vh] place-content-center gap-4 py-16 text-center">
      <span className="eyebrow">Página não encontrada</span>
      <h1 className="text-4xl">Não encontramos o que você procurava</h1>
      <p className="text-muted-foreground">O produto pode ter saído do catálogo ou o endereço mudou.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-[10px] bg-brand px-5 py-3 font-bold text-white">
          Ir para o início
        </Link>
        <Link href="/busca" className="rounded-[10px] bg-chip px-5 py-3 font-bold">
          Ver todos os produtos
        </Link>
      </div>
    </main>
  );
}
