/**
 * Spotify Player Mockup - Canto com Amor
 * Lógica do player de música com áudio real no Hero
 */

const musicas = [
    {
        titulo: 'Café da Manhã e Sonhos',
        estilo: 'Sertanejo Universitário',
        capa: 'images/capa-musica/cafedamanhaesonhos.jpg',
        audioSrc: '/public/audio/cafe.mp3',
        historia: "'Quero uma música em homenagem ao meu pai, um homem guerreiro que sempre fez de tudo pela nossa família. Mesmo nos momentos mais difíceis, nunca desistiu e sempre encontrou forças onde parecia não existir mais nenhuma. Seu cuidado e sua presença sempre me fizeram sentir segura. Pai, eu te amo e sou eternamente grata por tudo que você fez e faz por nós.'",
        duracao: '0:00',
        avaliacao: {
            nome: 'Fernanda L.',
            foto: 'images/fernandaL.png',
            fotoWebp: 'images/fernandaL.png',
            estrelas: 5,
            texto: 'Ficou simplesmente perfeito! Meu pai amou a homenagem. Ele disse que foi o presente mais lindo que já recebeu na vida. Agora ele passa o dia inteiro ouvindo a música, é só ele estar em casa que ela já começa a tocar!',
            ocasiao: 'Presente de Aniversário'
        }
    },
    {
        titulo: 'Jardim da Nossa Fé',
        estilo: 'MPB / Gospel',
        capa: 'images/capa-musica/jardimdanossafe.jpg',
        audioSrc: '/public/audio/jardim.mp3',
        historia: "'Quero uma música gospel para homenagear meu esposo, um homem de fé inabalável, que sempre confia nos planos de Deus e transmite força através da sua espiritualidade. Quero que essa canção demonstre todo o meu amor, admiração e gratidão por ele, transformando esse sentimento em um presente lindo e emocionante.'",
        duracao: '0:00',
        avaliacao: {
            nome: 'Maria Lurdes',
            foto: 'images/mariaLurdes.png',
            fotoWebp: 'images/mariaLurdes.png',
            estrelas: 5,
            texto: 'Fiz essa música para o meu esposo e foi emocionante ver a reação dele. Ele ama louvores, então cada palavra tocou profundamente o coração dele. Agora, toda vez que estamos no carro indo para algum lugar, a música vira nossa trilha sonora, ele faz questão de colocar para tocar sempre.',
            ocasiao: 'Dia das Mães'
        }
    },
    {
        titulo: 'Parada do Coração',
        estilo: 'Sertanejo Romântico',
        capa: 'images/capa-musica/paradadocoracao.jpg',
        audioSrc: '/public/audio/parada.mp3',
        historia: "'Quero uma música contando a história de como conheci meu namorado. Nós nos conhecemos no ônibus, indo trabalhar. Sempre nos víamos durante o trajeto, trocando olhares discretos, até que um dia ele desceu na mesma parada que eu e resolveu puxar assunto. Foi ali que tudo começou.'",
        duracao: '0:00',
        avaliacao: {
            nome: 'Matheus R.',
            foto: 'images/MatheusR.png',
            fotoWebp: 'images/MatheusR.png',
            estrelas: 5,
            texto: 'Fiz essa música de surpresa para minha namorada, contando toda a nossa história, e ela simplesmente amou! Ver nossa trajetória transformada em música deixou tudo ainda mais especial. Ficou incrível mesmo, melhor do que eu imaginava kkkkk',
            ocasiao: 'Surpresa Romântica'
        }
    },
    {
        titulo: 'Reencontro no Forró',
        estilo: 'Forró / Piseiro',
        capa: 'images/capa-musica/reencontronoforro.jpg',
        audioSrc: '/public/audio/forro.mp3',
        historia: "'Na minha música, quero contar a história do meu relacionamento com meu namorado. Nós tínhamos brigado e acabado terminando, então resolvi sair para tentar distrair a cabeça. Mas, quando cheguei no forró, me deparei com ele lá. No meio da música e da dança, não conseguimos resistir um ao outro — dançamos a noite inteira e acabamos fazendo as pazes.'",
        duracao: '0:00',
        avaliacao: {
            nome: 'Larissa R.',
            foto: 'images/MarianaR.png',
            fotoWebp: 'images/MarianaR.png',
            estrelas: 5,
            texto: 'Fiz essa música para o meu amor, contando um dos momentos mais marcantes da nossa história, quando percebemos que não conseguíamos mais viver um sem o outro. A homenagem ficou simplesmente linda e emocionante. Também queria agradecer todo o time de suporte pelo atendimento incrível e por todo o carinho durante o processo!',
            ocasiao: 'Pedido de Casamento'
        }
    }
];

let musicaAtual = 0;
let isPlaying = false;

// Referência ao elemento de áudio
const songAudio = document.getElementById('songAudio');

// Formatar tempo em mm:ss
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// Atualizar barra de progresso
function updateProgress() {
    if (!songAudio || !songAudio.duration) return;
    
    const percent = (songAudio.currentTime / songAudio.duration) * 100;
    const progressBar = document.getElementById('progressBar');
    const progressDot = document.getElementById('progressDot');
    const currentTimeEl = document.getElementById('currentTime');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressDot) progressDot.style.left = percent + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(songAudio.currentTime);
}

// Atualizar duração total quando o áudio carregar
function updateDuration() {
    if (!songAudio || !songAudio.duration) return;
    
    const totalTimeEl = document.getElementById('totalTime');
    if (totalTimeEl) totalTimeEl.textContent = formatTime(songAudio.duration);
    
    // Atualiza também no array de músicas
    musicas[musicaAtual].duracao = formatTime(songAudio.duration);
}

