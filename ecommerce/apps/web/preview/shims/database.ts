// A prévia lê o catálogo do retrato JSON; o banco não existe no navegador.
export function getPrisma(): never {
  throw new Error("Sem banco na prévia");
}
export async function loadCatalogFromDatabase(): Promise<never> {
  throw new Error("Sem banco na prévia");
}
