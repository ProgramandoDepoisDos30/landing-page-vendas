// -----------------------
// Variáveis para edição de comentário
// -----------------------
let comentarioEmEdicaoId = null; // guarda o ID do comentário que está sendo editado
let estrelasModalSelecionadas = 0; // guarda estrelas selecionadas no modal

// -----------------------
// Lógica das estrelas do modal
// -----------------------
document.querySelectorAll('.estrela-modal').forEach(star => {
  star.addEventListener('click', () => {
    estrelasModalSelecionadas = parseInt(star.dataset.valor, 10);
    document.querySelectorAll('.estrela-modal').forEach(s => {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    });
    for (let i = 0; i < estrelasModalSelecionadas; i++) {
      document.querySelectorAll('.estrela-modal')[i].classList.add('text-yellow-400');
      document.querySelectorAll('.estrela-modal')[i].classList.remove('text-gray-300');
    }
  });
});

// -----------------------
// Atualização de renderizarDepoimentos para incluir botão de editar
// -----------------------
async function renderizarDepoimentos() {
  if (!listaDepoimentos) return;
  listaDepoimentos.innerHTML = '';

  try {
    const snapshot = await db.collection("comentarios").orderBy("criadoEm", "desc").get();
    snapshot.forEach(docSnap => {
      const dep = docSnap.data();
      const div = document.createElement('div');
      div.classList.add('bg-gray-100', 'p-4', 'rounded-lg', 'shadow-md', 'relative');
      
      div.innerHTML = `
        <p class="font-bold">${dep.nome || 'Usuario'} <span class="text-yellow-400">${'★'.repeat(dep.estrelas || 0)}${'☆'.repeat(5 - (dep.estrelas || 0))}</span></p>
        <p>${dep.comentario || ''}</p>
      `;

      // Só mostrar botão de editar para o próprio usuário
      const user = auth.currentUser;
      if (user && user.uid === dep.uid) {
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.classList.add('absolute','top-2','right-2','text-blue-600','hover:underline');
        btnEditar.addEventListener('click', () => abrirModalEdicao(docSnap.id, dep.comentario, dep.estrelas));
        div.appendChild(btnEditar);
      }

      listaDepoimentos.appendChild(div);
    });
  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}

// -----------------------
// Função para abrir modal de edição
// -----------------------
function abrirModalEdicao(id, comentario, estrelas) {
  comentarioEmEdicaoId = id;
  document.getElementById('modal-comentario').value = comentario;
  estrelasModalSelecionadas = estrelas;

  // Atualiza visual das estrelas no modal
  document.querySelectorAll('.estrela-modal').forEach((s, idx) => {
    s.classList.remove('text-yellow-400');
    s.classList.add('text-gray-300');
    if (idx < estrelas) s.classList.add('text-yellow-400');
  });

  document.getElementById('modal-edicao').classList.remove('hidden');
}

// -----------------------
// Fechar modal
// -----------------------
document.getElementById('btn-fechar-modal').addEventListener('click', () => {
  document.getElementById('modal-edicao').classList.add('hidden');
  comentarioEmEdicaoId = null;
});

// -----------------------
// Salvar alterações do modal
// -----------------------
document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
  const novoComentario = document.getElementById('modal-comentario').value.trim();

  if (!novoComentario || estrelasModalSelecionadas === 0) {
    alert("Preencha comentário e selecione avaliação.");
    return;
  }

  try {
    await db.collection("comentarios").doc(comentarioEmEdicaoId).update({
      comentario: novoComentario,
      estrelas: estrelasModalSelecionadas,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    comentarioEmEdicaoId = null;
    document.getElementById('modal-edicao').classList.add('hidden');
    renderizarDepoimentos();
  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar comentário.");
  }
});

// -----------------------
// Evitar duplicidade de comentários iguais pelo mesmo usuário
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
    // Verifica se já existe o mesmo comentário do mesmo usuário
    const existente = await db.collection("comentarios")
      .where("uid", "==", user.uid)
      .where("comentario", "==", comentario)
      .get();

    if (!existente.empty) {
      feedbackDiv.textContent = "Você já enviou este comentário!";
      feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
      return;
    }

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
