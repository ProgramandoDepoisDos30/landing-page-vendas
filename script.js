// =======================
// Inicialização Firebase
// =======================
const db = firebase.firestore(); // já inicializado no seu HTML

// =======================
// Contador Persistente
// =======================
const countdown = document.getElementById('countdown-geral');
const contadorKey = 'contadorOficial';

const tempoFase1 = 2*3600 + 59*60 + 59; 
const tempoFase2 = 9*60 + 59;           

let estado = JSON.parse(localStorage.getItem(contadorKey)) || { fase: 1, segundosRestantes: tempoFase1 };

function formatTime(totalSegundos) {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function atualizarContador() {
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
    countdown.innerHTML = formatTime(estado.segundosRestantes);
    localStorage.setItem(contadorKey, JSON.stringify(estado));
}

let interval = setInterval(atualizarContador, 1000);
atualizarContador();

// =======================
// Depoimentos Firebase
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

// Função para renderizar depoimentos
function renderizarDepoimentos(depoimentos) {
    listaDepoimentos.innerHTML = '';
    depoimentos.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        div.classList.add('bg-gray-100', 'p-4', 'rounded-lg', 'shadow-md', 'relative');
        div.innerHTML = `
            <p class="font-bold">${data.nome} <span class="text-yellow-400">${'★'.repeat(data.estrelas)}</span></p>
            <p>${data.comentario}</p>
            <button class="excluir absolute top-2 right-2 text-red-500 font-bold hover:text-red-700" data-id="${doc.id}">✖</button>
        `;
        listaDepoimentos.appendChild(div);
    });

    // Evento de exclusão
    document.querySelectorAll('.excluir').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Deseja realmente excluir este comentário?')) {
                await db.collection('depoimentos').doc(id).delete();
            }
        });
    });
}

// Recupera depoimentos do Firestore em tempo real
db.collection('depoimentos').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
    renderizarDepoimentos(snapshot.docs);
});

// Envio de depoimento
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const comentario = document.getElementById('comentario').value.trim();

    if (!nome || !comentario || estrelasSelecionadas === 0) {
        alert("Preencha todos os campos e selecione uma avaliação.");
        return;
    }

    try {
        await db.collection('depoimentos').add({
            nome,
            comentario,
            estrelas: estrelasSelecionadas,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        form.reset();
        estrelasSelecionadas = 0;
        document.querySelectorAll('.estrela').forEach(s => {
            s.classList.remove('text-yellow-400');
            s.classList.add('text-gray-300');
        });

    } catch (error) {
        alert("Erro ao enviar comentário.");
        console.error(error);
    }
});

// =======================
// Inicializa AOS
// =======================
AOS.init();
