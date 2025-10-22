// =========================================
// SCRIPT.JS COMPLETO - LANDING PAGE ATUALIZADO
// =========================================
// ✅ Agora com funções para EDITAR e EXCLUIR comentários (somente o autor)
// =========================================


// -----------------------
// Contador Persistente
// -----------------------
const countdown = document.getElementById('countdown-geral'); // elemento do contador
const contadorKey = 'contadorOficial'; // chave no localStorage para salvar o estado

// tempos das fases (em segundos)
const tempoFase1 = 2*3600 + 59*60 + 59; // 2h 59m 59s
const tempoFase2 = 9*60 + 59;           // 9m 59s

// carrega estado salvo (ou inicia com fase 1)
let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

// formata segundos em HH:MM:SS
function formatTime(totalSegundos) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// atualiza o contador a cada segundo
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

// Seleção de estrelas
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


// -----------------------
// Função principal para carregar depoimentos
// -----------------------
async function renderizarDepoimentos() {
  if (!listaDepoimentos) return;
  listaDepoimentos.innerHTML = ''; // limpa antes de renderizar

  try {
    // pega usuário logado (pode ser null)
    const user = auth.currentUser;

    // busca todos os comentários no Firestore (mais recentes primeiro)
    const snapshot = await db.collection("comentarios").orderBy("criadoEm", "desc").get();

    // percorre os comentários
    snapshot.forEach(docSnap => {
      const dep = docSnap.data();
      const id = docSnap.id;

      // cria container do depoimento
      const div = document.createElement('div');
      div.classList.add('bg-gray-100', 'p-4', 'rounded-lg', 'shadow-md', 'relative', 'mb-3');

      // renderiza conteúdo principal (nome + estrelas + comentário)
      let html = `
        <p class="font-bold">${dep.nome || 'Usuário'} 
          <span class="text-yellow-400">
            ${'★'.repeat(dep.estrelas || 0)}${'☆'.repeat(5 - (dep.estrelas || 0))}
          </span>
        </p>
        <p id="texto-${id}">${dep.comentario || ''}</p>
      `;

      // se o usuário logado for o autor, mostra botões Editar/Excluir
      if (user && user.uid === dep.uid) {
        html += `
          <div class="absolute top-2 right-2 space-x-2">
            <button class="bg-blue-500 text-white text-sm px-2 py-1 rounded editar-btn" data-id="${id}">✏️ Editar</button>
            <button class="bg-red-500 text-white text-sm px-2 py-1 rounded excluir-btn" data-id="${id}">🗑️ Excluir</button>
          </div>
        `;
      }

      div.innerHTML = html;
      listaDepoimentos.appendChild(div);
    });

    // adiciona eventos aos botões (após renderizar)
    document.querySelectorAll('.editar-btn').forEach(btn => {
      btn.addEventListener('click', () => editarComentario(btn.dataset.id));
    });
    document.querySelectorAll('.excluir-btn').forEach(btn => {
      btn.addEventListener('click', () => excluirComentario(btn.dataset.id));
    });

  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}


// -----------------------
// Função para editar comentário
// -----------------------
async function editarComentario(id) {
  try {
    // busca documento pelo ID
    const docRef = db.collection("comentarios").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return alert("Comentário não encontrado!");

    const dep = docSnap.data();
    const novoTexto = prompt("Edite seu comentário:", dep.comentario || "");
    if (novoTexto === null) return; // usuário cancelou

    const textoLimpo = novoTexto.trim();
    if (!textoLimpo) return alert("O comentário não pode ficar vazio.");

    // atualiza no Firestore
    await docRef.update({ comentario: textoLimpo });
    alert("Comentário atualizado com sucesso!");

    // atualiza na tela
    document.getElementById(`texto-${id}`).textContent = textoLimpo;

  } catch (err) {
    console.error("Erro ao editar comentário:", err);
    alert("Erro ao editar comentário.");
  }
}


// -----------------------
// Função para excluir comentário
// -----------------------
async function excluirComentario(id) {
  if (!confirm("Tem certeza que deseja excluir seu comentário?")) return;

  try {
    await db.collection("comentarios").doc(id).delete();
    alert("Comentário excluído com sucesso!");
    renderizarDepoimentos(); // recarrega lista
  } catch (err) {
    console.error("Erro ao excluir comentário:", err);
    alert("Erro ao excluir comentário.");
  }
}


// -----------------------
// Enviar novo comentário
// -----------------------
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
    // salva novo comentário
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
    .then(result => {
      const user = result.user;
      msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
      btnGoogle.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      formDepoimento?.classList.remove('hidden');
      renderizarDepoimentos(); // atualiza comentários com botões do autor
    })
    .catch(error => {
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
    renderizarDepoimentos(); // recarrega sem botões de edição
  }).catch(err => {
    console.error("Erro no logout:", err);
    alert("Erro ao efetuar logout: " + (err.message || err));
  });
});

auth.onAuthStateChanged(user => {
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
  renderizarDepoimentos(); // atualiza lista conforme login
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
