// ✅ Importa dependências essenciais
import Stripe from "stripe";
import "dotenv/config";

// ✅ Função alternativa para capturar o corpo bruto da requisição (substitui "micro")
const buffer = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

// ✅ Configuração necessária para o Stripe Webhook
// O corpo da requisição precisa ser lido como "raw" (não JSON parseado)
export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ Inicializa o cliente Stripe com a chave secreta
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ ERRO: STRIPE_SECRET_KEY não definida no ambiente!");
  throw new Error("⚠️ Configure STRIPE_SECRET_KEY no .env.local ou nas variáveis da Vercel.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// ✅ Verifica se o segredo do endpoint (webhook) foi definido
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.error("❌ ERRO: STRIPE_WEBHOOK_SECRET não definido!");
  throw new Error("⚠️ Configure STRIPE_WEBHOOK_SECRET no .env.local ou nas variáveis da Vercel.");
}

// ⚙️ Seu segredo do endpoint do webhook (copiado do painel da Stripe)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Função principal executada quando a Stripe envia um evento
export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.warn("⚠️ Método não permitido:", req.method);
    return res.status(405).end("Método não permitido");
  }

  let event;
  try {
    // 🔹 Captura o corpo bruto da requisição
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];

    // ✅ Verifica a assinatura de segurança do webhook
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    console.log(`📬 Webhook recebido: ${event.type}`);
  } catch (err) {
    console.error("❌ Erro ao validar webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 Evento principal — checkout concluído com sucesso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // ✅ Coleta as informações principais da sessão
    const nome = session.customer_details?.name || "Cliente não informado";
    const email = session.customer_details?.email || "";
    const telefone = session.customer_details?.phone || "";
    const produto = session.metadata?.produto || "Produto desconhecido";

    // ✅ Busca o campo CPF (personalizado no checkout)
    const cpf =
      session.custom_fields?.find((field) => field.key === "cpf")?.text?.value || "";

    // ✅ Converte a data de criação (timestamp Unix → formato legível)
    const dataCompra = new Date(session.created * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    console.log(`✅ Pagamento confirmado: ${nome} - ${produto} - ${email}`);

    // ✅ Envio dos dados para o Google Sheets via Google Apps Script
    try {
      const resposta = await fetch(
        "https://script.google.com/macros/s/AKfycbwviJrAjXfAS-j45XhuddcAeOep3jqAZgdM--s9Y77SCOoDG3ZYKBn_n1_JSVgl10EydA/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            email,
            telefone,
            cpf,
            produto,
            dataCompra,
            status: "Pendente", // pode ser atualizado para "Pago" após validação extra
          }),
        }
      );

      if (!resposta.ok) throw new Error("Falha ao enviar dados ao Google Sheets");

      console.log("📊 Dados enviados com sucesso para o Google Sheets!");
    } catch (err) {
      console.error("❌ Erro ao enviar dados ao Google Sheets:", err.message);
    }
  }

  // ✅ Responde 200 para informar à Stripe que o evento foi recebido
  res.status(200).json({ received: true });
}
