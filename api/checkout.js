// api/checkout.js
import Stripe from "stripe";

// 🔒 Substitua pela sua **chave secreta** do Stripe (não use a chave pública!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { produto } = req.body;

      // 🔹 Price IDs do Stripe para cada produto
      const produtos = {
        ebook: "price_1Rs9nT2Lo3O3SUleb4s6gV43",
        planilhas2: "price_1S6YZB2Lo3O3SUlelY52DkRf",
        planilhas3: "price_1S6Ybs2Lo3O3SUleudFueBxH"
      };

      const precoId = produtos[produto];

      if (!precoId) {
        return res.status(400).json({ error: "Produto inválido" });
      }

      // Cria a sessão de checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: precoId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/?success=true`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
      });

      res.status(200).json({ id: session.id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao criar sessão de checkout" });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Método não permitido");
  }
}
