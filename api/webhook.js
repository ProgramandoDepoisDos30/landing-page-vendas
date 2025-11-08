// ✅ Importa dependências essenciais
import Stripe from "stripe";
import "dotenv/config";

// ✅ Função auxiliar para capturar o corpo bruto da requisição
// (necessária para validar a assinatura do webhook corretamente)
const buffer = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

// ✅ Configuração obrigatória do Next.js para webhooks do Stripe
// Desativa o bodyParser padrão, pois precisamos ler o corpo bruto
export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ Verifica se a chave secreta da Stripe foi configurada corretamente
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ ERRO: STRIPE_SECRET_KEY não definida no ambiente!");
  throw new Error("⚠️ Configure STRIPE_SECRET_KEY nas variáveis da Vercel.");
}

// ✅ Inicializa o cliente da Stripe com a versão mais recente da API
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// ✅ Verifica se o segredo do Webhook foi configurado corretamente
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.error("❌ ERRO: STRIPE_WEBHOOK_SECRET não definido!");
  throw new Error("⚠️ Configure STRIPE_WEBHOOK_SECRET nas variáveis da Vercel.");
}

// ⚙️ Segredo do endpoint do webhook (copiado do painel da Stripe)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Função principal: é executada automaticamente sempre que o Stripe envia um evento
export default async function handler(req, res) {
  // ⚠️ Apenas aceita requisições do tipo POST
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

  // ✅ Evita processar o mesmo evento duas vezes (duplicados)
  const eventId = event.id;

  // 🔹 Mantém um cache simples em memória para detectar duplicatas
  global.processedEvents = global.processedEvents || new Set();

  if (global.processedEvents.has(eventId)) {
    console.warn(`⚠️ Evento duplicado ignorado: ${eventId}`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  // 🔹 Marca o evento como processado
  global.processedEvents.add(eventId);

  // 🎯 Evento principal — quando o pagamento é confirmado com sucesso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // ✅ Coleta as informações principais do pagamento
    const nome = session.customer_details?.name || "Cliente não informado";
    const email = session.customer_details?.email || "";
    const telefone = session.customer_details?.phone || "";
    const produto = session.metadata?.produto || "Produto desconhecido";

    // ✅ Captura o campo CPF personalizado do checkout
    const cpf =
      session.custom_fields?.find((field) => field.key === "cpf")?.text?.value || "";

    // ✅ Converte a data da compra (timestamp UNIX → formato legível)
    const dataCompra = new Date(session.created * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    console.log(`✅ Pagamento confirmado: ${nome} - ${produto} - ${email}`);

    // ✅ 1️⃣ Envia os dados do cliente para o Google Sheets via Google Apps Script
    try {
      const resposta = await fetch(
        "https://script.google.com/macros/s/AKfycbz3cKceqJWqIK_0tHKestltlLb1T9-QFX5ryTeafpIEyUU5Ke5ko-OBdmZg-ogltnsBHw/exec",
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
            status: "Pendente", // pode ser atualizado para "Pago" posteriormente
          }),
        }
      );

      if (!resposta.ok) throw new Error("Falha ao enviar dados ao Google Sheets");

      console.log("📊 Dados enviados com sucesso para o Google Sheets!");
    } catch (err) {
      console.error("❌ Erro ao enviar dados ao Google Sheets:", err.message);
    }

    // ✅ 2️⃣ Envia o e-mail automático de confirmação ao cliente
    // (requer a variável EMAIL_API_URL configurada na Vercel)
    try {
      if (!process.env.EMAIL_API_URL) {
        throw new Error("EMAIL_API_URL não configurada no ambiente.");
      }

      const emailResponse = await fetch(process.env.EMAIL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          produto,
          dataCompra,
        }),
      });

      if (!emailResponse.ok) throw new Error("Falha ao enviar o e-mail automático");

      console.log(`📧 E-mail automático enviado para ${email}`);
    } catch (err) {
      console.error("❌ Erro ao enviar e-mail automático:", err.message);
    }
  }

  // ✅ Envia resposta 200 para informar à Stripe que o evento foi recebido corretamente
  res.status(200).json({ received: true });
}
