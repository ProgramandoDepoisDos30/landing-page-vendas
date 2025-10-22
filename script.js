// script.js
// =========================================
// SCRIPT.JS COMPLETO - LANDING PAGE
// (Atualizado: login apenas com Google; formulário de depoimentos só aparece após login)
// =========================================

// -----------------------
// Contador Persistente
// -----------------------
/* pega o elemento onde o contador é mostrado */
const countdown = document.getElementById('countdown-geral'); // elemento do DOM para o contador
const contadorKey = 'contadorOficial'; // chave do localStorage para persistir estado

/* tempos das fases (em segundos) */
const tempoFase1 = 2*3600 + 59*60 + 59; // 2h 59m 59s
const tempoFase2 = 9*60 + 59;           // 9m 59s

/* carrega estado salvo ou inicializa com fase 1 */
let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

/* formata segundos para HH:MM:SS */
function formatTime(totalSegundos) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

/* função que atualiza o contador (executada a cada segundo) */
function atualizarContador() {
  if (!countdown) return; // se elemento não existir, sai

  if (estado.fase === 1 || estado.fase === 2) {
    if (estado.segundosRestantes > 0) {
      estado.segundosRestantes--;
    } else {
      if (estado.fase === 1) {
        // passa para fase 2 (mensagem curta, depois inicia contagem da fase 2)
        countdown.innerHTML = "O tempo da sua oferta acabou, mas vou liberar essa condição por pouco tempo ainda!";
        estado.fase = 2;
        estado.segundosRestantes = tempoFase2;
        localStorage.setItem(contadorKey, JSON.stringify(estado));
        clearInterval(interval);
        setTimeout(() => { interval = setInterval(atualizarContador, 1000); }, 3000);
        return;
      } else if (estado.fase === 2) {
        // oferta encerrada definitivamente
        countdown.innerHTML = "Oferta Encerrada!";
        clearInterval(interval);
        return;
      }
    }
  }

  // atualiza exibição e salva estado
  countdown.innerHTML = formatTime(estado.segundosRestantes);
  localStorage.setItem(contadorKey, JSON.stringify(estado));
}

/* inicia loop do contador */
let interval = setInterval(atualizarContador, 1000);
atualizarContador();


// -----------------------
// Depoimentos (Firestore)
// -----------------------
/* elementos do DOM usados para comentários */
const formDepoimento = document.getElementById('form-depoimento'); // formulário (oculto para não logados)
const listaDepoimentos = document.getElementById('lista-depoimentos'); // área de listagem
const feedbackDiv = document.getElementById('feedback-comentario'); // área de feedback
let estrelasSelecionadas = 0; // guarda nota escolhida

/* lógica das estrelas (seleção visual) */
document.querySelectorAll('.estrela').forEach(star => {
  star.addEventListener('click', () => {
    estrelasSelecionadas = parseInt(star.dataset.valor, 10); // converte data-valor
    // reseta visual
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });
    // marca as estrelas até o valor selecionado
    for (let i = 0; i < estrelasSelecionadas; i++) {
      document.querySelectorAll('.estrela')[i].classList.add('text-yellow-400');
      document.querySelectorAll('.estrela')[i].classList.remove('text-gray-300');
    }
  });
});

