// =========================================
// SCRIPT.JS COMPLETO - LANDING PAGE
// =========================================

// -----------------------
// Contador Persistente
// -----------------------
const countdown = document.getElementById('countdown-geral'); // elemento que mostra o contador
const contadorKey = 'contadorOficial';                        // chave localStorage

// tempos das fases em segundos
const tempoFase1 = 2 * 3600 + 59 * 60 + 59; // 2h 59m 59s
const tempoFase2 = 9 * 60 + 59;             // 9m 59s

// carrega estado salvo ou inicia com fase 1
let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

// converte segundos em HH:MM:SS
function formatTime(totalSegundos) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// atualiza contador e salva estado
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

// inicia loop do contador
let interval = setInterval(atualizarContador, 1000);
atualizarContador();


// -----------------------
// Depoimentos (Firestore)
// -----------------------
const formDepoimento = document.getElementById('form-depoimento');
const listaDepoimentos = document.getElementById('lista-depoimentos');
const feedbackDiv = document.getElementById('feedback-comentario');
let estrelasSelecionadas = 0;

// -----------------------
// Seleção das estrelas (UI)
// -----------------------
document.querySelectorAll('.estrela').forEach(star => {
  star.addEventListener('click', () => {
    estrelasSelecionadas = parseInt(star.dataset.valor, 10);
    document.querySelectorAll('.estrela').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });
    for (let i = 0; i < estrelasSelecionadas; i++) {
      const s = document.querySelectorAll('.estrela')[i];
      if (s) { s.classList.add('text-yellow-400'); s.classList.remove('text-gray-300'); }
    }
  });
});


// -----------------------
// Modal de edição de comentário
// -----------------------
const modalEditar = document.getElementById('modal-editar');          // container do modal
const textareaModal = document.getElementById('modal-texto-comentario'); // textarea
const btnCancelarModal = document.getElementById('modal-cancelar');   // botão cancelar
const btnSalvarModal = document.getElementById('modal-salvar');       // botão salvar
let comentarioEditandoId = null;                                      // armazena id do comentário em edição

// abre modal com comentário
function abrirModalEditar(id, textoAtual) {
  comentarioEditandoId = id;
  textareaModal.value = textoAtual;
  modalEditar.classList.remove('hidden'); // mostra modal
}

// fecha modal
function fecharModalEditar() {
  comentarioEditandoId = null;
  modalEditar.classList.add('hidden');
  textareaModal.value = '';
}

// cancelar modal
btnCancelarModal.addEventListener('click', fecharModalEditar);

// salvar modal
btnSalvarModal.addEventListener('click', async () => {
  const novoTexto = textareaModal.value.trim();
  if (!novoTexto) return alert("O comentário não pode ficar vazio.");
  try {
    await db.collection("comentarios").doc(comentarioEditandoId).update({ comentario: novoTexto });
    const textoEl = document.getElementById(`texto-${comentarioEditandoId}`);
    if (textoEl) textoEl.textContent = novoTexto;
    fecharModalEditar();
    alert("Comentário atualizado com sucesso!");
  } catch (err) {
    console.error("Erro ao atualizar comentário:", err);
    alert("Erro ao atualizar comentário.");
  }
});


// -----------------------
// Renderizar depoimentos
// -----------------------
async function renderizarDepoimentos() {
  if (!listaDepoimentos) return;
  listaDepoimentos.innerHTML = '';

  try {
    const usuarioAtual = auth.currentUser;
    const snapshot = await db.collection("comentarios").orderBy("criadoEm","desc").get();

    snapshot.forEach(docSnap => {
      const dep = docSnap.data() || {};
      const id = docSnap.id;

      const div = document.createElement('div');
      div.className = 'bg-gray-100 p-4 rounded-lg shadow-md relative mb-3';
      div.setAttribute('data-id', id);

      const nome = dep.nome || 'Usuário';
      const estrelas = '★'.repeat(dep.estrelas || 0) + '☆'.repeat(5-(dep.estrelas||0));
      const comentarioTexto = dep.comentario || '';

      let inner = `<p class="font-bold">${escapeHtml(nome)} <span class="text-yellow-400">${estrelas}</span></p>
                   <p id="texto-${id}" class="mt-1">${escapeHtml(comentarioTexto)}</p>`;

      // botões apenas para autor
      if (usuarioAtual && usuarioAtual.uid === dep.uid) {
        inner += `<div class="absolute top-2 right-2 space-x-2">
                    <button class="bg-blue-500 text-white text-sm px-2 py-1 rounded editar-btn" data-id="${id}">✏️ Editar</button>
                    <button class="bg-red-500 text-white text-sm px-2 py-1 rounded excluir-btn" data-id="${id}">🗑️ Excluir</button>
                  </div>`;
      }

      div.innerHTML = inner;

      // listener editar usando modal
      const editarBtn = div.querySelector('.editar-btn');
      const excluirBtn = div.querySelector('.excluir-btn');

      if (editarBtn) {
        editarBtn.addEventListener('click', () => {
          const textoAtual = document.getElementById(`texto-${editarBtn.dataset.id}`).textContent;
          abrirModalEditar(editarBtn.dataset.id, textoAtual);
        });
      }

      if (excluirBtn) {
        excluirBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await excluirComentarioSeguro(id, excluirBtn);
        });
      }

      listaDepoimentos.appendChild(div);
    });

  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}

// utilitário escape HTML
function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                          .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}


