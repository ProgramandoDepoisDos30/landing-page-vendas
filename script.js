// =========================================
// SCRIPT.JS COMPLETO - LANDING PAGE
// (Atualizado: login apenas com Google; formulário de depoimentos só aparece após login)
// Adicionado: editar/excluir comentários apenas para autor
// =========================================

// -----------------------
// Contador Persistente
// -----------------------
const countdown = document.getElementById('countdown-geral'); // elemento do DOM para o contador
const contadorKey = 'contadorOficial'; // chave do localStorage para persistir estado

const tempoFase1 = 2*3600 + 59*60 + 59; // 2h 59m 59s
const tempoFase2 = 9*60 + 59;           // 9m 59s

let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

function formatTime(totalSegundos) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function atualizarContador() {
  if (!countdown) return;
  if (estado.fase === 1 || estado.fase === 2) {
    if (estado.segundosRestantes > 0) {
      estado.segundosRestantes--;
    } else {
      if (estado.fase === 1) {
        countdown.innerHTML = "O tempo da sua oferta acabou, mas vou liberar essa condição por pouco tempo ainda!";
        estado.fase = 2;
        estado.segundosRestantes = tempoFase2;
        localStorage.setItem(contadorKey, JSON.stringify(estado));
        clearInterval(interval);
        setTimeout(() => { interval = setInterval(atualizarContador, 1000); }, 3000);
        return;
      } else if (estado.fase === 2) {
        countdown.innerHTML = "Oferta Encerrada!";
        clearInterval(interval);
        return;
      }
    }
  }
  countdown.innerHTML = formatTime(estado.segundosRestantes);
  localStorage.setItem(contadorKey, JSON.stringify(estado));
}

let interval = setInterval(atualizarContador, 1000);
atualizarContador();


// -----------------------
// Depoimentos (Firestore)
// -----------------------
const formDepoimento = document.getElementById('form-depoimento');
const listaDepoimentos = document.getElementById('lista-depoimentos');
const feedbackDiv = document.getElementById('feedback-comentario');
let estrelasSelecionadas = 0;

// lógica das estrelas (seleção visual)
document.querySelectorAll('.estrela').forEach(star => {
  star.addEventListener('click', () => {
    estrelasSelecionadas = parseInt(star.dataset.valor, 10);
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });
    for (let i = 0; i < estrelasSelecionadas; i++) {
      document.querySelectorAll('.estrela')[i].classList.add('text-yellow-400');
      document.querySelectorAll('.estrela')[i].classList.remove('text-gray-300');
    }
  });
});