/* função que carrega depoimentos do Firestore e os renderiza na página */
async function renderizarDepoimentos() {
  if (!listaDepoimentos) return; // se elemento não existir, sai
  listaDepoimentos.innerHTML = ''; // limpa lista antes de renderizar

  try {
    // consulta coleção "comentarios" ordenada por data de criação (desc)
    const snapshot = await db.collection("comentarios").orderBy("criadoEm", "desc").get();
    snapshot.forEach(docSnap => {
      const dep = docSnap.data(); // dados do documento
      // cria container do depoimento
      const div = document.createElement('div');
      div.classList.add('bg-gray-100', 'p-4', 'rounded-lg', 'shadow-md', 'relative');
      // monta HTML usando nome (dep.nome) e estrelas (dep.estrelas) e comentário (dep.comentario)
      div.innerHTML = `
        <p class="font-bold">${dep.nome || 'Usuario'} <span class="text-yellow-400">${'★'.repeat(dep.estrelas || 0)}${'☆'.repeat(5 - (dep.estrelas || 0))}</span></p>
        <p>${dep.comentario || ''}</p>
      `;
      listaDepoimentos.appendChild(div); // adiciona à lista
    });
  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}

/* renderiza ao carregar o script */
renderizarDepoimentos();

/* submissão do formulário de depoimento
   OBS: o formulário não contém campo 'nome' — o nome será obtido do usuário autenticado (displayName)
*/
formDepoimento?.addEventListener('submit', async (e) => {
  e.preventDefault(); // evita comportamento padrão de envio

  // pega texto do comentário
  const comentario = document.getElementById('comentario').value.trim();

  // limpa feedback
  feedbackDiv.textContent = '';
  feedbackDiv.className = '';

  // validações básicas
  if (!comentario || estrelasSelecionadas === 0) {
    feedbackDiv.textContent = "Preencha comentário e selecione uma avaliação.";
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
    return;
  }

  // pega usuário atual (garantido que form só aparece quando user está logado)
  const user = auth.currentUser;
  if (!user) {
    feedbackDiv.textContent = "Você precisa estar logado para enviar um depoimento.";
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
    return;
  }

  try {
    // salva no Firestore
    await db.collection("comentarios").add({
      nome: user.displayName || user.email || 'Usuário',
      uid: user.uid,
      comentario,
      estrelas: estrelasSelecionadas,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    // reseta UI
    document.getElementById('comentario').value = '';
    estrelasSelecionadas = 0;
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });

    feedbackDiv.textContent = "Comentário enviado com sucesso!";
    feedbackDiv.classList.add('text-green-600','font-semibold','mt-2');

    // recarrega lista de depoimentos
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
/* elementos de autenticação */
const btnGoogle = document.getElementById('btn-google-login'); // botão que dispara popup Google
const btnLogout = document.getElementById('btn-logout');       // botão logout
const msgLogin = document.getElementById('msg-login');         // mostra "Olá, Nome"
const authArea = document.getElementById('auth-area');         // área de auth (opcional)

/* ao clicar no botão Google: abre popup de autenticação */
btnGoogle?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider(); // provider Google
  auth.signInWithPopup(provider)
    .then((result) => {
      // sucesso: resultado contém user
      const user = result.user;
      // mostra mensagem de boas-vindas
      msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
      // esconde botão de login, mostra o logout e o formulário de depoimento
      btnGoogle.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      formDepoimento?.classList.remove('hidden');
    })
    .catch((error) => {
      // erro (ex: domínio não autorizado, popup bloqueado, etc.)
      console.error("Erro ao logar com Google:", error);
      alert("Falha ao fazer login. Tente novamente.");
    });
});

/* logout: desconecta usuário e ajusta UI */
btnLogout?.addEventListener('click', () => {
  auth.signOut().then(() => {
    // limpa estado UI após logout
    msgLogin.textContent = '';
    btnGoogle.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    formDepoimento?.classList.add('hidden');
  }).catch(err => {
    console.error("Erro no logout:", err);
    alert("Erro ao efetuar logout: " + (err.message || err));
  });
});

/* observar mudanças de autenticação (mantém sessão após reload) */
auth.onAuthStateChanged((user) => {
  if (user) {
    // usuário está logado: atualiza UI adequadamente
    msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
    btnGoogle.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    formDepoimento?.classList.remove('hidden');
  } else {
    // usuário deslogado: esconde o formulário
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
// Stripe Checkout (mantido como antes)
// -----------------------
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Rs9Bm2Lo3O3SUleAwr1Vbn1B6mdomDNnTIUHP2u5ptTTZKQRooWIMLVjjbjHHtq7lxAMoUw9fc6Q8wY0VgtVTn2004zFVloIo"; 
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

/* cria sessão chamado /api/checkout (o backend precisa existir em produção) */
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

/* associa botões às ações de checkout */
document.getElementById('btn-ebook')?.addEventListener('click', (e) => criarCheckout('ebook', e.currentTarget));
document.getElementById('btn-planilhas2')?.addEventListener('click', (e) => criarCheckout('planilhas2', e.currentTarget));
document.getElementById('btn-planilhas3')?.addEventListener('click', (e) => criarCheckout('planilhas3', e.currentTarget));
