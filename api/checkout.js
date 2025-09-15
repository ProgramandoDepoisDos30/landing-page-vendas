import Stripe from "stripe";

// Inicializa Stripe
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
    const { produto } = req.body;
    console.log("📦 Produto recebido:", produto);

    const produtos = {
      ebook: "price_1Rs9nT2Lo3O3SUleb4s6gV43",
      planilhas2: "price_1S6YZB2Lo3O3SUlelY52DkRf",
      planilhas3: "price_1S6Ybs2Lo3O3SUleudFueBxH",
    };

    const precoId = produtos[produto];
    if (!precoId) {
      console.error("❌ Produto inválido:", produto);
      return res.status(400).json({ error: "Produto inválido" });
    }

    console.log("💳 Criando sessão Stripe com priceId:", precoId);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: precoId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
    });

    console.log("✅ Sessão criada com sucesso:", session.id);
    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("❌ Erro ao criar sessão de checkout:", err);
    return res.status(500).json({ error: "Erro ao criar sessão de checkout", detalhes: err.message });
  }
}