// função que renderiza depoimentos
async function renderizarDepoimentos() {
  if (!listaDepoimentos) return;
  listaDepoimentos.innerHTML = '';

  try {
    const snapshot = await db.collection("comentarios").orderBy("criadoEm", "desc").get();
    const currentUser = auth.currentUser; // usuário logado (pode ser null)

    snapshot.forEach(docSnap => {
      const dep = docSnap.data();
      const docId = docSnap.id;

      const div = document.createElement('div');
      div.classList.add('bg-gray-100', 'p-4', 'rounded-lg', 'shadow-md', 'relative');

      // HTML básico do comentário
      div.innerHTML = `
        <p class="font-bold">${dep.nome || 'Usuario'} 
          <span class="text-yellow-400">${'★'.repeat(dep.estrelas || 0)}${'☆'.repeat(5 - (dep.estrelas || 0))}</span>
        </p>
        <p id="comentario-texto-${docId}">${dep.comentario || ''}</p>
      `;

      // Se o comentário pertence ao usuário logado, adiciona botões editar/excluir
      if (currentUser && dep.uid === currentUser.uid) {
        const btnEditar = document.createElement('button');
        btnEditar.textContent = "Editar";
        btnEditar.classList.add('bg-blue-500','text-white','px-2','py-1','rounded','mr-2','mt-2','hover:bg-blue-400','transition');
        btnEditar.addEventListener('click', () => editarComentario(docId, dep.comentario));

        const btnExcluir = document.createElement('button');
        btnExcluir.textContent = "Excluir";
        btnExcluir.classList.add('bg-red-500','text-white','px-2','py-1','rounded','mt-2','hover:bg-red-400','transition');
        btnExcluir.addEventListener('click', () => excluirComentario(docId));

        div.appendChild(btnEditar);
        div.appendChild(btnExcluir);
      }

      listaDepoimentos.appendChild(div);
    });
  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}

// função para editar comentário
function editarComentario(docId, textoAtual) {
  const novoTexto = prompt("Edite seu comentário:", textoAtual);
  if (novoTexto !== null && novoTexto.trim() !== "") {
    db.collection("comentarios").doc(docId).update({ comentario: novoTexto.trim() })
      .then(() => {
        renderizarDepoimentos();
      })
      .catch(err => {
        console.error("Erro ao atualizar comentário:", err);
        alert("Não foi possível atualizar comentário.");
      });
  }
}

// função para excluir comentário
function excluirComentario(docId) {
  if (confirm("Deseja realmente excluir este comentário?")) {
    db.collection("comentarios").doc(docId).delete()
      .then(() => {
        renderizarDepoimentos();
      })
      .catch(err => {
        console.error("Erro ao excluir comentário:", err);
        alert("Não foi possível excluir comentário.");
      });
  }
}

// renderiza comentários ao carregar
renderizarDepoimentos();

// submissão do formulário de depoimento
formDepoimento?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const comentario = document.getElementById('comentario').value.trim();
  feedbackDiv.textContent = '';
  feedbackDiv.className = '';

  if (!comentario || estrelasSelecionadas === 0) {
    feedbackDiv.textContent = "Preencha comentário e selecione uma avaliação.";
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    feedbackDiv.textContent = "Você precisa estar logado para enviar um depoimento.";
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
    return;
  }

  try {
    await db.collection("comentarios").add({
      nome: user.displayName || user.email || 'Usuário',
      uid: user.uid,
      comentario,
      estrelas: estrelasSelecionadas,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('comentario').value = '';
    estrelasSelecionadas = 0;
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });

    feedbackDiv.textContent = "Comentário enviado com sucesso!";
    feedbackDiv.classList.add('text-green-600','font-semibold','mt-2');

    renderizarDepoimentos();
  } catch (err) {
    console.error(err);
    feedbackDiv.textContent = "Erro ao enviar comentário.";
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
  }
});


// -----------------------
// Firebase Auth (Google only)
// -----------------------
const btnGoogle = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');
const msgLogin = document.getElementById('msg-login');

btnGoogle?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
      btnGoogle.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      formDepoimento?.classList.remove('hidden');
      renderizarDepoimentos(); // atualiza botões de edição/exclusão
    })
    .catch((error) => {
      console.error("Erro ao logar com Google:", error);
      alert("Falha ao fazer login. Tente novamente.");
    });
});

btnLogout?.addEventListener('click', () => {
  auth.signOut().then(() => {
    msgLogin.textContent = '';
    btnGoogle.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    formDepoimento?.classList.add('hidden');
    renderizarDepoimentos(); // remove botões de edição/exclusão
  }).catch(err => {
    console.error("Erro no logout:", err);
    alert("Erro ao efetuar logout: " + (err.message || err));
  });
});

auth.onAuthStateChanged((user) => {
  if (user) {
    msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
    btnGoogle.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    formDepoimento?.classList.remove('hidden');
  } else {
    msgLogin.textContent = '';
    btnGoogle.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    formDepoimento?.classList.add('hidden');
  }
});

// -----------------------
// Inicializa AOS
// -----------------------
AOS.init();

// -----------------------
// Stripe Checkout
// -----------------------
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Rs9Bm2Lo3O3SUleAwr1Vbn1B6mdomDNnTIUHP2u5ptTTZKQRooWIMLVjjbjHHtq7lxAMoUw9fc6Q8wY0VgtVTn2004zFVloIo"; 
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

async function criarCheckout(produto, btn) {
  if (!stripe) {
    alert('Stripe não inicializado.');
    return;
  }

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = "Redirecionando...";

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ produto })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.error || err.message || 'Erro ao criar sessão de checkout');
    }

    const data = await res.json();
    if (!data.id) throw new Error('Resposta inválida do servidor');

    const result = await stripe.redirectToCheckout({ sessionId: data.id });
    if (result.error) {
      alert(result.error.message);
      console.error(result.error);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

  } catch (err) {
    console.error(err);
    alert('Erro ao processar pagamento. Veja console.');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

document.getElementById('btn-ebook')?.addEventListener('click', (e) => criarCheckout('ebook', e.currentTarget));
document.getElementById('btn-planilhas2')?.addEventListener('click', (e) => criarCheckout('planilhas2', e.currentTarget));
document.getElementById('btn-planilhas3')?.addEventListener('click', (e) => criarCheckout('planilhas3', e.currentTarget));
