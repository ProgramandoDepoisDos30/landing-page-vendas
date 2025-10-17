// pages/api/webhook.js
import { buffer } from 'micro';
import Stripe from 'stripe';
import 'dotenv/config';

export const config = {
  api: {
    bodyParser: false, // O webhook precisa do body bruto
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// ⚠️ Substitua no Vercel pelo seu valor real: whsec_Lz4T8YEH3exjnlv0QxrQrIcMOIxB0wAs
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Método não permitido');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // ✅ Verifica a assinatura do webhook para segurança
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erro ao validar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🎯 Evento de checkout concluído
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Coleta as informações do comprador e do produto
    const nome = session.customer_details?.name || 'Cliente';
    const email = session.customer_details?.email || '';
    const telefone = session.customer_details?.phone || '';
    const produto = session.metadata?.produto || 'produto desconhecido';
    const dataCompra = new Date(session.created * 1000).toLocaleString();

    console.log(`📩 Compra registrada: ${nome} - ${email} - ${produto}`);

    // ✅ Envia os dados para o seu Apps Script (planilha)
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbwviJrAjXfAS-j45XhuddcAeOep3jqAZgdM--s9Y77SCOoDG3ZYKBn_n1_JSVgl10EydA/exec",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            email,
            telefone,
            produto,
            dataCompra,
            status: "Pendente"
          })
        }
      );

      console.log("✅ Dados enviados para o Google Sheets com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao enviar para o Google Sheets:", err.message);
    }
  }

  res.status(200).json({ received: true });
}
