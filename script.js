// =======================
// Contador Persistente
// =======================
const countdown = document.getElementById('countdown-geral');
const contadorKey = 'contadorOficial';
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

// =======================
// Depoimentos Persistentes via Firestore
// =======================
const form = document.getElementById('form-depoimento');
const listaDepoimentos = document.getElementById('lista-depoimentos');
let estrelasSelecionadas = 0;

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

// Renderiza depoimentos
function renderizarDepoimentos() {
    listaDepoimentos.innerHTML = '';
    db.collection("comentarios").orderBy("criadoEm", "desc").get().then(snapshot => {
        snapshot.forEach(docSnap => {
            const dep = docSnap.data();
            const div = document.createElement('div');
            div.classList.add('bg-gray-100', 'p-4', 'rounded-lg', 'shadow-md', 'relative');
            div.dataset.id = docSnap.id;
            div.innerHTML = `
                <p class="font-bold">${dep.nome} <span class="text-yellow-400">${'★'.repeat(dep.estrelas)}</span></p>
                <p>${dep.comentario}</p>
                <button class="excluir absolute top-2 right-2 text-red-500 font-bold hover:text-red-700">✖</button>
            `;
            listaDepoimentos.appendChild(div);

            div.querySelector('.excluir').addEventListener('click', () => {
                if(confirm('Deseja realmente excluir este comentário?')) {
                    db.collection("comentarios").doc(div.dataset.id).delete().then(() => {
                        renderizarDepoimentos();
                    });
                }
            });
        });
    });
}

renderizarDepoimentos();

// Envio de depoimento
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const comentario = document.getElementById('comentario').value.trim();

    if (!nome || !comentario || estrelasSelecionadas === 0) {
        alert("Preencha todos os campos e selecione uma avaliação.");
        return;
    }

    db.collection("comentarios").add({
        nome,
        comentario,
        estrelas: estrelasSelecionadas,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        form.reset();
        estrelasSelecionadas = 0;
        document.querySelectorAll('.estrela').forEach(s => {
            s.classList.remove('text-yellow-400');
            s.classList.add('text-gray-300');
        });
        renderizarDepoimentos();
    }).catch(err => {
        console.error(err);
        alert("Erro ao enviar comentário.");
    });
});

// =======================
// Inicializa AOS
// =======================
AOS.init();

// =======================
// Stripe Checkout
// =======================

// Substitua pela sua chave pública correta do Stripe
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

// Associa botões aos produtos
document.getElementById('btn-ebook')?.addEventListener('click', (e) => criarCheckout('ebook', e.currentTarget));
document.getElementById('btn-planilhas2')?.addEventListener('click', (e) => criarCheckout('planilhas2', e.currentTarget));
document.getElementById('btn-planilhas3')?.addEventListener('click', (e) => criarCheckout('planilhas3', e.currentTarget));
