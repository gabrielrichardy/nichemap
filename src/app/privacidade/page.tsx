import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de privacidade · Nichemap" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de privacidade" updated="18/10/2026">
      <section>
        <h2>Quem é o responsável</h2>
        <p>
          O Nichemap é operado por [NOME DO RESPONSÁVEL], inscrito no [CPF/CNPJ], responsável pelo tratamento dos dados
          descritos aqui, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
      </section>
      <section>
        <h2>Quais dados guardamos</h2>
        <ul>
          <li>Nome, e-mail e foto da sua conta Google, recebidos quando você entra com o Google.</li>
          <li>O @ do Instagram que você escolheu para acompanhar.</li>
          <li>Seu plano.</li>
          <li>Datas de cadastro, de aceite destes termos e do seu último acesso.</li>
        </ul>
        <p>Não pedimos nem guardamos senhas, nem do Google nem do Instagram.</p>
      </section>
      <section>
        <h2>Dados públicos do Instagram</h2>
        <p>
          Consultamos pela API oficial da Meta os dados públicos do perfil comercial ou de criador escolhido (seguidores,
          publicações, curtidas e comentários) para montar o painel e o histórico de crescimento.
        </p>
      </section>
      <section>
        <h2>Para que usamos</h2>
        <ul>
          <li>Permitir seu login e manter sua sessão.</li>
          <li>Mostrar o painel do seu perfil conforme o seu plano.</li>
          <li>Atendimento e suporte.</li>
        </ul>
      </section>
      <section>
        <h2>Com quem compartilhamos</h2>
        <ul>
          <li>Google: autenticação.</li>
          <li>Neon: banco de dados onde as informações ficam guardadas.</li>
          <li>Vercel: hospedagem do site.</li>
          <li>Meta: consulta dos dados públicos do Instagram.</li>
        </ul>
        <p>Não vendemos seus dados.</p>
      </section>
      <section>
        <h2>Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, entre outros direitos do art. 18 da
          LGPD. Para excluir sua conta, use o botão &quot;Excluir minha conta&quot; em Minha conta ou fale com o suporte.
          A exclusão apaga seus dados pessoais e libera o perfil escolhido.
        </p>
      </section>
    </LegalPage>
  );
}
