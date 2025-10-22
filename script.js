// =========================================
// SCRIPT.JS COMPLETO - LANDING PAGE
// (Preserva layout dos botões; corrige duplicações/bugs de edição)
// =========================================

// -----------------------
// Contador Persistente
// -----------------------
const countdown = document.getElementById('countdown-geral'); // elemento do DOM que mostra o tempo
const contadorKey = 'contadorOficial';                        // chave localStorage para persistir estado

// tempos das fases em segundos (mesmas durações que você definiu)
const tempoFase1 = 2 * 3600 + 59 * 60 + 59; // 2h 59m 59s
const tempoFase2 = 9 * 60 + 59;             // 9m 59s

// carrega estado salvo no localStorage, ou inicia com fase 1
let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

// formata segundos em "HH:MM:SS"
function formatTime(totalSegundos) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// rotina que atualiza o contador e persiste o estado
function atualizarContador() {
  if (!countdown) return; // se elemento não existe, sair

  if (estado.fase === 1 || estado.fase === 2) {
    if (estado.segundosRestantes > 0) {
      estado.segundosRestantes--;
    } else {
      // transições entre fases
      if (estado.fase === 1) {
        countdown.innerHTML = "O tempo da sua oferta acabou, mas vou liberar essa condição por pouco tempo ainda!";
        estado.fase = 2;
        estado.segundosRestantes = tempoFase2;
        localStorage.setItem(contadorKey, JSON.stringify(estado));
        clearInterval(interval);
        setTimeout(() => {
          interval = setInterval(atualizarContador, 1000);
        }, 3000);
        return;
      } else if (estado.fase === 2) {
        countdown.innerHTML = "Oferta Encerrada!";
        clearInterval(interval);
        return;
      }
    }
  }

  // atualiza a exibição e salva o estado
  countdown.innerHTML = formatTime(estado.segundosRestantes);
  localStorage.setItem(contadorKey, JSON.stringify(estado));
}

// inicia loop do contador
let interval = setInterval(atualizarContador, 1000);
atualizarContador();


// -----------------------
// Depoimentos (Firestore)
// -----------------------
const formDepoimento = document.getElementById('form-depoimento');   // formulário (aparece só para logados)
const listaDepoimentos = document.getElementById('lista-depoimentos'); // container onde comentários serão inseridos
const feedbackDiv = document.getElementById('feedback-comentario');   // área de feedback para o usuário
let estrelasSelecionadas = 0; // nota atual selecionada pelo usuário

// -----------------------
// Seleção das estrelas (UI)
// -----------------------
document.querySelectorAll('.estrela').forEach(star => {
  // adiciona o listener apenas UMA vez no carregamento do script
  star.addEventListener('click', () => {
    // pega o valor (data-valor) da estrela clicada
    estrelasSelecionadas = parseInt(star.dataset.valor, 10);

    // reseta visual de todas as estrelas
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });

    // marca as estrelas até o valor selecionado
    for (let i = 0; i < estrelasSelecionadas; i++) {
      const s = document.querySelectorAll('.estrela')[i];
      if (s) {
        s.classList.add('text-yellow-400');
        s.classList.remove('text-gray-300');
      }
    }
  });
});


// -----------------------
// Renderizar depoimentos
// -----------------------
// Observações importantes:
// - Cria os elementos dinamicamente e ANEXA listeners diretamente aos botões recém-criados.
// - Evita querySelectorAll + re-binding em massa após render (isso pode causar duplicações indiretas).
// - Re-renderiza a lista inteira após operações que alteram dados (criar/editar/excluir) para garantir consistência.
async function renderizarDepoimentos() {
  if (!listaDepoimentos) return;
  listaDepoimentos.innerHTML = ''; // limpa container para re-render limpo

  try {
    // pega usuário atual (pode ser null)
    const usuarioAtual = auth.currentUser;

    // busca comentários no Firestore ordenados por data (mais recentes primeiro)
    const snapshot = await db.collection("comentarios").orderBy("criadoEm", "desc").get();

    // itera sobre os documentos e cria elementos
    snapshot.forEach(docSnap => {
      const dep = docSnap.data() || {};
      const id = docSnap.id;

      // container principal do comentário
      const div = document.createElement('div');
      div.className = 'bg-gray-100 p-4 rounded-lg shadow-md relative mb-3';
      div.setAttribute('data-id', id); // atributo útil para depuração

      // conteúdo principal (nome, estrelas, texto)
      const nome = dep.nome || 'Usuário';
      const estrelas = '★'.repeat(dep.estrelas || 0) + '☆'.repeat(5 - (dep.estrelas || 0));
      const comentarioTexto = dep.comentario || '';

      // monta HTML base (preserva estilo/posição dos botões que você prefere)
      let inner = `
        <p class="font-bold">${escapeHtml(nome)}
          <span class="text-yellow-400"> ${estrelas}</span>
        </p>
        <p id="texto-${id}" class="mt-1">${escapeHtml(comentarioTexto)}</p>
      `;

      // se o autor do comentário for o usuário atual, adiciona os botões no canto superior direito
      if (usuarioAtual && usuarioAtual.uid === dep.uid) {
        inner += `
          <div class="absolute top-2 right-2 space-x-2">
            <button class="bg-blue-500 text-white text-sm px-2 py-1 rounded editar-btn" data-id="${id}">✏️ Editar</button>
            <button class="bg-red-500 text-white text-sm px-2 py-1 rounded excluir-btn" data-id="${id}">🗑️ Excluir</button>
          </div>
        `;
      }

      div.innerHTML = inner;

      // --- IMPORTANTE: anexar listeners AOS elementos recem-criados (evita duplicação)
      // adiciona listeners apenas se os botões existirem (ou seja, só para comentários do autor)
      const editarBtn = div.querySelector('.editar-btn');
      const excluirBtn = div.querySelector('.excluir-btn');

      if (editarBtn) {
        // adiciona listener com proteção contra double click (desabilita enquanto processa)
        editarBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          // chama função que realiza a edição com proteções
          await editarComentarioSeguro(id, editarBtn);
        });
      }

      if (excluirBtn) {
        // adiciona listener com proteção
        excluirBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await excluirComentarioSeguro(id, excluirBtn);
        });
      }

      // finalmente, adiciona o comentário ao container principal
      listaDepoimentos.appendChild(div);
    });

  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}

