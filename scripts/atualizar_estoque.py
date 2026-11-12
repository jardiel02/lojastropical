"""Puxa estoque e precos do Solidus Smart e gera estoque.js.
Roda no GitHub Actions; o token vem do segredo SOLIDUS_TOKEN (nunca fica no repositorio)."""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = "https://smart.sgisistemas.com.br/api_produto/tropical/consultas/"
TOKEN = os.environ["SOLIDUS_TOKEN"].strip()
AGORA = datetime.now(ZoneInfo("America/Fortaleza"))
HOJE = AGORA.date()


def api(rota, codigo):
    url = f"{BASE}{rota}?token={urllib.parse.quote(TOKEN)}&codigo={urllib.parse.quote(codigo)}"
    req = urllib.request.Request(url, headers={"User-Agent": "LojasTropicalSite/1.0"})
    for i in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if i == 3:
                raise RuntimeError(f"{rota} {codigo}: {type(e).__name__}") from None
            time.sleep(2 * i)


def data(s):
    return datetime.strptime(s, "%d/%m/%Y").date()


html = open("index.html", encoding="utf-8").read()
codigos = sorted(set(re.findall(r'cod:\s*"(\d+)"', html)), key=int)
produtos = {}
for c in codigos:
    qtd = sum(float(e["quantidade_disponivel"]) for e in api("estoques", c).get("estoques", []) if str(e.get("codigo")) == c)
    tabelas = [p["tabela_preco"] for p in api("precos", c).get("precos", [])]
    tabelas = [t for t in tabelas if data(t["validade_inicial"]) <= HOJE <= data(t["validade_final"])]
    tabelas.sort(key=lambda t: data(t["validade_inicial"]), reverse=True)
    preco = 0.0
    for t in tabelas:
        for p in t.get("produtos", []):
            v = float(p["preco"])
            if not preco and str(p.get("codigo")) == c and v > 0:
                preco = v
    produtos[c] = {"preco": preco, "qtd": int(qtd)}

if not produtos:
    sys.exit("Nenhum produto encontrado no index.html")
js = ("// Gerado automaticamente do Sólidus Smart. Não edite à mão.\n"
      "const ESTOQUE = " + json.dumps({"atualizado": AGORA.strftime("%d/%m/%Y %H:%M"), "produtos": produtos}, ensure_ascii=False) + ";\n")
open("estoque.js", "w", encoding="utf-8").write(js)
print(f"OK: {len(produtos)} produtos atualizados")
