// ✅ Importa o SDK da Stripe e o dotenv (para ler variáveis de ambiente)
import Stripe from "stripe";
import "dotenv/config";

// ✅ Verifica se a variável de ambiente da chave secreta da Stripe está definida
if (!process.env.CHAVE_SECRETA_DA_FAIXA) {
  console.error("❌ Variável de ambiente CHAVE_SECRETA_DA_FAIXA não encontrada!");
  throw new Error("⚠️ Configure a variável CHAVE_SECRETA_DA_FAIXA no ambiente da Vercel (.env.local)");
}

// ✅ Inicializa a instância da Stripe com sua chave secreta
const stripe = new Stripe(process.env.CHAVE_SECRETA_DA_FAIXA, {
  apiVersion: "2023-10-16", // garante compatibilidade com a versão atual da API
});

// ✅ Função principal — será executada ao acessar /api/checkout
export default async function handler(req, res) {
  console.log("🚀 Endpoint /api/checkout acessado");

  // 🔒 Permite apenas requisições POST (evita acessos indevidos via GET)
  if (req.method !== "POST") {
    console.warn("⚠️ Método não permitido:", req.method);
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    // ✅ Captura o nome do produto enviado pelo front-end (via corpo da requisição)
    const { produto } = req.body;
    console.log("📦 Produto solicitado:", produto);

    // ✅ Mapeamento entre os produtos e os IDs de preço (Price IDs) configurados na Stripe
    //    ⚠️ Você deve substituir pelos IDs reais dos seus produtos na Stripe
    const produtos = {
      ebook: "price_1SAys72Lo3O3SUleUS7mgE0f",        // Do Código à Saúde - Ebook
      planilhas2: "price_1SAywm2Lo3O3SUleJv3T1GDO",   // Sistema com 2 Planilhas
      planilhas3: "price_1SAyuB2Lo3O3SUleD4JBcRfe",   // Sistema com 3 Planilhas
    };

    // ✅ Busca o ID de preço do produto informado
    const precoId = produtos[produto];

    // 🚫 Caso o produto não exista no mapeamento, retorna erro
    if (!precoId) {
      console.error("❌ Produto inválido:", produto);
      return res.status(400).json({ error: "Produto inválido ou não cadastrado." });
    }

    console.log("💳 Criando sessão de pagamento Stripe para o produto:", produto);

    // ✅ Cria uma nova sessão de checkout na Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // Pagamento único (sem assinatura)
      payment_method_types: ["card"], // Aceita apenas cartão (você pode adicionar pix, boleto etc.)

      // ✅ Produto e quantidade (1 unidade)
      line_items: [
        {
          price: precoId,
          quantity: 1,
        },
      ],

      // ✅ URLs de redirecionamento após o pagamento
      success_url: `${req.headers.origin}/obrigado-${produto}.html`, // página de sucesso
      cancel_url: `${req.headers.origin}/?canceled=true`, // caso o usuário cancele o pagamento

      // ✅ Coleta obrigatória do endereço de cobrança e nome completo
      billing_address_collection: "required",

      // ✅ Cria sempre um novo cliente na Stripe (mantém histórico)
      customer_creation: "always",

      // ✅ Campo personalizado — CPF (visível durante o checkout)
      custom_fields: [
        {
          key: "cpf",
          label: { type: "custom", custom: "CPF" },
          type: "text",
          optional: false, // obrigatório
          text: {
            minimum_length: 11,
            maximum_length: 14, // aceita com ou sem pontos e traço
          },
        },
      ],

      // ✅ (Opcional) E-mail do cliente — a Stripe coleta automaticamente se não for informado
      customer_email: undefined,

      // ✅ Metadados (útil para identificar o produto no dashboard ou webhooks)
      metadata: {
        produto: produto,
      },
    });

    // ✅ Log de sucesso com o ID da sessão criada
    console.log("✅ Sessão de pagamento criada com sucesso:", session.id);

    // ✅ Retorna o ID da sessão para o front-end redirecionar o cliente ao checkout
    return res.status(200).json({ id: session.id });

  } catch (err) {
    // 🚫 Tratamento de erros com detalhes
    console.error("❌ Erro ao criar sessão de checkout:", err);
    return res.status(500).json({
      error: "Erro ao criar sessão de checkout.",
      detalhes: err.message,
    });
  }
}