// Toggle play/pause
function togglePlay() {
    const icon = document.getElementById('playPauseIcon');
    
    if (!songAudio) return;

    console.log('[Player] Tentando carregar áudio de:', songAudio.src);

    if (isPlaying) {
        songAudio.pause();
        if (icon) icon.className = 'fas fa-play text-white text-2xl ml-1';
    } else {
        songAudio.play().catch(err => {
            console.warn('[Player] Erro ao reproduzir:', err);
        });
        if (icon) icon.className = 'fas fa-pause text-white text-2xl';
    }
    
    isPlaying = !isPlaying;
}

// Atualizar mockup com dados da música
function updateMockup(data) {
    const card = document.querySelector('#smartphoneMockup .bg-white.rounded-\\[2\\.5rem\\]');
    if (card) card.classList.add('mockup-fade');

    document.getElementById('mockupTitle').textContent = data.titulo;
    document.getElementById('mockupStyle').textContent = data.estilo;
    document.getElementById('mockupCover').src = data.capa;
    document.getElementById('mockupStory').textContent = data.historia;
    document.getElementById('totalTime').textContent = data.duracao;
    
    // Carregar nova fonte de áudio
    if (songAudio) {
        songAudio.src = data.audioSrc;
        songAudio.load();
    }
    
    // Reset progresso
    const progressBar = document.getElementById('progressBar');
    const progressDot = document.getElementById('progressDot');
    const currentTimeEl = document.getElementById('currentTime');
    
    if (progressBar) progressBar.style.width = '0%';
    if (progressDot) progressDot.style.left = '0%';
    if (currentTimeEl) currentTimeEl.textContent = '0:00';
    
    // Se estava tocando, continua tocando a nova música
    if (isPlaying) {
        songAudio.play().catch(err => console.warn('[Player] Erro ao reproduzir:', err));
    }

    setTimeout(() => {
        if (card) card.classList.remove('mockup-fade');
    }, 400);

    // Atualizar depoimento sincronizado
    if (data.avaliacao) {
        updateTestimonial(data.avaliacao);
    }
}

// Atualizar card de depoimento com fade
function updateTestimonial(avaliacao) {
    const testimonialCard = document.getElementById('testimonialCard');
    if (!testimonialCard) return;

    // Fade out
    testimonialCard.style.opacity = '0';
    testimonialCard.style.transition = 'opacity 0.3s ease-in-out';

    setTimeout(() => {
        // Atualizar elementos
        const photoEl = document.getElementById('testimonialPhoto');
        const nameEl = document.getElementById('testimonialName');
        const starsEl = document.getElementById('testimonialStars');
        const textEl = document.getElementById('testimonialText');
        const occasionEl = document.getElementById('testimonialOccasion');

        if (photoEl) {
            photoEl.src = avaliacao.foto;
            photoEl.alt = avaliacao.nome;
            // Atualizar source webp se existir
            const sourceEl = photoEl.parentElement.querySelector('source');
            if (sourceEl && avaliacao.fotoWebp) {
                sourceEl.srcset = avaliacao.fotoWebp;
            }
        }
        if (nameEl) nameEl.textContent = avaliacao.nome;
        if (starsEl) {
            let starsHtml = '';
            for (let i = 0; i < avaliacao.estrelas; i++) {
                starsHtml += '<i class="fas fa-star"></i>';
            }
            starsEl.innerHTML = starsHtml;
        }
        if (textEl) textEl.textContent = '"' + avaliacao.texto + '"';
        if (occasionEl) occasionEl.textContent = avaliacao.occasiao;

        // Fade in
        testimonialCard.style.opacity = '1';
    }, 300);
}

// Próxima música
function proximaMusica() {
    musicaAtual = (musicaAtual + 1) % musicas.length;
    updateMockup(musicas[musicaAtual]);
}

// Música anterior
function musicaAnterior() {
    musicaAtual = (musicaAtual - 1 + musicas.length) % musicas.length;
    updateMockup(musicas[musicaAtual]);
}

// Inicializar player
function initPlayer() {
    if (!songAudio) return;
    
    // Carregar primeira música
    songAudio.src = musicas[0].audioSrc;
    
    // Inicializar mockup com dados da primeira música
    updateMockup(musicas[0]);
    
    // Eventos do áudio
    songAudio.addEventListener('timeupdate', updateProgress);
    songAudio.addEventListener('loadedmetadata', updateDuration);
    songAudio.addEventListener('ended', () => {
        // Próxima música automaticamente
        proximaMusica();
    });
    
    // Clique na barra de progresso para seek
    const progressContainer = document.querySelector('#smartphoneMockup .bg-gray-100.h-1\\.5');
    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            if (!songAudio.duration) return;
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            songAudio.currentTime = percent * songAudio.duration;
        });
    }
}

// Swipe gesture support
(function initSwipe() {
    const mockup = document.getElementById('smartphoneMockup');
    if (!mockup) return;
    let touchStartX = 0;

    mockup.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    mockup.addEventListener('touchend', function(e) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 50) {
            if (deltaX < 0) proximaMusica();
            else musicaAnterior();
        }
    }, { passive: true });
})();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initPlayer);

// Exportar funções para uso global
window.togglePlay = togglePlay;
window.updateMockup = updateMockup;
window.proximaMusica = proximaMusica;
window.musicaAnterior = musicaAnterior;
window.musicas = musicas;
window.musicaAtual = musicaAtual;
