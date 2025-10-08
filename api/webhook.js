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

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // coloque whsec_Lz4T8YEH3exjnlv0QxrQrIcMOIxB0wAs no Vercel

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Método não permitido');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('Erro ao validar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Evento de checkout concluído
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Pega os dados do comprador
    const nome = session.customer_details?.name || 'Cliente';
    const email = session.customer_details?.email;
    const telefone = session.customer_details?.phone || '';
    const produto = session.metadata?.produto || 'produto desconhecido';
    const dataCompra = new Date(session.created * 1000).toLocaleString();

    // Agora vamos adicionar na planilha
    try {
      const sheetId = process.env.SHEET_ID; // ID da planilha
      const doc = SpreadsheetApp.openById(sheetId);
      const aba = doc.getSheets()[0];
      aba.appendRow([nome, email, telefone, produto, dataCompra, 'Pendente']);
      console.log('Compra registrada na planilha:', email);
    } catch (err) {
      console.error('Erro ao adicionar na planilha:', err.message);
    }
  }

  res.status(200).json({ received: true });
}
