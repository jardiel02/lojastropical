"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Headset, KeyRound, Mail, MapPin, RefreshCw, ShoppingCart, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wa } from "@/lib/site";
import { accountReturnUrl, accountsEnabled, supabase } from "@/modules/account/client";
import { accountStore, useAccount } from "@/modules/account/store";
import {
  addressError,
  formatCep,
  formatCpf,
  formatPhone,
  isFullName,
  isValidCpf,
  isValidEmail,
  normalizeName,
  onlyDigits,
  translateAuthError,
  type Address,
} from "@/modules/account/validation";

type Msg = { text: string; kind: "erro" | "ok" } | null;

// ---------------------------------------------------------------------------
// Peças de formulário
// ---------------------------------------------------------------------------
function Field({ label, hint, mask, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; mask?: (v: string) => string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      <input
        {...input}
        onInput={mask ? (e) => (e.currentTarget.value = mask(e.currentTarget.value)) : input.onInput}
        className="h-12 rounded-[10px] border-2 border-line bg-surface px-3 text-[16px] outline-none focus:border-brand disabled:bg-chip disabled:text-muted-foreground"
      />
      {hint ? <small className="text-[13px] text-muted-foreground">{hint}</small> : null}
    </label>
  );
}

function CitySelect({ cities, defaultValue, name }: { cities: string[]; defaultValue?: string | null; name: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-bold">Cidade</span>
      <select
        name={name}
        required
        defaultValue={defaultValue ?? ""}
        className="h-12 rounded-[10px] border-2 border-line bg-surface px-3 text-[16px] outline-none focus:border-brand"
      >
        <option value="">Escolha a cidade</option>
        {cities.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <small className="text-[13px] text-muted-foreground">Vendemos online só para as cidades onde temos loja.</small>
    </label>
  );
}

function Message({ msg }: { msg: Msg }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ block: "nearest" }), [msg]);
  if (!msg) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className={
        msg.kind === "ok"
          ? "rounded-[10px] bg-[#e7f6ec] px-3 py-2.5 font-semibold text-[#14632f]"
          : "rounded-[10px] bg-[#fdecec] px-3 py-2.5 font-semibold text-[#9b1c1c]"
      }
    >
      {msg.text}
    </p>
  );
}

/** Formulário que trava enquanto envia e mostra o resultado. */
function useForm(action: (data: FormData, form: HTMLFormElement) => Promise<Msg | void>) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg(null);
    try {
      const r = await action(new FormData(form), form);
      if (r) setMsg(r);
    } catch (err) {
      setMsg({ kind: "erro", text: translateAuthError(err instanceof Error ? err.message : String(err)) });
    } finally {
      setBusy(false);
    }
  };
  return { busy, msg, setMsg, onSubmit };
}

const str = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
const erro = (text: string): Msg => ({ kind: "erro", text });
const ok = (text: string): Msg => ({ kind: "ok", text });

function readAddress(d: FormData): Address {
  return {
    cep: onlyDigits(str(d, "cep")),
    rua: str(d, "rua"),
    numero: str(d, "numero"),
    complemento: str(d, "complemento") || null,
    bairro: str(d, "bairro"),
    cidade: str(d, "cidade"),
  };
}

