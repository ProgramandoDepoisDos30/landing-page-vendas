// api/checkout.js
import Stripe from "stripe";

// 🚨 Garante que a chave existe antes de prosseguir
if (!process.env.CHAVE_SECRETA_DA_FAIXA) {
  throw new Error("⚠️ Variável STRIPE_SECRET_KEY não encontrada no ambiente do Vercel!");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Método não permitido");
  }

  try {
    const { produto } = req.body;

    // 🔑 IDs reais do Stripe
    const produtos = {
      ebook: "price_1Rs9nT2Lo3O3SUleb4s6gV43",
      planilhas2: "price_1S6YZB2Lo3O3SUlelY52DkRf",
      planilhas3: "price_1S6Ybs2Lo3O3SUleudFueBxH",
    };

    const precoId = produtos[produto];
    if (!precoId) {
      return res.status(400).json({ error: "Produto inválido" });
    }

    // 🔒 Criação da sessão de checkout
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

    return res.status(200).json({ id: session.id });
  } catch (err) {
    console.error("❌ Erro no checkout:", err);
    return res.status(500).json({ error: "Erro ao criar sessão de checkout" });
  }
}