// -----------------------
// Função segura para excluir comentário
// -----------------------
async function excluirComentarioSeguro(id, botao) {
  if (!confirm('Tem certeza que deseja excluir seu comentário?')) return;
  try { botao.disabled = true; } catch(e){}

  try {
    const docRef = db.collection('comentarios').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) { alert('Comentário não encontrado'); await renderizarDepoimentos(); return; }

    const dados = doc.data() || {};
    const user = auth.currentUser;
    if (!user || user.uid !== dados.uid) { alert('Sem permissão'); await renderizarDepoimentos(); return; }

    await docRef.delete();
    await renderizarDepoimentos();
    alert('Comentário excluído com sucesso!');
  } catch (err) {
    console.error('Erro ao excluir comentário:', err);
    alert('Erro ao excluir comentário.');
  } finally { try { botao.disabled = false; } catch(e){} }
}


// -----------------------
// Envio de novo comentário
// -----------------------
formDepoimento?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const comentarioEl = document.getElementById('comentario');
  const btnEnviar = formDepoimento.querySelector('button[type="submit"]');
  const comentario = comentarioEl?.value?.trim() || '';
  feedbackDiv.textContent = ''; feedbackDiv.className = '';

  if (!comentario || estrelasSelecionadas===0) {
    feedbackDiv.textContent='Preencha comentário e selecione uma avaliação.';
    feedbackDiv.classList.add('text-red-600','font-semibold','mt-2'); return;
  }

  const user = auth.currentUser;
  if (!user) { feedbackDiv.textContent='Você precisa estar logado.'; feedbackDiv.classList.add('text-red-600','font-semibold','mt-2'); return; }

  if (btnEnviar) btnEnviar.disabled = true;

  try {
    await db.collection('comentarios').add({
      nome: user.displayName||user.email||'Usuário',
      uid: user.uid,
      comentario,
      estrelas: estrelasSelecionadas,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (comentarioEl) comentarioEl.value='';
    estrelasSelecionadas=0;
    document.querySelectorAll('.estrela').forEach(s=>{s.classList.remove('text-yellow-400'); s.classList.add('text-gray-300');});
    feedbackDiv.textContent='Comentário enviado com sucesso!';
    feedbackDiv.classList.add('text-green-600','font-semibold','mt-2');
    await renderizarDepoimentos();
  } catch(err){
    console.error('Erro ao enviar comentário:', err);
    feedbackDiv.textContent='Erro ao enviar comentário.'; feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
  } finally { if(btnEnviar) btnEnviar.disabled=false; }
});


// -----------------------
// Firebase Auth (Google)
// -----------------------
const btnGoogle = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');
const msgLogin = document.getElementById('msg-login');
const userAvatar = document.getElementById('user-avatar'); // avatar do usuário

btnGoogle?.addEventListener('click', ()=>{
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
      .then(result=>{
        const user = result.user;
        msgLogin.textContent=`Olá, ${user.displayName||user.email}!`;
        btnGoogle.classList.add('hidden');
        btnLogout.classList.remove('hidden');
        formDepoimento?.classList.remove('hidden');
        if(user.photoURL) { userAvatar.src=user.photoURL; userAvatar.classList.remove('hidden'); }
        renderizarDepoimentos();
      }).catch(err=>{console.error(err); alert('Falha ao logar.');});
});

btnLogout?.addEventListener('click', ()=>{
  auth.signOut().then(()=>{
    msgLogin.textContent='';
    btnGoogle.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    formDepoimento?.classList.add('hidden');
    if(userAvatar) userAvatar.classList.add('hidden');
    renderizarDepoimentos();
  }).catch(err=>{console.error(err); alert('Erro ao logout: '+(err.message||err));});
});

auth.onAuthStateChanged(user=>{
  if(user){
    msgLogin.textContent=`Olá, ${user.displayName||user.email}!`;
    btnGoogle.classList.add('hidden'); btnLogout.classList.remove('hidden'); formDepoimento?.classList.remove('hidden');
    if(user.photoURL) { userAvatar.src=user.photoURL; userAvatar.classList.remove('hidden'); }
  } else {
    msgLogin.textContent='';
    btnGoogle.classList.remove('hidden'); btnLogout.classList.add('hidden'); formDepoimento?.classList.add('hidden');
    if(userAvatar) userAvatar.classList.add('hidden');
  }
  renderizarDepoimentos();
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

async function criarCheckout(produto, btn){
  if(!stripe){ alert('Stripe não inicializado.'); return; }
  btn.disabled=true; const originalText=btn.innerHTML; btn.innerHTML='Redirecionando...';
  try{
    const res = await fetch('/api/checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({produto})
    });
    if(!res.ok){
      const err=await res.json().catch(()=>({message:res.statusText}));
      throw new Error(err.error||err.message||'Erro ao criar sessão');
    }
    const data = await res.json();
    if(!data.id) throw new Error('Resposta inválida');
    const result = await stripe.redirectToCheckout({sessionId:data.id});
    if(result.error){ console.error(result.error); alert(result.error.message); btn.disabled=false; btn.innerHTML=originalText; }
  }catch(err){ console.error(err); alert('Erro ao processar pagamento.'); btn.disabled=false; btn.innerHTML=originalText; }
}

document.getElementById('btn-ebook')?.addEventListener('click', e=>criarCheckout('ebook', e.currentTarget));
document.getElementById('btn-planilhas2')?.addEventListener('click', e=>criarCheckout('planilhas2', e.currentTarget));
document.getElementById('btn-planilhas3')?.addEventListener('click', e=>criarCheckout('planilhas3', e.currentTarget));
