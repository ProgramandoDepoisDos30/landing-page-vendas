// script.js
// ===================================================================================
// LANDING PAGE - script.js
// - Contador persistente (fase 1/2)
// - Depoimentos com Firestore (listagem em tempo real via onSnapshot, sem duplicidade)
// - Login com Google (Firebase Auth)
// - Envio de depoimentos (apenas para usuários logados)
// - Edição/Exclusão de comentários (apenas pelo próprio autor)
// - Stripe Checkout (criarCheckout mantém a mesma interface que você já usa)
// - Correção do estado dos botões Stripe ao voltar da página
// - Comentários linha a linha para estudo
// ===================================================================================

// -----------------------
// Elementos do DOM usados pelo script
// -----------------------
const countdown = document.getElementById('countdown-geral'); // elemento do contador
const formDepoimento = document.getElementById('form-depoimento'); // formulário de envio
const listaDepoimentos = document.getElementById('lista-depoimentos'); // container da lista
const feedbackDiv = document.getElementById('feedback-comentario'); // área de feedback (erro/sucesso)
const estrelasNodes = document.querySelectorAll('.estrela'); // elementos de estrela (seleção)
const btnGoogle = document.getElementById('btn-google-login'); // botão login Google
const btnLogout = document.getElementById('btn-logout'); // botão logout
const msgLogin = document.getElementById('msg-login'); // mensagem de saudação

// -----------------------
// Variáveis internas / controle
// -----------------------
let estrelasSelecionadas = 0;           // nota selecionada no formulário
let unsubscribeComments = null;        // função para cancelar o listener onSnapshot
// Observação: usamos unsubscribeComments para garantir que criamos NO MÁXIMO 1 listener
// ativo no Firestore. Isso evita a duplicação de renderizações.

// -----------------------
// CONTADOR PERSISTENTE (suas fases 1 e 2)
// -----------------------
// tempos das fases (em segundos)
const tempoFase1 = 2*3600 + 59*60 + 59; // 2h 59m 59s
const tempoFase2 = 9*60 + 59;           // 9m 59s

// chave no localStorage para persistência do contador
const contadorKey = 'contadorOficial';

// carrega estado salvo ou inicializa com fase 1
let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

// formata segundos em HH:MM:SS (útil para mostrar)
function formatTime(totalSegundos) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// atualiza o contador (chamada a cada segundo)
function atualizarContador() {
  if (!countdown) return;

  if (estado.fase === 1 || estado.fase === 2) {
    if (estado.segundosRestantes > 0) {
      estado.segundosRestantes--;
    } else {
      if (estado.fase === 1) {
        // Ao terminar fase 1, exibe mensagem curta e passa para fase 2
        countdown.innerHTML = "O tempo da sua oferta acabou, mas vou liberar essa condição por pouco tempo ainda!";
        estado.fase = 2;
        estado.segundosRestantes = tempoFase2;
        localStorage.setItem(contadorKey, JSON.stringify(estado));
        clearInterval(interval);
        // pausa 3s (mostra a mensagem) e recomeça contagem
        setTimeout(() => { interval = setInterval(atualizarContador, 1000); }, 3000);
        return;
      } else if (estado.fase === 2) {
        // Fase 2 terminou: oferta encerrada
        countdown.innerHTML = "Oferta Encerrada!";
        clearInterval(interval);
        return;
      }
    }
  }

  // atualiza exibição e salva estado no localStorage
  countdown.innerHTML = formatTime(estado.segundosRestantes);
  localStorage.setItem(contadorKey, JSON.stringify(estado));
}

let interval = setInterval(atualizarContador, 1000);
atualizarContador(); // inicia imediatamente

// -----------------------
// LÓGICA DAS ESTRELAS (seleção visual + estado)
// -----------------------
estrelasNodes.forEach(star => {
  star.addEventListener('click', () => {
    const val = parseInt(star.dataset.valor, 10);
    estrelasSelecionadas = val;
    // atualiza visuais
    estrelasNodes.forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });
    for (let i = 0; i < val; i++) {
      estrelasNodes[i].classList.remove('text-gray-300');
      estrelasNodes[i].classList.add('text-yellow-400');
    }
  });
});

