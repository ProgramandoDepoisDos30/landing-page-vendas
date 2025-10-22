// =======================
// script.js
// =======================

// =======================
// Variáveis Globais
// =======================
let userLogado = null;         // Guarda os dados do usuário logado
let notaSelecionada = 0;       // Nota selecionada no formulário (1 a 5 estrelas)
const estrelas = document.querySelectorAll(".estrela"); // Seleciona todas as estrelas

// =======================
// Configuração das Estrelas (avaliação)
// =======================
estrelas.forEach(estrela => {
  estrela.addEventListener("click", () => {
    notaSelecionada = parseInt(estrela.dataset.valor); // salva valor da estrela clicada
    atualizarEstrelas(); // atualiza visualmente as estrelas
  });
});

function atualizarEstrelas() {
  estrelas.forEach(estrela => {
    estrela.style.color = (parseInt(estrela.dataset.valor) <= notaSelecionada) ? "#FACC15" : "#D1D5DB";
  });
}

// =======================
// Login e Logout Google (Firebase Auth)
// =======================
const btnLogin = document.getElementById("btn-google-login");
const btnLogout = document.getElementById("btn-logout");
const msgLogin = document.getElementById("msg-login");
const formDepoimento = document.getElementById("form-depoimento");

// Provider Google
const provider = new firebase.auth.GoogleAuthProvider();

// Evento login
btnLogin.addEventListener("click", () => {
  auth.signInWithPopup(provider)
    .then(result => {
      userLogado = result.user;
      atualizarUI(); // atualiza interface para usuário logado
    })
    .catch(error => {
      console.error("Erro login Google:", error);
    });
});

// Evento logout
btnLogout.addEventListener("click", () => {
  auth.signOut().then(() => {
    userLogado = null;
    atualizarUI(); // atualiza interface para usuário deslogado
  });
});

// =======================
// Atualiza interface dependendo do status do usuário
// =======================
function atualizarUI() {
  if (userLogado) {
    msgLogin.textContent = `Olá, ${userLogado.displayName}! Você pode deixar seu depoimento.`;
    btnLogin.style.display = "none";
    btnLogout.style.display = "inline-block";
    formDepoimento.classList.remove("hidden");
  } else {
    msgLogin.textContent = "";
    btnLogin.style.display = "inline-flex";
    btnLogout.style.display = "none";
    formDepoimento.classList.add("hidden");
  }
}

// =======================
// Envio de depoimento (Firestore)
// =======================
formDepoimento.addEventListener("submit", (e) => {
  e.preventDefault(); // previne reload da página

  const comentario = document.getElementById("comentario").value.trim();
  if (!notaSelecionada || !comentario) {
    alert("Selecione uma nota e escreva seu comentário!");
    return;
  }

  // Cria objeto do depoimento
  const novoDepoimento = {
    uid: userLogado.uid,
    nome: userLogado.displayName,
    nota: notaSelecionada,
    comentario: comentario,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Salva no Firestore
  db.collection("depoimentos").add(novoDepoimento)
    .then(() => {
      document.getElementById("comentario").value = "";
      notaSelecionada = 0;
      atualizarEstrelas();
      carregarDepoimentos(); // recarrega lista
      document.getElementById("feedback-comentario").textContent = "Depoimento enviado com sucesso!";
      setTimeout(() => { document.getElementById("feedback-comentario").textContent = ""; }, 3000);
    })
    .catch(err => console.error("Erro ao salvar depoimento:", err));
});

// =======================
// Carrega depoimentos (Firestore + comentários antigos)
// =======================
function carregarDepoimentos() {
  const lista = document.getElementById("lista-depoimentos");
  lista.innerHTML = ""; // limpa lista

  // Primeiro, carrega comentários antigos (sem login)
  const comentariosAntigos = [
    { nome: "João", nota: 5, comentario: "Ótimo sistema!", uid: null },
    { nome: "Maria", nota: 4, comentario: "Me ajudou muito.", uid: null },
  ];

  comentariosAntigos.forEach(d => {
    const div = criarDepoimentoHTML(d, false); // false = não permite editar/excluir
    lista.appendChild(div);
  });

  // Agora, carrega depoimentos do Firestore (usuários logados)
  db.collection("depoimentos").orderBy("timestamp", "desc").get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        d.id = doc.id; // salva id do documento
        const div = criarDepoimentoHTML(d, true); // true = permite editar/excluir
        lista.appendChild(div);
      });
    });
}

