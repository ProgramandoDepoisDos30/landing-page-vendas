// pages/api/checkout.js
import Stripe from "stripe";
import "dotenv/config";

if (!process.env.CHAVE_SECRETA_DA_FAIXA) {
  console.error("❌ CHAVE_SECRETA_DA_FAIXA não encontrada!");
  throw new Error("⚠️ Configure CHAVE_SECRETA_DA_FAIXA no ambiente.");
}

const stripe = new Stripe(process.env.CHAVE_SECRETA_DA_FAIXA, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  console.log("🔹 Endpoint /api/checkout chamado");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { produto } = req.body;
    console.log("📦 Produto recebido:", produto);

    const produtos = {
      ebook: "price_1SAys72Lo3O3SUleUS7mgE0f",
      planilhas2: "price_1SAywm2Lo3O3SUleJv3T1GDO",
      planilhas3: "price_1SAyuB2Lo3O3SUleD4JBcRfe",
    };

    const precoId = produtos[produto];
    if (!precoId) {
      console.error("❌ Produto inválido:", produto);
      return res.status(400).json({ error: "Produto inválido" });
    }

    // CRIA SESSÃO: inclui buyer_name e cpf como custom_fields
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        { price: precoId, quantity: 1 },
      ],
      success_url: `${req.headers.origin}/obrigado-${produto}.html`,
      cancel_url: `${req.headers.origin}/?canceled=true`,

      // solicita endereço (e isso faz aparecer nome+endereço)
      billing_address_collection: "required",
      customer_creation: "always",

      // **IMPORTANTE**: campos personalizados — buyer_name (nome do comprador) + CPF
      custom_fields: [
        {
          key: "buyer_name",
          label: { type: "custom", custom: "Nome completo" },
          type: "text",
          optional: false,
          text: { minimum_length: 3, maximum_length: 100 }
        },
        {
          key: "cpf",
          label: { type: "custom", custom: "CPF" },
          type: "text",
          optional: false,
          text: { minimum_length: 11, maximum_length: 14 }
        }
      ],

      // metadados para identificar produto no webhook/planilha
      metadata: { produto }
    });

    console.log("✅ Sessão criada:", session.id);
    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("❌ Erro ao criar sessão:", err);
    return res.status(500).json({ error: "Erro ao criar sessão", detalhes: err.message });
  }
}
