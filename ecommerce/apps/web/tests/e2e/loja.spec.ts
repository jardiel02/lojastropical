import { expect, test } from "@playwright/test";

test("página inicial mostra cabeçalho, banners, departamentos e lojas sem rolagem lateral", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Lojas Tropical, página inicial" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Destaques da Lojas Tropical" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nossos departamentos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nossas lojas" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("busca encontra produtos ignorando acentos e permite filtrar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar produtos" }).fill("comoda");
  await page.getByRole("searchbox", { name: "Buscar produtos" }).press("Enter");
  await expect(page).toHaveURL(/\/busca\?q=comoda/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("comoda");
  await expect(page.getByRole("article").first()).toContainText(/Cômoda/);
  await page.goto("/busca?q=xyzinexistente");
  await expect(page.getByText("Nenhum produto encontrado")).toBeVisible();
});

test("departamento com subgrupo e breadcrumbs", async ({ page }) => {
  await page.goto("/departamento/guarda-roupas?sub=Casal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guarda-roupas: Casal");
  await expect(page.getByRole("navigation", { name: "Você está em" })).toContainText("Guarda-roupas");
});

test("produto: escolher cor, quantidade e adicionar ao carrinho com preço do servidor", async ({ page }) => {
  await page.goto("/produto/comoda-texas");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cômoda Moval Texas");
  await page.getByRole("button", { name: "Branco", exact: true }).click();
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await page.getByRole("button", { name: /Adicionar ao carrinho/ }).click();
  await page.getByRole("button", { name: "Ver carrinho" }).click();
  const cart = page.getByRole("dialog", { name: "Seu carrinho" });
  await expect(cart).toContainText("Cor: Branco");
  await expect(cart).toContainText("Subtotal à vista");
  const href = await cart.getByRole("link", { name: /Enviar pedido pelo WhatsApp/ }).getAttribute("href");
  expect(decodeURIComponent(href ?? "")).toContain("2x Cômoda Moval Texas (cor Branco)");
  // Carrinho persiste ao recarregar
  await page.reload();
  await expect(page.getByRole("button", { name: /Abrir carrinho, 2 itens/ })).toBeVisible();
});

test("links antigos com # levam para as novas páginas", async ({ page }) => {
  await page.goto("/#produto-moval-alasca~1");
  await expect(page).toHaveURL(/\/produto\/moval-alasca\?cor=1$/);
  await expect(page.getByText("Cor:").first()).toContainText("Freijó e Off White");
});

test("API do carrinho ignora preço enviado pelo navegador e recusa entrada inválida", async ({ request }) => {
  const ok = await request.post("/api/cart/quote", { data: { items: [{ slug: "comoda-texas", color: null, qty: 1, priceCents: 1 }] } });
  expect(ok.status()).toBe(200);
  const body = await ok.json();
  expect(body.lines[0].unitCashCents).toBeGreaterThan(100);
  const bad = await request.post("/api/cart/quote", { data: { items: [{ slug: "comoda-texas", color: null, qty: 999 }] } });
  expect(bad.status()).toBe(422);
  const notJson = await request.post("/api/cart/quote", { data: Buffer.from("{isso não é json"), headers: { "content-type": "application/json" } });
  expect(notJson.status()).toBe(400);
});

test("políticas migradas com links novos", async ({ page }) => {
  await page.goto("/politica-de-privacidade");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de Privacidade");
  await expect(page.locator('a[href$=".html"]')).toHaveCount(0);
});
