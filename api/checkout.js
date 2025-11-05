// ✅ Importa o SDK da Stripe e o dotenv para acessar variáveis de ambiente
import Stripe from "stripe";
import "dotenv/config";

// ✅ Verifica se a variável de ambiente com a chave secreta da Stripe está configurada
if (!process.env.CHAVE_SECRETA_DA_FAIXA) {
  console.error("❌ Variável de ambiente CHAVE_SECRETA_DA_FAIXA não encontrada!");
  throw new Error("⚠️ Variável CHAVE_SECRETA_DA_FAIXA não encontrada no ambiente!");
}

// ✅ Inicializa a Stripe com sua chave secreta
const stripe = new Stripe(process.env.CHAVE_SECRETA_DA_FAIXA, {
  apiVersion: "2023-10-16",
});

// ✅ Função principal que será chamada quando o endpoint /api/checkout for acessado
export default async function handler(req, res) {
  console.log("🔹 Função /api/checkout chamada");

  // Permite apenas requisições POST (segurança)
  if (req.method !== "POST") {
    console.warn("⚠️ Método não permitido:", req.method);
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // ✅ Captura o produto enviado pelo front-end (via script.js)
    const { produto } = req.body;
    console.log("📦 Produto recebido:", produto);

    // ✅ Mapeamento dos produtos e seus IDs de preço cadastrados na Stripe
    const produtos = {
      ebook: "price_1SAys72Lo3O3SUleUS7mgE0f",
      planilhas2: "price_1SAywm2Lo3O3SUleJv3T1GDO",
      planilhas3: "price_1SAyuB2Lo3O3SUleD4JBcRfe",
    };

    // Busca o ID de preço do produto selecionado
    const precoId = produtos[produto];
    if (!precoId) {
      console.error("❌ Produto inválido:", produto);
      return res.status(400).json({ error: "Produto inválido" });
    }

    console.log("💳 Criando sessão Stripe com priceId:", precoId);

    // ✅ Cria a sessão de checkout na Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // Tipo de transação (pagamento único)
      payment_method_types: ["card"], // Aceita pagamento por cartão

      // ✅ Produto selecionado e quantidade
      line_items: [
        {
          price: precoId,
          quantity: 1,
        },
      ],

      // ✅ URLs de redirecionamento após o pagamento
      success_url: `${req.headers.origin}/obrigado-${produto}.html`,
      cancel_url: `${req.headers.origin}/?canceled=true`,

      // ✅ Coleta obrigatória do endereço de cobrança (inclui nome completo)
      billing_address_collection: "required",

      // ✅ Garante que o cliente será criado na Stripe (para registro e histórico)
      customer_creation: "always",

      // ✅ Campo personalizado para CPF
      // Este campo aparece automaticamente no checkout da Stripe
      custom_fields: [
        {
          key: "cpf",
          label: { type: "custom", custom: "CPF" },
          type: "text",
          optional: false, // obrigatório
          text: {
            minimum_length: 11,
            maximum_length: 14,
          },
        },
      ],

      // ✅ Coleta de email — a Stripe faz isso automaticamente se não estiver definido
      customer_email: undefined,

      // ✅ Metadados para rastrear internamente o produto comprado
      metadata: {
        produto: produto,
      },
    });

    console.log("✅ Sessão criada com sucesso:", session.id);

    // ✅ Retorna o ID da sessão para o front-end redirecionar o cliente
    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("❌ Erro ao criar sessão de checkout:", err);
    return res.status(500).json({
      error: "Erro ao criar sessão de checkout",
      detalhes: err.message,
    });
  }
}
