import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de uso · Nichemap" };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de uso" updated="20/10/2026">
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
        <h2>Planos e preços</h2>
        <ul>
          <li>Básico: gratuito. É o plano de toda conta nova.</li>
          <li>Intermediário: R$ 59,90 por mês ou R$ 599,00 por ano.</li>
          <li>Completo: R$ 99,90 por mês ou R$ 999,00 por ano.</li>
        </ul>
        <p>
          Os recursos de cada plano aparecem na página de planos. Algumas contas recebem um plano sem cobrança, por
          cortesia, sem prazo para acabar; isso é decidido pelo responsável pelo serviço.
        </p>
      </section>
      <section>
        <h2>Assinatura e pagamento</h2>
        <ul>
          <li>Os planos pagos são assinados pelo site e cobrados pelo Asaas, por Pix, cartão de crédito ou boleto.</li>
          <li>Cada período (mensal ou anual) gera uma cobrança, até você cancelar a assinatura.</li>
          <li>Assinaturas já existentes mantêm o preço contratado. Mudanças de preço valem para novas assinaturas.</li>
          <li>O plano é liberado assim que o pagamento é confirmado. Pix e cartão confirmam em segundos; boleto pode levar até 3 dias úteis.</li>
        </ul>
      </section>
      <section>
        <h2>Mudança de plano</h2>
        <ul>
          <li>
            Subir do Intermediário para o Completo no plano mensal: o plano muda na hora, e o novo valor passa a ser
            cobrado na próxima cobrança.
          </li>
          <li>Subir no plano anual e descer de plano: valem a partir da próxima renovação.</li>
          <li>Para trocar entre mensal e anual, cancele a assinatura atual e assine de novo.</li>
        </ul>
      </section>
      <section>
        <h2>Cancelamento e direito de arrependimento</h2>
        <ul>
          <li>Você cancela em Minha conta, na opção Cancelar assinatura. Depois do cancelamento, nada mais é cobrado.</li>
          <li>Você mantém o plano pago até o fim do período já pago. Depois disso, a conta volta ao Básico.</li>
          <li>
            Você pode desistir da contratação em até 7 dias após o primeiro pagamento (art. 49 do Código de Defesa do
            Consumidor) e receber o valor de volta. Peça pelo suporte.
          </li>
        </ul>
      </section>
      <section>
        <h2>Atraso, estorno e contestação</h2>
        <ul>
          <li>Se uma cobrança vencer sem pagamento, o plano continua por 3 dias, com aviso para você pagar.</li>
          <li>Passados os 3 dias, a conta volta ao Básico. Pagando a cobrança em aberto, o plano volta na hora.</li>
          <li>Cobrança sem pagamento por mais de 30 dias: a assinatura é encerrada.</li>
          <li>
            Estorno ou contestação de um pagamento: a conta volta ao Básico na hora e a assinatura é encerrada.
          </li>
        </ul>
      </section>
      <section>
        <h2>Disponibilidade</h2>
        <p>
          Os dados vêm da API oficial do Instagram, que pode ficar indisponível ou mudar sem aviso. Não garantimos
          disponibilidade contínua nem a exatidão de dados fornecidos pela Meta.
          Para contas liberadas pelo administrador, os dados públicos do perfil podem vir de um fornecedor terceiro não
          oficial (Apify), que pode falhar, ficar desatualizado ou ser desativado sem aviso.
        </p>
      </section>
      <section>
        <h2>Exclusão</h2>
        <p>
          Você pode excluir sua conta a qualquer momento em Minha conta. Se houver assinatura, ela é cancelada antes; se
          o cancelamento não puder ser feito, a conta não é excluída, para não haver cobrança de conta apagada. Veja
          também a política de privacidade.
        </p>
      </section>
    </LegalPage>
  );
}
