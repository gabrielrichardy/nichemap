import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de uso · Nichemap" };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de uso" updated="18/10/2026">
      <section>
        <h2>O serviço</h2>
        <p>
          O Nichemap, operado por [NOME DO RESPONSÁVEL] ([CPF/CNPJ]), é um painel de análise de dados públicos de perfis
          comerciais e de criadores do Instagram.
        </p>
      </section>
      <section>
        <h2>Conta e perfil escolhido</h2>
        <ul>
          <li>Você entra com sua conta Google e escolhe um único perfil do Instagram para acompanhar.</li>
          <li>Essa escolha é definitiva: só o suporte pode alterá-la.</li>
          <li>
            Escolha apenas um perfil seu ou que você tenha autorização para acompanhar. É proibido usar o serviço para
            perfis de terceiros sem autorização.
          </li>
        </ul>
      </section>
      <section>
        <h2>Planos</h2>
        <p>
          Os recursos disponíveis dependem do seu plano (Básico, Intermediário ou Completo), definido pelo responsável
          pelo serviço. Mudanças de plano são feitas pelo suporte.
        </p>
      </section>
      <section>
        <h2>Disponibilidade</h2>
        <p>
          Os dados vêm da API oficial do Instagram, que pode ficar indisponível ou mudar sem aviso. Não garantimos
          disponibilidade contínua nem a exatidão de dados fornecidos pela Meta.
        </p>
      </section>
      <section>
        <h2>Exclusão</h2>
        <p>Você pode excluir sua conta a qualquer momento em Minha conta. Veja também a política de privacidade.</p>
      </section>
    </LegalPage>
  );
}
