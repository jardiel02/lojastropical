"""Busca produtos no cadastro do Sólidus pelo nome (só leitura) e mostra código, preço e estoque.
Uso no GitHub Actions: BUSCA="telasul diamante" python3 scripts/solidus_busca.py"""
import json, os, sys, time, unicodedata, urllib.parse, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

BASE = os.environ.get("SOLIDUS_API_BASE_URL") or "https://smart.sgisistemas.com.br/api_produto/tropical/consultas/"
LOJAS = ["MATRIZ", "AVENIDA", "TIMBIRAS", "PIO_XII", "DOM_PEDRO", "GONCALVES_DIAS", "COROATA", "ALTO_ALEGRE"]
TOKENS = {l: os.environ.get(f"SOLIDUS_TOKEN_{l}", "").strip() for l in LOJAS}
TOKENS = {l: t for l, t in TOKENS.items() if t}
TOKEN = TOKENS.get("MATRIZ") or os.environ.get("SOLIDUS_TOKEN", "").strip()
HOJE = datetime.now(ZoneInfo("America/Fortaleza")).date()


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s).lower()) if unicodedata.category(c) != "Mn")


PALAVRAS = norm(os.environ.get("BUSCA", "telasul diamante")).split()


def get(rota, **params):
    params["token"] = TOKEN
    url = f"{BASE}{rota}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "LojasTropicalSite/1.0"})
    for i in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if i == 3:
                raise RuntimeError(f"{rota} {params.get('page') or params.get('codigo')}: {type(e).__name__}") from None
            time.sleep(2 * i)


def lista(resp):
    if isinstance(resp, list):
        return resp
    for v in resp.values():
        if isinstance(v, list):
            return v
    return []


def textos(item):
    return " ".join(str(v) for k, v in item.items() if isinstance(v, (str, int)) and k != "token")


achados, pagina = [], 1
while True:
    itens = lista(get("produtos", page=pagina))
    if not itens:
        break
    for it in itens:
        if all(p in norm(textos(it)) for p in PALAVRAS):
            achados.append(it)
    pagina += 1
    if pagina > 2000:
        break
print(f"{pagina - 1} páginas lidas; {len(achados)} produto(s) com: {' '.join(PALAVRAS)}")


def d(s):
    return datetime.strptime(s, "%d/%m/%Y").date()


linhas = []
for it in achados:
    c = str(it.get("codigo") or it.get("id"))
    preco = 0.0
    tabs = [p["tabela_preco"] for p in lista(get("precos", codigo=c))]
    tabs = sorted([t for t in tabs if d(t["validade_inicial"]) <= HOJE <= d(t["validade_final"])], key=lambda t: d(t["validade_inicial"]), reverse=True)
    for t in tabs:
        for p in t.get("produtos", []):
            if not preco and str(p.get("codigo")) == c and float(p["preco"]) > 0:
                preco = float(p["preco"])
    qtd = 0
    for l, t in TOKENS.items():
        r = json.load(urllib.request.urlopen(urllib.request.Request(f"{BASE}estoques?token={urllib.parse.quote(t)}&codigo={c}", headers={"User-Agent": "LojasTropicalSite/1.0"}), timeout=60))
        qtd += sum(float(e["quantidade_disponivel"]) for e in lista(r) if str(e.get("codigo")) == c)
    nome = it.get("descricao") or it.get("nome") or textos(it)[:80]
    linhas.append(f"| {c} | {nome} | {preco:.2f} | {int(qtd)} |")
    print(f"codigo={c} | {nome} | preco={preco:.2f} | estoque={int(qtd)}")

resumo = os.environ.get("GITHUB_STEP_SUMMARY")
if resumo:
    with open(resumo, "a", encoding="utf-8") as f:
        f.write(f"### Busca no Sólidus: {' '.join(PALAVRAS)}\n\n| Código | Descrição | Preço | Estoque |\n|---|---|---|---|\n" + "\n".join(linhas) + "\n")
if not achados and pagina <= 1:
    sys.exit("Nenhuma página lida")
