import Stripe from "stripe";
import 'dotenv/config';

// Inicializa Stripe com sua chave secreta
if (!process.env.CHAVE_SECRETA_DA_FAIXA) {
  console.error("❌ Variável de ambiente CHAVE_SECRETA_DA_FAIXA não encontrada!");
  throw new Error("⚠️ Variável CHAVE_SECRETA_DA_FAIXA não encontrada no ambiente do Vercel!");
}

const stripe = new Stripe(process.env.CHAVE_SECRETA_DA_FAIXA, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  console.log("🔹 Função /api/checkout chamada");

  if (req.method !== "POST") {
    console.warn("⚠️ Método não permitido:", req.method);
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Captura o produto enviado pelo front-end (script.js)
    const { produto } = req.body;
    console.log("📦 Produto recebido:", produto);

    // Mapeamento dos produtos existentes
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

    console.log("💳 Criando sessão Stripe com priceId:", precoId);

    // ✅ Adicionando metadata para identificar o produto no webhook
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: precoId,
          quantity: 1,
        },
      ],
      // URLs de sucesso e cancelamento específicas por produto
      success_url: `${req.headers.origin}/obrigado-${produto}.html`,
      cancel_url: `${req.headers.origin}/?canceled=true`,

      // 🔥 METADATA - Aqui adicionamos o produto
      metadata: {
        produto: produto
      }
    });

    console.log("✅ Sessão criada com sucesso:", session.id);
    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("❌ Erro ao criar sessão de checkout:", err);
    return res.status(500).json({
      error: "Erro ao criar sessão de checkout",
      detalhes: err.message
    });
  }
}
