import Stripe from "stripe";

// 🚨 Confere se a variável está configurada corretamente no Vercel
if (!process.env.CHAVE_SECRETA_DA_FAIXA) {
  console.error("❌ Variável de ambiente CHAVE_SECRETA_DA_FAIXA não encontrada!");
  throw new Error("⚠️ Adicione sua chave secreta da Stripe nas variáveis de ambiente do Vercel!");
}

const stripe = new Stripe(process.env.CHAVE_SECRETA_DA_FAIXA, {
  apiVersion: "2023-10-16",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { produto } = req.body;

    // 🏷️ IDs dos produtos cadastrados no Stripe
    const produtos = {
      ebook: "price_1Rs9nT2Lo3O3SUleb4s6gV43",      // eBook - Guia do Programador Saudável
      planilhas2: "price_1SAywm2Lo3O3SUleJv3T1GDO", // 2 Planilhas de Treinos Personalizadas
      planilhas3: "price_1SAys72Lo3O3SUleUS7mgE0f", // 3 Planilhas + Acompanhamento
    };

    const priceId = produtos[produto];
    if (!priceId) {
      return res.status(400).json({ error: "Produto inválido" });
    }

    // 💳 Cria a sessão de pagamento no Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/sucesso`,
      cancel_url: `${req.headers.origin}/cancelado`,
    });

    return res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("❌ Erro no checkout:", error);
    return res.status(500).json({ error: "Erro ao criar sessão de checkout" });
  }
}
