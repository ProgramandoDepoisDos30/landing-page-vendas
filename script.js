// =========================================
// SCRIPT.JS COMPLETO - LANDING PAGE
// =========================================

// =======================
// Contador Persistente
// =======================
const countdown = document.getElementById('countdown-geral'); // Elemento que mostra o contador
const contadorKey = 'contadorOficial'; // Chave para salvar o estado no localStorage

// Definição do tempo das fases em segundos
const tempoFase1 = 2*3600 + 59*60 + 59; // 2h 59m 59s
const tempoFase2 = 9*60 + 59;           // 9m 59s

// Recupera estado do contador do localStorage ou inicializa
let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

// Função para formatar o tempo em HH:MM:SS
function formatTime(totalSegundos) {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// Atualiza o contador a cada segundo
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


// =======================
// Depoimentos Persistentes via Firestore
// =======================
const formDepoimento = document.getElementById('form-depoimento'); // Formulário de comentários
const listaDepoimentos = document.getElementById('lista-depoimentos'); // Div onde os depoimentos serão exibidos
const feedbackDiv = document.getElementById('feedback-comentario'); // Div de feedback ao enviar comentário
let estrelasSelecionadas = 0; // Número de estrelas selecionadas pelo usuário

// Seleção de estrelas
document.querySelectorAll('.estrela').forEach(star => {
    star.addEventListener('click', () => {
        estrelasSelecionadas = parseInt(star.dataset.valor);
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

// Renderiza depoimentos existentes no Firestore
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
                <p class="font-bold">${dep.nome} <span class="text-yellow-400">${'★'.repeat(dep.estrelas)}${'☆'.repeat(5 - dep.estrelas)}</span></p>
                <p>${dep.comentario}</p>
            `;
            listaDepoimentos.appendChild(div);
        });
    } catch (err) {
        console.error("Erro ao carregar comentários:", err);
    }
}

renderizarDepoimentos();

// Envio de depoimento (somente se estiver logado)
formDepoimento?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const comentario = document.getElementById('comentario').value.trim();
    feedbackDiv.textContent = '';
    feedbackDiv.className = '';

    if (!nome || !comentario || estrelasSelecionadas === 0) {
        feedbackDiv.textContent = "Preencha todos os campos e selecione uma avaliação.";
        feedbackDiv.classList.add('text-red-600','font-semibold','mt-2');
        return;
    }

    try {
        await db.collection("comentarios").add({
            nome,
            comentario,
            estrelas: estrelasSelecionadas,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        formDepoimento.reset();
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


// =======================
// Firebase Auth - Login via Google
// =======================
const btnGoogle = document.getElementById('btn-google-login'); // Botão Google login
const btnLogout = document.getElementById('btn-logout');       // Botão logout
const msgLogin = document.getElementById('msg-login');         // Mensagem de boas-vindas
const authSection = document.getElementById('auth-section');   // Div de login auth

// Clique no botão Google
btnGoogle.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            msgLogin.textContent = `Olá, ${user.displayName}!`;
            btnGoogle.classList.add('hidden');
            btnLogout.classList.remove('hidden');
            formDepoimento?.classList.remove('hidden'); // mostra formulário de depoimento
        })
        .catch((error) => {
            console.error("Erro ao logar com Google:", error);
            alert("Falha ao fazer login. Tente novamente.");
        });
});

// Logout
btnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
        msgLogin.textContent = '';
        btnGoogle.classList.remove('hidden');
        btnLogout.classList.add('hidden');
        formDepoimento?.classList.add('hidden');
    });
});

// Mantém login se página recarregar
auth.onAuthStateChanged((user) => {
    if(user){
        msgLogin.textContent = `Olá, ${user.displayName}!`;
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


// =======================
// Inicializa AOS (Animações)
// =======================
AOS.init();


// =======================
// Stripe Checkout
// =======================
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Rs9Bm2Lo3O3SUleAwr1Vbn1B6mdomDNnTIUHP2u5ptTTZKQRooWIMLVjjbjHHtq7lxAMoUw9fc6Q8wY0VgtVTn2004zFVloIo"; 
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

// Cria sessão de checkout
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

// Associa botões aos produtos
document.getElementById('btn-ebook')?.addEventListener('click', (e) => criarCheckout('ebook', e.currentTarget));
document.getElementById('btn-planilhas2')?.addEventListener('click', (e) => criarCheckout('planilhas2', e.currentTarget));
document.getElementById('btn-planilhas3')?.addEventListener('click', (e) => criarCheckout('planilhas3', e.currentTarget));
