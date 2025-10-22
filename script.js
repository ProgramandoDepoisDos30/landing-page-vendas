// script.js

// =========================
// AOS - animação ao rolar
// =========================
AOS.init();

// =========================
// Contador regressivo
// =========================
const countdownElement = document.getElementById('countdown-geral');

// Define data final da oferta (ano, mês -1, dia, hora, min, seg)
const finalDate = new Date(2025, 9, 31, 23, 59, 59);

function atualizarContador() {
    const agora = new Date();
    const diff = finalDate - agora;

    if (diff <= 0) {
        countdownElement.textContent = "Oferta encerrada!";
        clearInterval(intervaloContador);
        return;
    }

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutos = Math.floor((diff / (1000 * 60)) % 60);
    const segundos = Math.floor((diff / 1000) % 60);

    countdownElement.textContent = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
}

const intervaloContador = setInterval(atualizarContador, 1000);
atualizarContador(); // Inicializa imediatamente

// =========================
// Firebase Auth e Firestore
// =========================
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos HTML
const btnLogin = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');
const msgLogin = document.getElementById('msg-login');
const formDepoimento = document.getElementById('form-depoimento');
const listaDepoimentos = document.getElementById('lista-depoimentos');
const feedbackComentario = document.getElementById('feedback-comentario');
const estrelas = document.querySelectorAll('.estrela');
const comentarioInput = document.getElementById('comentario');

let user = null;
let notaSelecionada = 0;

// =========================
// Login com Google
// =========================
btnLogin.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            user = result.user;
            msgLogin.textContent = `Olá, ${user.displayName}!`;
            btnLogin.style.display = 'none';
            btnLogout.style.display = 'inline-block';
            formDepoimento.style.display = 'block';
            carregarDepoimentos();
        })
        .catch(error => console.error(error));
});

// Logout
btnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
        user = null;
        msgLogin.textContent = '';
        btnLogin.style.display = 'inline-block';
        btnLogout.style.display = 'none';
        formDepoimento.style.display = 'none';
    });
});

// =========================
// Sistema de estrelas
// =========================
estrelas.forEach(estrela => {
    estrela.addEventListener('click', () => {
        notaSelecionada = parseInt(estrela.dataset.valor);
        atualizarEstrelas();
    });
});

function atualizarEstrelas() {
    estrelas.forEach(estrela => {
        if (parseInt(estrela.dataset.valor) <= notaSelecionada) {
            estrela.classList.add('text-yellow-400');
            estrela.classList.remove('text-gray-300');
        } else {
            estrela.classList.add('text-gray-300');
            estrela.classList.remove('text-yellow-400');
        }
    });
}

// =========================
// Enviar depoimento
// =========================
formDepoimento.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!user) return;

    const comentario = comentarioInput.value.trim();
    if (comentario === '' || notaSelecionada === 0) {
        feedbackComentario.textContent = 'Preencha o comentário e selecione a nota!';
        return;
    }

    db.collection('depoimentos').add({
        uid: user.uid,
        nome: user.displayName,
        avatar: user.photoURL,
        comentario: comentario,
        nota: notaSelecionada,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        comentarioInput.value = '';
        notaSelecionada = 0;
        atualizarEstrelas();
        feedbackComentario.textContent = 'Comentário enviado com sucesso!';
        carregarDepoimentos();
    }).catch(err => {
        feedbackComentario.textContent = 'Erro ao enviar comentário!';
        console.error(err);
    });
});

// =========================
// Carregar depoimentos
// =========================
function carregarDepoimentos() {
    listaDepoimentos.innerHTML = '';
    db.collection('depoimentos').orderBy('timestamp', 'desc').get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const depoimento = doc.data();
                const div = document.createElement('div');
                div.className = 'bg-gray-100 p-4 rounded shadow-md relative';
                
                let estrelasHTML = '';
                for (let i = 0; i < 5; i++) {
                    estrelasHTML += `<span class="${i < depoimento.nota ? 'text-yellow-400' : 'text-gray-300'}">★</span>`;
                }

                div.innerHTML = `
                    <div class="flex items-center mb-2">
                        <img src="${depoimento.avatar}" alt="${depoimento.nome}" class="w-10 h-10 rounded-full mr-3">
                        <strong>${depoimento.nome}</strong>
                        <div class="ml-auto">
                            ${user && user.uid === depoimento.uid ? `
                                <button class="editar mr-2 text-blue-500 font-bold">Editar</button>
                                <button class="excluir text-red-500 font-bold">Excluir</button>` : ''}
                        </div>
                    </div>
                    <div class="mb-2">${estrelasHTML}</div>
                    <p>${depoimento.comentario}</p>
                `;

                // Função excluir
                if (user && user.uid === depoimento.uid) {
                    div.querySelector('.excluir')?.addEventListener('click', () => {
                        if (confirm('Deseja realmente excluir seu comentário?')) {
                            db.collection('depoimentos').doc(doc.id).delete().then(() => {
                                carregarDepoimentos();
                            });
                        }
                    });

                    // Função editar
                    div.querySelector('.editar')?.addEventListener('click', () => {
                        const novoComentario = prompt('Edite seu comentário:', depoimento.comentario);
                        if (novoComentario !== null) {
                            const novaNota = parseInt(prompt('Atualize a nota (1 a 5):', depoimento.nota));
                            if (novaNota >=1 && novaNota <=5) {
                                db.collection('depoimentos').doc(doc.id).update({
                                    comentario: novoComentario,
                                    nota: novaNota
                                }).then(() => {
                                    carregarDepoimentos();
                                });
                            }
                        }
                    });
                }

                listaDepoimentos.appendChild(div);
            });
        });
}

// =========================
// Botões de compra -> Stripe
// =========================
const stripe = Stripe('SUA_PUBLIC_KEY_STRIPE'); // Substitua pela sua public key

document.getElementById('btn-ebook').addEventListener('click', () => {
    window.location.href = 'https://buy.stripe.com/test_ebook'; // substitua pelo link de checkout do produto
});

document.getElementById('btn-planilhas2').addEventListener('click', () => {
    window.location.href = 'https://buy.stripe.com/test_planilhas2';
});

document.getElementById('btn-planilhas3').addEventListener('click', () => {
    window.location.href = 'https://buy.stripe.com/test_planilhas3';
});
