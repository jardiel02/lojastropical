"""Diagnóstico dos tokens do Sólidus (um por loja). Só LEITURA: consulta estoque de uma
amostra de produtos com cada token e mostra, sem expor os tokens, quais funcionam, quanto
cada um devolve e se dois tokens trazem os mesmos números (mesma loja ou total somado)."""
import json, os, time, urllib.parse, urllib.request
from collections import Counter

BASE = "https://smart.sgisistemas.com.br/api_produto/tropical/consultas/"
LOJAS = ["MATRIZ", "AVENIDA", "TIMBIRAS", "PIO_XII", "DOM_PEDRO", "GONCALVES_DIAS", "COROATA", "ALTO_ALEGRE"]
catalogo = json.load(open("packages/database/data/legacy-catalog.json", encoding="utf-8"))
codigos = [p["erpCode"] for p in catalogo["products"] if p["erpCode"]][:30]


def estoques(token, codigo):
    url = f"{BASE}estoques?token={urllib.parse.quote(token)}&codigo={urllib.parse.quote(codigo)}"
    req = urllib.request.Request(url, headers={"User-Agent": "LojasTropicalSite/2.0"})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise RuntimeError(f"recusado (HTTP {e.code})") from None
            err = f"HTTP {e.code}"
        except Exception as e:  # noqa: BLE001
            err = type(e).__name__
        time.sleep(2 * (i + 1))
    raise RuntimeError(err)


tokens = [("SOLIDUS_TOKEN (atual)", os.environ.get("SOLIDUS_TOKEN", "").strip())]
tokens += [(f"SOLIDUS_TOKEN_{l}", os.environ.get(f"SOLIDUS_TOKEN_{l}", "").strip()) for l in LOJAS]

linhas, assinaturas, campos = [], {}, Counter()
locais = {}
for nome, token in tokens:
    if not token:
        linhas.append(f"| {nome} | não cadastrado | | | |")
        continue
    try:
        qtds, lugar = [], Counter()
        for c in codigos:
            regs = [e for e in estoques(token, c).get("estoques", []) if str(e.get("codigo")) == c]
            for e in regs:
                campos.update(e.keys())
                for k, v in e.items():
                    if any(p in k.lower() for p in ("empresa", "filial", "loja", "deposito", "unidade", "local")):
                        lugar[f"{k}={v}"] += 1
            qtds.append(round(sum(float(e.get("quantidade_disponivel", 0)) for e in regs)))
        assinaturas[nome] = tuple(qtds)
        locais[nome] = ", ".join(f"{k} ({n})" for k, n in lugar.most_common(4)) or "-"
        linhas.append(f"| {nome} | ok | {sum(1 for q in qtds if q > 0)} de {len(codigos)} | {sum(qtds)} | {locais[nome]} |")
    except RuntimeError as e:
        linhas.append(f"| {nome} | erro: {e} | | | |")

iguais = []
nomes = list(assinaturas)
for i, a in enumerate(nomes):
    for b in nomes[i + 1:]:
        if assinaturas[a] == assinaturas[b]:
            iguais.append(f"- {a} e {b} devolvem exatamente os mesmos números")

saida = ["## Tokens do Sólidus (amostra de %d produtos)" % len(codigos), "",
         "| Segredo | Situação | Produtos com estoque | Unidades | Loja/depósito informado |", "|---|---|---|---|---|", *linhas, "",
         "### Comparação", *(iguais or ["- Nenhum par de tokens devolve números idênticos"]), "",
         "### Campos que a API devolve em cada estoque", ", ".join(sorted(campos)) or "-"]
texto = "\n".join(saida)
print(texto)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write(texto + "\n")