// utilitário simples para escapar HTML (prevenção básica de XSS ao usar innerHTML)
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// -----------------------
// Função segura para editar comentário
// -----------------------
// Esta função:
// - Busca o documento mais recente antes de editar (reduz inconsistência)
// - Verifica permissão (apenas autor pode editar)
// - Desabilita o botão enquanto a operação está em andamento (evita double submit)
// - Atualiza o Firestore e a UI de forma consistente
async function editarComentarioSeguro(id, botao) {
  // trava o botão imediatamente para evitar vários cliques
  try {
    botao.disabled = true;
  } catch (e) { /* se falhar, continuar, mas idealmente o botão existe */ }

  try {
    const docRef = db.collection('comentarios').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      alert('Comentário não encontrado (pode ter sido removido).');
      await renderizarDepoimentos();
      return;
    }

    const dados = doc.data() || {};
    const user = auth.currentUser;

    // verifica se o usuário é o autor
    if (!user || user.uid !== dados.uid) {
      alert('Você não tem permissão para editar este comentário.');
      await renderizarDepoimentos();
      return;
    }

    // mostra prompt com texto mais recente do documento
    const textoAtual = dados.comentario || '';
    const novoTexto = prompt('Edite seu comentário:', textoAtual);

    // usuário cancelou (prompt retornou null)
    if (novoTexto === null) {
      return;
    }

    const textoLimpo = novoTexto.trim();
    if (!textoLimpo) {
      alert('Comentário não pode ficar vazio.');
      return;
    }

    // atualiza documento (await garante que o update ocorreu antes de re-render)
    await docRef.update({
      comentario: textoLimpo,
      editadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    // atualiza texto na UI local (se ainda existir)
    const textoEl = document.getElementById(`texto-${id}`);
    if (textoEl) textoEl.textContent = textoLimpo;

    // re-renderiza para garantir que ordem/estado reflete Firestore
    await renderizarDepoimentos();
    // feedback
    alert('Comentário atualizado com sucesso!');
  } catch (err) {
    console.error('Erro ao editar comentário:', err);
    alert('Erro ao editar comentário. Veja console para detalhes.');
  } finally {
    // reabilita botão (se existir)
    try { botao.disabled = false; } catch (e) {}
  }
}


// -----------------------
// Função segura para excluir comentário
// -----------------------
async function excluirComentarioSeguro(id, botao) {
  // confirmação simples
  if (!confirm('Tem certeza que deseja excluir seu comentário?')) return;

  // previne double click
  try { botao.disabled = true; } catch (e) {}

  try {
    const docRef = db.collection('comentarios').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      alert('Comentário não encontrado ou já removido.');
      await renderizarDepoimentos();
      return;
    }

    const dados = doc.data() || {};
    const user = auth.currentUser;

    // checa permissão: apenas autor pode excluir
    if (!user || user.uid !== dados.uid) {
      alert('Você não tem permissão para excluir este comentário.');
      await renderizarDepoimentos();
      return;
    }

    // realiza exclusão
    await docRef.delete();

    // re-renderiza para remover do DOM
    await renderizarDepoimentos();
    alert('Comentário excluído com sucesso!');
  } catch (err) {
    console.error('Erro ao excluir comentário:', err);
    alert('Erro ao excluir comentário. Veja console.');
  } finally {
    try { botao.disabled = false; } catch (e) {}
  }
}


