"""Puxa estoque e precos do Solidus Smart e gera estoque.js.
Roda no GitHub Actions; os tokens vem de segredos (nunca ficam no repositorio).

No Solidus cada loja tem o proprio token, e cada token devolve so o estoque daquela loja.
O site mostra a SOMA das lojas (segredos SOLIDUS_TOKEN_<LOJA>). O preco vem da tabela da
Matriz. Sem nenhum token de loja, usa o SOLIDUS_TOKEN antigo (so a Matriz).
Se alguma loja falhar, o script para e o estoque.js anterior continua valendo
(melhor do que mostrar estoque a menos)."""
import json, os, re, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = os.environ.get("SOLIDUS_API_BASE_URL") or "https://smart.sgisistemas.com.br/api_produto/tropical/consultas/"
LOJAS = ["MATRIZ", "AVENIDA", "TIMBIRAS", "PIO_XII", "DOM_PEDRO", "GONCALVES_DIAS", "COROATA", "ALTO_ALEGRE"]
TOKENS = {l: os.environ.get(f"SOLIDUS_TOKEN_{l}", "").strip() for l in LOJAS}
TOKENS = {l: t for l, t in TOKENS.items() if t}
if not TOKENS:
    TOKENS = {"MATRIZ": os.environ["SOLIDUS_TOKEN"].strip()}
TOKEN_PRECO = TOKENS.get("MATRIZ") or os.environ.get("SOLIDUS_TOKEN", "").strip() or next(iter(TOKENS.values()))
AGORA = datetime.now(ZoneInfo("America/Fortaleza"))
HOJE = AGORA.date()


def api(rota, codigo, token):
    url = f"{BASE}{rota}?token={urllib.parse.quote(token)}&codigo={urllib.parse.quote(codigo)}"
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


def qtd_loja(c, token):
    return sum(float(e["quantidade_disponivel"]) for e in api("estoques", c, token).get("estoques", []) if str(e.get("codigo")) == c)


def produto(c):
    lojas = {l: int(qtd_loja(c, t)) for l, t in TOKENS.items()}
    tabelas = [p["tabela_preco"] for p in api("precos", c, TOKEN_PRECO).get("precos", [])]
    tabelas = [t for t in tabelas if data(t["validade_inicial"]) <= HOJE <= data(t["validade_final"])]
    tabelas.sort(key=lambda t: data(t["validade_inicial"]), reverse=True)
    preco = 0.0
    for t in tabelas:
        for p in t.get("produtos", []):
            v = float(p["preco"])
            if not preco and str(p.get("codigo")) == c and v > 0:
                preco = v
    return c, {"preco": preco, "qtd": max(0, sum(lojas.values())), "lojas": lojas}


html = open("index.html", encoding="utf-8").read()
codigos = sorted(set(re.findall(r'cod:\s*"(\d+)"', html)), key=int)
with ThreadPoolExecutor(max_workers=4) as pool:
    produtos = dict(pool.map(produto, codigos))

if not produtos:
    sys.exit("Nenhum produto encontrado no index.html")
js = ("// Gerado automaticamente do Sólidus Smart. Não edite à mão.\n"
      "const ESTOQUE = " + json.dumps({"atualizado": AGORA.strftime("%d/%m/%Y %H:%M"), "lojas": list(TOKENS), "produtos": produtos}, ensure_ascii=False) + ";\n")
open("estoque.js", "w", encoding="utf-8").write(js)
total = sum(p["qtd"] for p in produtos.values())
print(f"OK: {len(produtos)} produtos, {len(TOKENS)} lojas ({', '.join(TOKENS)}), {total} unidades")
