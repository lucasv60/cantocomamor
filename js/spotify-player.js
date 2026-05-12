/**
 * Spotify Player Mockup - Canto com Amor
 * Lógica do player de música simulado no Hero
 */

const musicas = [
    {
        titulo: 'Beijo de Mar',
        estilo: 'Sertanejo Romântico',
        capa: 'images/sertanejo.jpg',
        youtubeId: '',
        historia: "'Quero que a música fale do nosso primeiro encontro na praia, do som das ondas e de como o beijo dela mudou minha vida...'",
        duracao: '3:20'
    },
    {
        titulo: 'Raízes do Campo',
        estilo: 'Folk Brasileiro',
        capa: 'images/folk.jpg',
        youtubeId: '',
        historia: "'Uma canção que celebra as tradições e a simplicidade da vida no interior, com violão e sanfona...'",
        duracao: '2:55'
    },
    {
        titulo: 'Graça Divina',
        estilo: 'Gospel Inspirador',
        capa: 'images/gospel.jpg',
        youtubeId: '',
        historia: "'Uma música de gratidão e fé, para momentos de reflexão e celebração espiritual...'",
        duracao: '4:10'
    },
    {
        titulo: 'Noite de Verão',
        estilo: 'MPB Contemporânea',
        capa: 'images/mpb.jpg',
        youtubeId: '',
        historia: "'Inspirada nas noites de verão no Rio, com bossa nova, poesia e melancolia suave...'",
        duracao: '3:45'
    }
];

let musicaAtual = 0;
let isSpotifyPlaying = false;
let progressInterval = null;
let currentProgress = 0;

function togglePlay() {
    const btn = document.getElementById('playPauseBtn');
    const icon = document.getElementById('playPauseIcon');
    const frame = document.getElementById('youtubeFrame');
    const atual = musicas[musicaAtual];
    
    isSpotifyPlaying = !isSpotifyPlaying;
    
    if (isSpotifyPlaying) {
        icon.className = 'fas fa-pause text-white text-2xl';
        // Controle do YouTube via postMessage
        if (atual.youtubeId) {
            frame.src = `https://www.youtube.com/embed/${atual.youtubeId}?autoplay=1&enablejsapi=1`;
            frame.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        }
        // Simular progresso
        progressInterval = setInterval(() => {
            if (currentProgress < 100) {
                currentProgress += 0.5;
                updateProgress(currentProgress);
            }
        }, 1000);
    } else {
        icon.className = 'fas fa-play text-white text-2xl ml-1';
        if (musicas[musicaAtual].youtubeId) {
            frame.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
        clearInterval(progressInterval);
    }
}

function updateProgress(percent) {
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressDot').style.left = percent + '%';
    // Atualizar tempo
    const totalSeconds = 200; // 3:20
    const current = Math.floor((percent / 100) * totalSeconds);
    const mins = Math.floor(current / 60);
    const secs = current % 60;
    document.getElementById('currentTime').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function updateMockup(data) {
    const card = document.querySelector('#smartphoneMockup .bg-white.rounded-\\[2\\.5rem\\]');
    if (card) card.classList.add('mockup-fade');

    document.getElementById('mockupTitle').textContent = data.titulo;
    document.getElementById('mockupStyle').textContent = data.estilo;
    document.getElementById('mockupCover').src = data.capa;
    document.getElementById('mockupStory').textContent = data.historia;
    document.getElementById('totalTime').textContent = data.duracao;
    // Reset
    currentProgress = 0;
    updateProgress(0);
    if (isSpotifyPlaying) togglePlay();

    setTimeout(() => {
        if (card) card.classList.remove('mockup-fade');
    }, 400);
}

function proximaMusica() {
    musicaAtual = (musicaAtual + 1) % musicas.length;
    updateMockup(musicas[musicaAtual]);
}

function musicaAnterior() {
    musicaAtual = (musicaAtual - 1 + musicas.length) % musicas.length;
    updateMockup(musicas[musicaAtual]);
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

// Exportar funções para uso global
window.togglePlay = togglePlay;
window.updateProgress = updateProgress;
window.updateMockup = updateMockup;
window.proximaMusica = proximaMusica;
window.musicaAnterior = musicaAnterior;
window.musicas = musicas;
window.musicaAtual = musicaAtual;
