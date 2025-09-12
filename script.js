// Inicializa AOS
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

// Função de checkout Stripe
async function comprar(produto) {
  try {
    const response = await fetch("https://landing-page-vendas-r8vpwse3w-diego-venancios-projects.vercel.app/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto })
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Erro ao criar checkout. Tente novamente.");
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao processar pagamento.");
  }
}
