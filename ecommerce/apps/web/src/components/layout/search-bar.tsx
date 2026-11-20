/** Busca: formulário GET comum, funciona mesmo sem JavaScript. */
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form
      action="/busca"
      role="search"
      className="order-3 flex min-w-0 flex-[1_1_280px] overflow-hidden rounded-full bg-white focus-within:outline-3 focus-within:outline-sun min-[861px]:order-2"
    >
      <label htmlFor="busca-q" className="sr-only">
        Buscar produtos
      </label>
      <input
        id="busca-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="O que você procura?"
        maxLength={80}
        enterKeyHint="search"
        className="min-w-0 flex-1 border-0 bg-transparent px-[18px] py-3 text-[#231a18] outline-none max-[860px]:px-3.5 max-[860px]:py-2.5"
      />
      <button type="submit" className="bg-sun px-5 font-bold text-sun-foreground">
        Buscar
      </button>
    </form>
  );
}