/** CEP completo preenche rua, bairro e cidade (ViaCEP); sem internet o cliente digita. */
async function fillFromCep(input: HTMLInputElement) {
  const cep = onlyDigits(input.value);
  if (cep.length !== 8) return;
  try {
    const d = (await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (d.erro) return;
    const form = input.form;
    if (!form) return;
    const rua = form.elements.namedItem("rua") as HTMLInputElement | null;
    const bairro = form.elements.namedItem("bairro") as HTMLInputElement | null;
    const cidade = form.elements.namedItem("cidade") as HTMLSelectElement | null;
    if (rua && !rua.value) rua.value = d.logradouro ?? "";
    if (bairro && !bairro.value) bairro.value = d.bairro ?? "";
    if (cidade && d.uf === "MA") {
      const o = [...cidade.options].find((x) => x.value.toLowerCase() === (d.localidade ?? "").toLowerCase());
      if (o) cidade.value = o.value;
    }
  } catch {
    /* ViaCEP fora do ar: segue à mão */
  }
}

function AddressFields({ cities, value }: { cities: string[]; value?: Partial<Record<keyof Address, string | null>> | null }) {
  return (
    <>
      <Field
        label="CEP"
        name="cep"
        inputMode="numeric"
        autoComplete="postal-code"
        required
        placeholder="65400-000"
        defaultValue={formatCep(value?.cep)}
        mask={formatCep}
        onChange={(e) => void fillFromCep(e.currentTarget)}
      />
      <Field label="Rua / Avenida" name="rua" autoComplete="address-line1" required maxLength={150} defaultValue={value?.rua ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número" name="numero" required maxLength={20} defaultValue={value?.numero ?? ""} />
        <Field label="Complemento" name="complemento" maxLength={100} placeholder="Opcional" defaultValue={value?.complemento ?? ""} />
      </div>
      <Field label="Bairro" name="bairro" required maxLength={80} defaultValue={value?.bairro ?? ""} />
      <CitySelect name="cidade" cities={cities} defaultValue={value?.cidade} />
    </>
  );
}

const Card = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-4 rounded-[var(--radius)] border border-line bg-surface p-5 shadow-[0_2px_10px_rgb(0_0_0/.05)]">{children}</div>
);

// ---------------------------------------------------------------------------
// Sem login: entrar, criar conta, esqueci a senha
// ---------------------------------------------------------------------------
type Screen = "entrar" | "criar" | "esqueci";

function SignIn({ go }: { go: (s: Screen) => void }) {
  const f = useForm(async (d) => {
    const email = str(d, "email");
    const password = String(d.get("senha") ?? "");
    if (!email || !password) return erro("Preencha e-mail e senha.");
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) return erro(translateAuthError(error.message));
  });
  return (
    <form className="grid gap-4" onSubmit={f.onSubmit} noValidate>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required disabled={f.busy} />
      <Field label="Senha" name="senha" type="password" autoComplete="current-password" required disabled={f.busy} />
      <Message msg={f.msg} />
      <Button type="submit" size="lg" disabled={f.busy}>
        Entrar
      </Button>
      <Button type="button" variant="link" onClick={() => go("esqueci")}>
        Esqueci minha senha
      </Button>
      <p className="mt-2 text-center text-sm text-muted-foreground">Ainda não tem conta?</p>
      <Button type="button" variant="outline" size="lg" onClick={() => go("criar")}>
        Criar minha conta
      </Button>
    </form>
  );
}

