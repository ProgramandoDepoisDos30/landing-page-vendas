// Inicializa AOS
AOS.init({ duration: 1000 });

// Contador regressivo (3 dias de oferta)
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


// Avaliações
const estrelas = document.querySelectorAll("#estrelas .estrela");
let avaliacaoSelecionada = 0;

// Hover e clique das estrelas
estrelas.forEach((estrela) => {
  estrela.addEventListener("mouseover", () => {
    const valor = estrela.dataset.valor;
    estrelas.forEach(s => s.classList.toggle("cheia", s.dataset.valor <= valor));
  });

  estrela.addEventListener("click", () => {
    avaliacaoSelecionada = estrela.dataset.valor;
  });

  estrela.addEventListener("mouseout", () => {
    estrelas.forEach(s => s.classList.toggle("cheia", s.dataset.valor <= avaliacaoSelecionada));
  });
});


// Contador de caracteres do textarea
const comentarioInput = document.getElementById("comentario");
const contador = document.createElement("div");
contador.id = "contador";
contador.className = "text-sm text-gray-500 mb-2";
comentarioInput.parentNode.insertBefore(contador, comentarioInput.nextSibling);
contador.textContent = `0 / 60`;

comentarioInput.addEventListener("input", () => {
  contador.textContent = `${comentarioInput.value.length} / 60`;
});

// Formulário e lista de depoimentos
const formDepoimento = document.getElementById("form-depoimento");
const listaDepoimentos = document.getElementById("lista-depoimentos");
let depoimentos = []; // Armazena depoimentos localmente

// Envio do depoimento
formDepoimento.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const nome = document.getElementById("nome").value.trim();
  const comentario = comentarioInput.value.trim();
  const estrelasValor = avaliacaoSelecionada;

  if(!nome || !estrelasValor) {
    alert("Por favor, preencha seu nome e selecione uma avaliação!");
    return;
  }

  if(comentario.length > 60) {
    alert("Comentário muito longo! Máximo de 60 caracteres.");
    return;
  }

  const depoimento = { nome, comentario, estrelas: estrelasValor };
  depoimentos.push(depoimento);
  atualizarLista();

  formDepoimento.reset();
  contador.textContent = "0 / 60";
  avaliacaoSelecionada = 0;
  estrelas.forEach(s => s.classList.remove("cheia"));
});

// Atualiza a lista de depoimentos
function atualizarLista() {
  listaDepoimentos.innerHTML = depoimentos.map(d => {
    let estrelasHTML = "";
    for(let i=1; i<=5; i++){
      estrelasHTML += `<span class="estrela ${i <= d.estrelas ? "cheia" : ""} text-2xl">&#9733;</span>`;
    }
    return `<div class="bg-white p-4 rounded-xl shadow-md text-left">
              <div class="flex items-center mb-2">${estrelasHTML}</div>
              <p class="font-bold mb-1">${d.nome}</p>
              <p>${d.comentario}</p>
            </div>`;
  }).join("");
}
