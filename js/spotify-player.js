/**
 * Spotify Player Mockup - Canto com Amor
 * Lógica do player de música com áudio real no Hero
 */

const musicas = [
    {
        titulo: 'Café da Manhã e Sonhos',
        estilo: 'Sertanejo Universitário',
        capa: 'images/sertanejo.jpg',
        audioSrc: '/audio/cafe.mp3',
        historia: "'Uma música especial para o pai, celebrando momentos de carinho e cumplicidade familiar...'",
        duracao: '0:00'
    },
    {
        titulo: 'Jardim da Nossa Fé',
        estilo: 'MPB / Gospel',
        capa: 'images/gospel.jpg',
        audioSrc: '/audio/jardim.mp3',
        historia: "'Uma canção que une fé e amor, perfeita para celebrar a união de um casal...'",
        duracao: '0:00'
    },
    {
        titulo: 'Parada do Coração',
        estilo: 'Sertanejo Romântico',
        capa: 'images/sertanejo.jpg',
        audioSrc: '/audio/parada.mp3',
        historia: "'Para os namorados que querem expressar o que sentem de forma única e especial...'",
        duracao: '0:00'
    },
    {
        titulo: 'Reencontro no Forró',
        estilo: 'Forró / Piseiro',
        capa: 'images/folk.jpg',
        audioSrc: '/audio/forro.mp3',
        historia: "'Uma música animada para surpreender a namorada com alegria e ritmo nordestino...'",
        duracao: '0:00'
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
