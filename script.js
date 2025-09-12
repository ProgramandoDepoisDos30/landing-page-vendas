AOS.init({ duration: 1000 });

// Contador regressivo
const countdown = document.getElementById('countdown');
const endDate = new Date();
endDate.setDate(endDate.getDate() + 3);

function updateCountdown() {
  const now = new Date();
  const diff = endDate - now;

  if (diff <= 0) {
    countdown.innerHTML = "Oferta encerrada";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  countdown.innerHTML = `${days}d : ${hours}h : ${minutes}m : ${seconds}s`;
}

setInterval(updateCountdown, 1000);
updateCountdown();

// Inicializa Stripe
const stripe = Stripe("pk_live_51Rs9Bm2Lo3O3SUleAwr1Vbn1B6mdomDNnTIUHP2u5ptTTZKQRooWIMLVjjbjHHtq7lxAMoUw9fc6Q8wY0VgtVTn2004zFVloIo");

// Função para criar checkout
async function criarCheckout(produto) {
  try {
    const response = await fetch("https://landing-page-vendas-44l3opp9y-diego-venancios-projects.vercel.app/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto })
    });

    const session = await response.json();

    if (session.id) {
      await stripe.redirectToCheckout({ sessionId: session.id });
    } else {
      alert("Erro ao criar checkout, tente novamente.");
      console.error(session);
    }
  } catch (err) {
    alert("Erro na conexão com o servidor.");
    console.error(err);
  }
}

// Eventos dos botões
document.getElementById("btn-ebook").addEventListener("click", ()=>criarCheckout("ebook"));
document.getElementById("btn-planilhas2").addEventListener("click", ()=>criarCheckout("planilhas2"));
document.getElementById("btn-planilhas3").addEventListener("click", ()=>criarCheckout("planilhas3"));
