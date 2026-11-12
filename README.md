# Lojas Tropical

Site-catálogo da Lojas Tropical ("Mania de preços baixos").

- `index.html`: o site inteiro (produtos, fichas técnicas, departamentos).
- `img/`: fotos dos produtos.
- `estoque.js`: preço e estoque, gerado automaticamente do Sólidus Smart a cada 2 horas pela ação `.github/workflows/estoque.yml`.
- O token da API fica só no segredo `SOLIDUS_TOKEN` do repositório (Settings → Secrets and variables → Actions). Nunca coloque o token em arquivos deste repositório.
