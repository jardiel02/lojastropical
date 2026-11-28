import Image from "next/image";
import Link from "next/link";
import type { CatalogSnapshot } from "@lojas-tropical/shared";
import { wa } from "@/lib/site";

const institutional = [
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/termos-de-uso", label: "Termos de Uso" },
  { href: "/politica-de-trocas-e-reembolso", label: "Trocas, Devoluções e Reembolso" },
  { href: "/politica-de-cookies", label: "Política de Cookies" },
  { href: "/politica-de-privacidade#direitos", label: "Seus direitos (LGPD)" },
];

const heading = "mb-2 text-[13px] font-sans tracking-[.1em] uppercase text-white";
const link = "text-white underline underline-offset-[3px]";

export function Footer({ company }: { company: CatalogSnapshot["company"] }) {
  return (
    <footer className="on-brand bg-brand-deep text-sm leading-relaxed text-[#ffe3e1]">
      <div className="wrap grid gap-x-10 gap-y-6 pt-8 pb-7 min-[861px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <Image src="/img/logo.png" alt="Lojas Tropical" width={520} height={223} className="mb-2.5 h-12 w-auto" />
          <p>Móveis e eletrodomésticos com crediário próprio, há 20 anos no Maranhão.</p>
        </div>
        <nav aria-labelledby="rodape-inst">
          <h2 id="rodape-inst" className={heading}>
            Institucional
          </h2>
          <ul className="grid gap-1">
            {institutional.map((l) => (
              <li key={l.href}>
                <Link className={link} href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className={heading}>Dados da empresa</h2>
          <address className="grid gap-1 not-italic">
            <p>{company.legalName}</p>
            <p>
              CNPJ: {company.cnpj} · IE: {company.stateRegistration}
            </p>
            <p>{company.address}</p>
            <p>
              Telefone e WhatsApp:{" "}
              <a className={link} href={wa()}>
                {company.phoneDisplay}
              </a>
            </p>
            <p>Atendimento: {company.serviceHours}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-white/20">
        <p className="wrap pt-3.5 pb-[90px] text-[13px] min-[861px]:pb-[18px]">
          © {new Date().getFullYear()} Lojas Tropical. Preços e condições podem mudar sem aviso; vale o valor confirmado pelo vendedor
          no momento da compra. Imagens meramente ilustrativas.
        </p>
      </div>
    </footer>
  );
}