// -----------------------
// Envio de novo comentário (com proteção contra double submit)
// -----------------------
formDepoimento?.addEventListener('submit', async (e) => {
  e.preventDefault(); // evita reload

  // pega elementos locais do form
  const comentarioEl = document.getElementById('comentario');
  const btnEnviar = formDepoimento.querySelector('button[type="submit"]');

  // validação básica
  const comentario = comentarioEl?.value?.trim() || '';
  feedbackDiv.textContent = '';
  feedbackDiv.className = '';

  if (!comentario || estrelasSelecionadas === 0) {
    feedbackDiv.textContent = 'Preencha comentário e selecione uma avaliação.';
    feedbackDiv.classList.add('text-red-600', 'font-semibold', 'mt-2');
    return;
  }

  // garante que o usuário está autenticado (form só aparece quando logado, mas dupla checagem)
  const user = auth.currentUser;
  if (!user) {
    feedbackDiv.textContent = 'Você precisa estar logado para enviar um depoimento.';
    feedbackDiv.classList.add('text-red-600', 'font-semibold', 'mt-2');
    return;
  }

  // desabilita botão para evitar envios duplicados
  if (btnEnviar) btnEnviar.disabled = true;

  try {
    // adiciona documento ao Firestore
    await db.collection('comentarios').add({
      nome: user.displayName || user.email || 'Usuário',
      uid: user.uid,
      comentario,
      estrelas: estrelasSelecionadas,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    // limpa UI
    if (comentarioEl) comentarioEl.value = '';
    estrelasSelecionadas = 0;
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });

    feedbackDiv.textContent = 'Comentário enviado com sucesso!';
    feedbackDiv.classList.add('text-green-600', 'font-semibold', 'mt-2');

    // re-renderiza lista para incluir o novo comentário em posição correta
    await renderizarDepoimentos();
  } catch (err) {
    console.error('Erro ao enviar comentário:', err);
    feedbackDiv.textContent = 'Erro ao enviar comentário.';
    feedbackDiv.classList.add('text-red-600', 'font-semibold', 'mt-2');
  } finally {
    if (btnEnviar) btnEnviar.disabled = false;
  }
});


// -----------------------
// Firebase Auth (Google only) - botões e estado
// -----------------------
const btnGoogle = document.getElementById('btn-google-login'); // botão Login Google no DOM
const btnLogout = document.getElementById('btn-logout');       // botão Logout no DOM
const msgLogin = document.getElementById('msg-login');         // área de saudação "Olá, Nome"

// login via popup Google (apenas provider Google)
btnGoogle?.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      // atualiza UI
      msgLogin.textContent = `Olá, ${user.displayName || user.email}!`;
      btnGoogle.classList.add('hidden');
      btnLogout.classList.remove('hidden');
      formDepoimento?.classList.remove('hidden');
      // re-renderiza para exibir botões de edição/exclusão nos comentários do autor
      renderizarDepoimentos();
    })
    .catch((error) => {
      console.error('Erro ao logar com Google:', error);
      alert('Falha ao fazer login. Tente novamente.');
    });
});

// logout
btnLogout?.addEventListener('click', () => {
  auth.signOut().then(() => {
    msgLogin.textContent = '';
    btnGoogle.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    formDepoimento?.classList.add('hidden');
    renderizarDepoimentos(); // re-renderiza para remover botões que só o autor vê
  }).catch(err => {
    console.error('Erro no logout:', err);
    alert('Erro ao efetuar logout: ' + (err.message || err));
  });
});

// observa mudanças de autenticação (mantém sessão após reload)
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
  // sempre re-renderiza para manter consistência (botões autorais aparecem/desaparecem)
  renderizarDepoimentos();
});


// -----------------------
// Inicializa AOS (animações)
// -----------------------
AOS.init();


// -----------------------
// Stripe Checkout (mantido)
// -----------------------
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Rs9Bm2Lo3O3SUleAwr1Vbn1B6mdomDNnTIUHP2u5ptTTZKQRooWIMLVjjbjHHtq7lxAMoUw9fc6Q8wY0VgtVTn2004zFVloIo";
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

// cria sessão de checkout chamando seu endpoint /api/checkout
async function criarCheckout(produto, btn) {
  if (!stripe) {
    alert('Stripe não inicializado.');
    return;
  }

  // desabilita botão e altera texto para indicar processamento
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Redirecionando...';

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.error || err.message || 'Erro ao criar sessão de checkout');
    }

    const data = await res.json();
    if (!data.id) throw new Error('Resposta inválida do servidor');

    // redireciona para checkout
    const result = await stripe.redirectToCheckout({ sessionId: data.id });
    if (result.error) {
      console.error('Stripe redirect error:', result.error);
      alert(result.error.message);
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (err) {
    console.error('Erro ao processar pagamento:', err);
    alert('Erro ao processar pagamento. Veja console.');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// associa botões aos produtos (preserva comportamento anterior)
document.getElementById('btn-ebook')?.addEventListener('click', (e) => criarCheckout('ebook', e.currentTarget));
document.getElementById('btn-planilhas2')?.addEventListener('click', (e) => criarCheckout('planilhas2', e.currentTarget));
document.getElementById('btn-planilhas3')?.addEventListener('click', (e) => criarCheckout('planilhas3', e.currentTarget));