// =======================
// Cria HTML de um depoimento
// permiteEditar: se true, adiciona botões de editar/excluir
// =======================
function criarDepoimentoHTML(depoimento, permiteEditar) {
  const div = document.createElement("div");
  div.className = "bg-white p-4 rounded shadow-md text-left";

  const estrelasHTML = "★".repeat(depoimento.nota) + "☆".repeat(5 - depoimento.nota);

  div.innerHTML = `
    <p class="font-bold">${depoimento.nome}</p>
    <p class="text-yellow-400 mb-2">${estrelasHTML}</p>
    <p class="comentario-texto">${depoimento.comentario}</p>
  `;

  if (permiteEditar && userLogado && depoimento.uid === userLogado.uid) {
    // Botões editar/excluir só aparecem para o próprio usuário logado
    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.className = "bg-blue-500 text-white px-2 py-1 rounded mr-2";
    btnEditar.addEventListener("click", () => editarComentario(div, depoimento));

    const btnExcluir = document.createElement("button");
    btnExcluir.textContent = "Excluir";
    btnExcluir.className = "bg-red-500 text-white px-2 py-1 rounded";
    btnExcluir.addEventListener("click", () => excluirComentario(depoimento.id));

    div.appendChild(btnEditar);
    div.appendChild(btnExcluir);
  }

  return div;
}

// =======================
// Editar comentário
// =======================
function editarComentario(div, depoimento) {
  const textoP = div.querySelector(".comentario-texto");
  const input = document.createElement("input");
  input.type = "text";
  input.value = textoP.textContent;
  input.className = "w-full p-1 border rounded mb-2";

  // Botão salvar
  const btnSalvar = document.createElement("button");
  btnSalvar.textContent = "Salvar";
  btnSalvar.className = "bg-green-500 text-white px-2 py-1 rounded mr-2";

  // Botão cancelar
  const btnCancelar = document.createElement("button");
  btnCancelar.textContent = "Cancelar";
  btnCancelar.className = "bg-gray-500 text-white px-2 py-1 rounded";

  // Substitui texto por input
  div.innerHTML = ""; // limpa div
  div.appendChild(input);
  div.appendChild(btnSalvar);
  div.appendChild(btnCancelar);

  btnSalvar.addEventListener("click", () => {
    const novoComentario = input.value.trim();
    if (!novoComentario) return alert("Comentário não pode ficar vazio!");

    // Atualiza Firestore
    db.collection("depoimentos").doc(depoimento.id).update({ comentario: novoComentario })
      .then(() => carregarDepoimentos())
      .catch(err => console.error("Erro ao atualizar comentário:", err));
  });

  btnCancelar.addEventListener("click", () => {
    carregarDepoimentos(); // volta para visualização normal
  });
}

// =======================
// Excluir comentário
// =======================
function excluirComentario(id) {
  if (!confirm("Deseja realmente excluir este comentário?")) return;
  db.collection("depoimentos").doc(id).delete()
    .then(() => carregarDepoimentos())
    .catch(err => console.error("Erro ao excluir comentário:", err));
}

// =======================
// Inicializa carregamento
// =======================
window.addEventListener("load", () => {
  carregarDepoimentos(); // carrega comentários ao abrir página
  atualizarUI();          // atualiza UI dependendo do login
});

// =======================
// Contador (já existente, apenas lembrando que ele está em outro trecho)
// =======================
function iniciarContador(fimData) {
  const countdown = document.getElementById("countdown-geral");
  function atualizarContador() {
    const agora = new Date().getTime();
    const distancia = fimData - agora;

    if (distancia < 0) {
      countdown.textContent = "Oferta encerrada!";
      clearInterval(intervalo);
      return;
    }

    const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

    countdown.textContent = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
  }

  const intervalo = setInterval(atualizarContador, 1000);
  atualizarContador();
}

// Exemplo de chamada: definir data final da oferta
// iniciarContador(new Date("2025-12-31T23:59:59").getTime());