function SignUp({ go, cities, done }: { go: (s: Screen) => void; cities: string[]; done: (title: string, text: string) => void }) {
  const f = useForm(async (d) => {
    const data = {
      nome: normalizeName(str(d, "nome")),
      cpf: onlyDigits(str(d, "cpf")),
      celular: onlyDigits(str(d, "celular")),
      ...readAddress(d),
    };
    const email = str(d, "email");
    const password = String(d.get("senha") ?? "");
    if (!isFullName(data.nome)) return erro("Informe o nome completo.");
    if (!isValidCpf(data.cpf)) return erro("CPF inválido. Confira os números.");
    if (data.celular.length < 10) return erro("Celular inválido. Coloque o DDD, ex.: (99) 98177-1035.");
    if (!isValidEmail(email)) return erro("E-mail inválido.");
    if (password.length < 8) return erro("A senha precisa ter pelo menos 8 caracteres.");
    const a = addressError(data);
    if (a) return erro(a);
    if (!d.get("aceite")) return erro("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.");
    // O site original grava complemento vazio como ""; mantém igual para os dois sites
    const meta = { ...data, complemento: data.complemento ?? "" };
    const { data: res, error } = await supabase().auth.signUp({ email, password, options: { data: meta, emailRedirectTo: accountReturnUrl() } });
    if (error) return erro(translateAuthError(error.message));
    if (res.user && Array.isArray(res.user.identities) && res.user.identities.length === 0) return erro(translateAuthError("already registered"));
    if (res.session) return;
    done(
      "Confirme seu e-mail",
      `Quase lá! Enviamos um link de confirmação para ${email}. Abra seu e-mail (veja também a caixa de spam) e toque no link para ativar sua conta.`,
    );
  });
  return (
    <form className="grid gap-4" onSubmit={f.onSubmit} noValidate>
      <p className="text-muted-foreground">Crie sua conta para comprar pelo site. Leva 1 minuto.</p>
      <Field label="Nome completo" name="nome" autoComplete="name" required maxLength={120} />
      <Field label="CPF" name="cpf" inputMode="numeric" autoComplete="off" required placeholder="000.000.000-00" mask={formatCpf} />
      <Field label="Celular / WhatsApp" name="celular" type="tel" inputMode="numeric" autoComplete="tel-national" required placeholder="(99) 99999-9999" mask={formatPhone} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Crie uma senha" name="senha" type="password" autoComplete="new-password" required minLength={8} hint="Mínimo de 8 caracteres." />
      <fieldset className="grid gap-4 rounded-[var(--radius)] border border-line p-4">
        <legend className="px-1 font-bold">Endereço de entrega</legend>
        <AddressFields cities={cities} />
      </fieldset>
      <label className="flex items-start gap-2.5 text-[15px]">
        <input type="checkbox" name="aceite" required className="mt-1 size-5 accent-[var(--brand)]" />
        <span>
          Li e aceito os{" "}
          <Link href="/termos-de-uso" target="_blank" className="font-bold text-brand-text underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/politica-de-privacidade" target="_blank" className="font-bold text-brand-text underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      <Message msg={f.msg} />
      <Button type="submit" size="lg" disabled={f.busy}>
        Criar minha conta
      </Button>
      <Button type="button" variant="link" onClick={() => go("entrar")}>
        Já tenho conta: entrar
      </Button>
    </form>
  );
}

function Forgot({ go, done }: { go: (s: Screen) => void; done: (title: string, text: string) => void }) {
  const f = useForm(async (d) => {
    const email = str(d, "email");
    if (!isValidEmail(email)) return erro("E-mail inválido.");
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: accountReturnUrl() });
    if (error) return erro(translateAuthError(error.message));
    done("Verifique seu e-mail", `Se existir uma conta com ${email}, você vai receber um link para criar uma senha nova. Veja também a caixa de spam.`);
  });
  return (
    <form className="grid gap-4" onSubmit={f.onSubmit} noValidate>
      <p className="text-muted-foreground">Digite o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Message msg={f.msg} />
      <Button type="submit" size="lg" disabled={f.busy}>
        Enviar link
      </Button>
      <Button type="button" variant="link" onClick={() => go("entrar")}>
        Voltar para entrar
      </Button>
    </form>
  );
}

