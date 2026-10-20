import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de privacidade · Nichemap" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de privacidade" updated="20/10/2026">
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
          <li>
            Dados da assinatura: os códigos da sua cliente e da sua assinatura no Asaas, a situação da assinatura, as
            datas de vencimento e de fim do período pago, e o link da cobrança em aberto.
          </li>
        </ul>
        <p>Não pedimos nem guardamos senhas, nem do Google nem do Instagram. Não guardamos CPF, CNPJ nem dados de cartão.</p>
      </section>
      <section>
        <h2>Cobrança e Asaas</h2>
        <p>
          Para cobrar sua assinatura e emitir o comprovante de pagamento, enviamos ao Asaas, que processa os pagamentos,
          seu nome, seu e-mail, seu CPF ou CNPJ e, se você informar, seu celular. O pagamento (Pix, cartão ou boleto) é
          feito na página do Asaas: o Nichemap não recebe nem guarda dados de cartão, e o CPF ou CNPJ fica só no Asaas.
        </p>
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
          <li>Cobrar a assinatura e confirmar o pagamento.</li>
          <li>Atendimento e suporte.</li>
        </ul>
      </section>
      <section>
        <h2>Com quem compartilhamos</h2>
        <ul>
          <li>Google: autenticação.</li>
          <li>Asaas: cobrança das assinaturas, com os dados listados em &quot;Cobrança e Asaas&quot;.</li>
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
          A exclusão apaga seus dados pessoais e libera o perfil escolhido. Se você tiver assinatura, ela é cancelada no
          Asaas antes da exclusão. Depois da exclusão, seu cadastro de cliente no Asaas (nome, e-mail e CPF ou CNPJ)
          continua com o Asaas, pelas regras de guarda dele; o Nichemap não fica com nenhum desses dados.
        </p>
      </section>
    </LegalPage>
  );
}