// -----------------------
// FUNÇÃO: subscribir (ou reinscrever) nos comentários do Firestore
// -----------------------
function subscribeToComments() {
  if (typeof unsubscribeComments === 'function') {
    unsubscribeComments();
    unsubscribeComments = null;
  }

  unsubscribeComments = db.collection("comentarios")
    .orderBy("criadoEm", "desc")
    .onSnapshot(snapshot => {
      if (!listaDepoimentos) return;
      listaDepoimentos.innerHTML = '';

      snapshot.forEach(docSnap => {
        const dep = docSnap.data();
        const id = docSnap.id;
        const div = document.createElement('div');
        div.classList.add('bg-gray-100','p-4','rounded-lg','shadow-md','relative','mb-3');

        const nome = dep.nome || 'Usuário';
        const estrelasTexto = `${'★'.repeat(dep.estrelas || 0)}${'☆'.repeat(5 - (dep.estrelas || 0))}`;
        const pNome = document.createElement('p');
        pNome.classList.add('font-bold');
        pNome.innerHTML = `${nome} <span class="text-yellow-400">${estrelasTexto}</span>`;

        const pComentario = document.createElement('p');
        pComentario.id = `texto-${id}`;
        pComentario.textContent = dep.comentario || '';

        div.appendChild(pNome);
        div.appendChild(pComentario);

        const user = auth.currentUser;
        if (dep.uid && user && user.uid === dep.uid) {
          const btnContainer = document.createElement('div');
          btnContainer.classList.add('mt-2','flex','gap-2','absolute','top-2','right-2');

          const btnEditar = document.createElement('button');
          btnEditar.textContent = '✏️ Editar';
          btnEditar.classList.add('bg-blue-500','text-white','text-sm','px-2','py-1','rounded','hover:bg-blue-400','transition');
          btnEditar.addEventListener('click', () => editarComentario(id, dep.comentario || ''));

          const btnExcluir = document.createElement('button');
          btnExcluir.textContent = '🗑️ Excluir';
          btnExcluir.classList.add('bg-red-500','text-white','text-sm','px-2','py-1','rounded','hover:bg-red-400','transition');
          btnExcluir.addEventListener('click', () => excluirComentario(id));

          btnContainer.appendChild(btnEditar);
          btnContainer.appendChild(btnExcluir);
          div.appendChild(btnContainer);
        }

        listaDepoimentos.appendChild(div);
      });
    }, err => {
      console.error("Erro no listener de comentários:", err);
    });
}

subscribeToComments();

// -----------------------
// Função: editar comentário
// -----------------------
async function editarComentario(docId, textoAtual) {
  const modal = document.getElementById('modal-editar');
  const textarea = document.getElementById('modal-textarea');
  const btnSave = document.getElementById('modal-save');
  const btnCancel = document.getElementById('modal-cancel');

  textarea.value = textoAtual;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  btnCancel.onclick = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  btnSave.onclick = async () => {
    const textoLimpo = textarea.value.trim();
    if (textoLimpo.length === 0) {
      alert("Comentário não pode ficar vazio.");
      return;
    }

    try {
      await db.collection("comentarios").doc(docId).update({ comentario: textoLimpo });
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      feedbackDiv.textContent = "Comentário atualizado com sucesso!";
      feedbackDiv.className = 'text-green-600 font-semibold mt-2';
      setTimeout(() => { feedbackDiv.textContent = ''; feedbackDiv.className = ''; }, 2500);
    } catch (err) {
      console.error("Erro ao atualizar comentário:", err);
      alert("Erro ao atualizar comentário. Veja console.");
    }
  };
}

// -----------------------
// Função: excluir comentário
// -----------------------
async function excluirComentario(docId) {
  if (!confirm("Deseja realmente excluir seu comentário?")) return;
  try {
    await db.collection("comentarios").doc(docId).delete();
    feedbackDiv.textContent = "Comentário excluído com sucesso!";
    feedbackDiv.className = 'text-green-600 font-semibold mt-2';
    setTimeout(() => { feedbackDiv.textContent = ''; feedbackDiv.className = ''; }, 2500);
  } catch (err) {
    console.error("Erro ao excluir comentário:", err);
    alert("Erro ao excluir comentário. Verifique o console.");
  }
}

// -----------------------
// Submissão do formulário de depoimento
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
  } catch (err) {
    console.error("Erro ao enviar comentário:", err);
    feedbackDiv.textContent = "Erro ao enviar comentário.";
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
  }
});

// -----------------------
// Firebase Auth (Google only) - login, logout e controle de UI
// -----------------------
btnGoogle?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
      btnGoogle.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      formDepoimento?.classList.remove('hidden');
      subscribeToComments();
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
    subscribeToComments();
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
  subscribeToComments();
});

// -----------------------
// Inicializa AOS (animações - já referenciado no HTML)
// -----------------------
AOS.init();

// -----------------------
// STRIPE CHECKOUT
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

// ========================
// Corrige estado dos botões Stripe ao voltar da página
// ========================
window.addEventListener('pageshow', (event) => {
  if (event.persisted || performance.getEntriesByType("navigation")[0].type === "back_forward") {
    const botoes = [
      document.getElementById('btn-ebook'),
      document.getElementById('btn-planilhas2'),
      document.getElementById('btn-planilhas3')
    ];
    botoes.forEach(btn => {
      if (btn) {
        btn.disabled = false;
        // recupera o texto original
        if (btn.id === 'btn-ebook') btn.innerHTML = "Comprar";
        if (btn.id === 'btn-planilhas2') btn.innerHTML = "Comprar";
        if (btn.id === 'btn-planilhas3') btn.innerHTML = "Comprar";
      }
    });
  }
});