function NewPassword({ confirm, onDone }: { confirm?: boolean; onDone?: () => void }) {
  const f = useForm(async (d, form) => {
    const s = String(d.get("senha") ?? "");
    if (s.length < 8) return erro("A senha precisa ter pelo menos 8 caracteres.");
    if (confirm && d.get("senha2") !== s) return erro("As duas senhas não são iguais.");
    const { error } = await supabase().auth.updateUser({ password: s });
    if (error) return erro(translateAuthError(error.message));
    form.reset();
    onDone?.();
    return ok("Senha alterada com sucesso.");
  });
  return (
    <form className="grid gap-4" onSubmit={f.onSubmit} noValidate>
      <p className="text-muted-foreground">Escolha uma senha nova com pelo menos 8 caracteres.</p>
      <Field label="Nova senha" name="senha" type="password" autoComplete="new-password" required minLength={8} />
      {confirm ? <Field label="Repita a nova senha" name="senha2" type="password" autoComplete="new-password" required minLength={8} /> : null}
      <Message msg={f.msg} />
      <Button type="submit" size="lg" disabled={f.busy}>
        Salvar nova senha
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Logado: "Sua conta"
// ---------------------------------------------------------------------------
const SECTIONS = [
  {
    title: "Pedidos",
    items: [
      { id: "pedidos", label: "Meus pedidos", Icon: ShoppingCart },
      { id: "trocas", label: "Trocas e cancelamento", Icon: RefreshCw },
    ],
  },
  {
    title: "Seus dados",
    items: [
      { id: "dados", label: "Dados pessoais", Icon: UserRound },
      { id: "contato", label: "Alterar e-mail ou telefone", Icon: Mail },
      { id: "endereco", label: "Endereço de entrega", Icon: MapPin },
      { id: "senha", label: "Senha de acesso", Icon: KeyRound },
    ],
  },
] as const;
type SectionId = (typeof SECTIONS)[number]["items"][number]["id"];
const SECTION_IDS = SECTIONS.flatMap((s) => s.items.map((i) => i.id)) as SectionId[];
const titleOf = (id: SectionId) => SECTIONS.flatMap((s) => [...s.items]).find((i) => i.id === id)!.label;

async function updateCustomer(patch: Record<string, string | null>, okText: string): Promise<Msg> {
  const { user } = accountStore.get();
  if (!user) return erro("Sua sessão terminou. Entre de novo.");
  const { error } = await supabase().from("clientes").update(patch).eq("id", user.id);
  if (error) return erro(translateAuthError(error.message));
  await accountStore.reloadCustomer();
  return ok(okText);
}

function Section({ id, cities }: { id: SectionId; cities: string[] }) {
  const { user, customer } = useAccount();
  const dados = useForm(async (d) => {
    const nome = normalizeName(str(d, "nome"));
    if (!isFullName(nome)) return erro("Informe o nome completo.");
    return updateCustomer({ nome }, "Dados salvos!");
  });
  const telefone = useForm(async (d) => {
    const celular = onlyDigits(str(d, "celular"));
    if (celular.length < 10) return erro("Celular inválido. Coloque o DDD.");
    return updateCustomer({ celular }, "Celular salvo!");
  });
  const email = useForm(async (d, form) => {
    const novo = str(d, "email");
    if (!isValidEmail(novo)) return erro("E-mail inválido.");
    if (novo.toLowerCase() === (user?.email ?? "").toLowerCase()) return erro("Esse já é o seu e-mail atual.");
    const { error } = await supabase().auth.updateUser({ email: novo }, { emailRedirectTo: accountReturnUrl() });
    if (error) return erro(translateAuthError(error.message));
    form.reset();
    return ok(`Enviamos um link de confirmação para ${novo}. A troca vale depois que você tocar no link.`);
  });
  const endereco = useForm(async (d) => {
    const a = readAddress(d);
    const e = addressError(a);
    if (e) return erro(e);
    return updateCustomer(a, "Endereço salvo!");
  });

  switch (id) {
    case "pedidos":
      return (
        <Card>
          <p className="font-bold">Você ainda não tem pedidos pelo site.</p>
          <p className="text-muted-foreground">
            Em breve você vai poder comprar aqui pelo site e acompanhar cada pedido nesta página. Compras feitas na loja ou pelo WhatsApp não
            aparecem aqui.
          </p>
          <Button asChild size="lg">
            <Link href="/busca">Ver produtos</Link>
          </Button>
        </Card>
      );
    case "trocas":
      return (
        <Card>
          <p>
            Para trocar, devolver ou cancelar uma compra, fale com a loja pelo WhatsApp informando seu nome e o produto. Você tem até{" "}
            <b>7 dias após o recebimento</b> para desistir de compras feitas fora da loja, e os produtos têm garantia legal e do fabricante.
          </p>
          <Link href="/politica-de-trocas-e-reembolso" className="font-bold text-brand-text underline">
            Ler a política de trocas, devoluções e reembolso
          </Link>
          <Button asChild variant="whatsapp" size="lg">
            <a href={wa("Olá! Quero solicitar uma troca ou cancelamento.")} target="_blank" rel="noopener">
              Pedir troca ou cancelamento pelo WhatsApp
            </a>
          </Button>
        </Card>
      );
    case "dados":
      return (
        <Card>
          <form className="grid gap-4" onSubmit={dados.onSubmit} noValidate>
            <Field label="Nome completo" name="nome" autoComplete="name" required maxLength={120} defaultValue={customer?.nome ?? ""} />
            <Field label="CPF" disabled value={formatCpf(customer?.cpf)} readOnly hint="Para corrigir o CPF, fale com a loja." />
            <Message msg={dados.msg} />
            <Button type="submit" size="lg" disabled={dados.busy || !customer}>
              Salvar
            </Button>
          </form>
        </Card>
      );
    case "contato":
      return (
        <div className="grid gap-5">
          <Card>
            <form className="grid gap-4" onSubmit={telefone.onSubmit} noValidate>
              <h2 className="text-xl">Celular / WhatsApp</h2>
              <Field
                label="Celular com DDD"
                name="celular"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                required
                defaultValue={formatPhone(customer?.celular)}
                mask={formatPhone}
              />
              <Message msg={telefone.msg} />
              <Button type="submit" size="lg" disabled={telefone.busy || !customer}>
                Salvar celular
              </Button>
            </form>
          </Card>
          <Card>
            <form className="grid gap-4" onSubmit={email.onSubmit} noValidate>
              <h2 className="text-xl">E-mail</h2>
              <p className="text-muted-foreground">
                E-mail atual: <b className="text-foreground">{user?.email}</b>
              </p>
              <Field
                label="Novo e-mail"
                name="email"
                type="email"
                autoComplete="email"
                required
                hint="Vamos mandar um link de confirmação para o novo e-mail. A troca só vale depois que você tocar no link."
              />
              <Message msg={email.msg} />
              <Button type="submit" size="lg" disabled={email.busy}>
                Trocar e-mail
              </Button>
            </form>
          </Card>
        </div>
      );
    case "endereco":
      return (
        <Card>
          <form className="grid gap-4" onSubmit={endereco.onSubmit} noValidate>
            <AddressFields cities={cities} value={customer} />
            <Message msg={endereco.msg} />
            <Button type="submit" size="lg" disabled={endereco.busy || !customer}>
              Salvar endereço
            </Button>
          </form>
        </Card>
      );
    case "senha":
      return (
        <Card>
          <NewPassword confirm />
        </Card>
      );
  }
}

function AccountHome({ notice }: { notice: Msg }) {
  const { user, customer } = useAccount();
  return (
    <>
      <h1 className="mb-2 text-[clamp(28px,3.6vw,40px)]">Sua conta</h1>
      <p className="mb-5 text-muted-foreground">
        Olá, <b className="text-foreground">{customer?.nome ?? user?.email}</b>. Navegue e gerencie conforme desejar.
      </p>
      <div className="mb-5 grid gap-3">
        <Message msg={notice} />
        {customer ? null : (
          <Message
            msg={erro("Não encontramos seus dados de cadastro. Fale com a loja pelo WhatsApp para resolver.")}
          />
        )}
      </div>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mb-6">
          <h2 className="mb-2.5 text-lg">{s.title}</h2>
          <div className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
            {s.items.map(({ id, label, Icon }) => (
              <Link key={id} href={`/conta?secao=${id}`} className="flex items-center gap-3 px-4 py-3.5 font-semibold hover:bg-chip">
                <Icon aria-hidden className="size-[22px] text-brand-text" />
                <span className="flex-1">{label}</span>
                <ChevronRight aria-hidden className="size-[18px] text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      <section className="mb-6">
        <h2 className="mb-2.5 text-lg">Comunicação</h2>
        <a
          href={wa("Olá! Vim pelo site e preciso de atendimento.")}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3.5 font-semibold hover:bg-chip"
        >
          <Headset aria-hidden className="size-[22px] text-brand-text" />
          <span className="flex-1">Central de atendimento</span>
          <ChevronRight aria-hidden className="size-[18px] text-muted-foreground" />
        </a>
      </section>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => void supabase().auth.signOut()}>
        Sair da conta
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">
        Quer excluir sua conta ou seus dados?{" "}
        <a href={wa("Olá! Quero excluir minha conta do site.")} target="_blank" rel="noopener" className="font-bold text-brand-text underline">
          Peça pelo WhatsApp
        </a>
        , conforme a LGPD.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
const SCREEN_TITLES: Record<Screen, string> = { entrar: "Entrar", criar: "Criar conta", esqueci: "Recuperar senha" };

export function AccountApp({ cities }: { cities: string[] }) {
  if (!accountsEnabled) return <AccountsUnavailable />;
  return <AccountScreens cities={cities} />;
}

/** Sem o projeto Supabase configurado não há login falso: só o caminho pelo WhatsApp. */
function AccountsUnavailable() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-3 text-[clamp(28px,3.6vw,40px)]">Área do cliente em construção</h1>
      <p className="mb-4 text-muted-foreground">
        O cadastro e o login desta nova versão do site ainda estão sendo ligados. Enquanto isso, fale com a gente pelo WhatsApp para comprar ou
        tirar dúvidas.
      </p>
      <Button asChild variant="buy" size="lg">
        <a href={wa("Olá! Vim pelo site.")} target="_blank" rel="noopener">
          Falar no WhatsApp
        </a>
      </Button>
    </div>
  );
}

function AccountScreens({ cities }: { cities: string[] }) {
  const account = useAccount();
  const params = useSearchParams();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(() => {
    const t = params.get("tela");
    return t === "criar" || t === "esqueci" ? t : "entrar";
  });
  const [sent, setSent] = useState<{ title: string; text: string } | null>(null);
  // Links dos e-mails: erro (link vencido) ou confirmação de cadastro. Lido uma vez; a tela
  // só aparece depois que o Supabase responde (ready), então não há diferença com o servidor.
  const [fromLink] = useState(() => {
    if (typeof window === "undefined") return { error: null as string | null, confirmed: false };
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const desc = hash.get("error_description");
    return {
      error: desc
        ? /expired|invalid/i.test(desc)
          ? 'Esse link expirou ou já foi usado. Entre com seu e-mail e senha ou peça um novo link em "Esqueci minha senha".'
          : desc
        : null,
      confirmed: !desc && /type=(signup|email_change)/.test(window.location.hash),
    };
  });
  const [linkError, setLinkError] = useState<string | null>(fromLink.error);
  const notice: Msg = fromLink.confirmed ? ok("E-mail confirmado! Sua conta está ativa.") : null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (fromLink.error) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [fromLink.error]);

  const secao = params.get("secao") as SectionId | null;
  const section = secao && SECTION_IDS.includes(secao) ? secao : null;
  const go = (s: Screen) => {
    setScreen(s);
    setSent(null);
    setLinkError(null);
    headingRef.current?.focus();
  };

  if (!account.ready) {
    return <p className="py-16 text-center text-muted-foreground">Carregando sua conta…</p>;
  }

  if (account.recovering && account.user) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <h1 className="text-[clamp(28px,3.6vw,40px)]">Nova senha</h1>
        <NewPassword onDone={() => setTimeout(() => accountStore.finishRecovery(), 1500)} />
      </div>
    );
  }

  if (!account.user) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="text-[clamp(28px,3.6vw,40px)] outline-none">
          {sent ? sent.title : SCREEN_TITLES[screen]}
        </h1>
        {linkError ? <Message msg={erro(linkError)} /> : null}
        {sent ? (
          <>
            <Message msg={ok(sent.text)} />
            <Button size="lg" onClick={() => go("entrar")}>
              Ir para entrar
            </Button>
          </>
        ) : screen === "criar" ? (
          <SignUp go={go} cities={cities} done={(title, text) => setSent({ title, text })} />
        ) : screen === "esqueci" ? (
          <Forgot go={go} done={(title, text) => setSent({ title, text })} />
        ) : (
          <SignIn go={go} />
        )}
      </div>
    );
  }

  if (section) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.push("/conta")}
          className="mb-3 inline-flex items-center gap-1 font-bold text-brand-text hover:underline"
        >
          <ChevronLeft aria-hidden className="size-[18px]" />
          Sua conta
        </button>
        <h1 className="mb-5 text-[clamp(28px,3.6vw,40px)]">{titleOf(section)}</h1>
        <Section id={section} cities={cities} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AccountHome notice={notice} />
    </div>
  );
}
