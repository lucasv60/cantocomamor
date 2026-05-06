/**
 * Spotify Player Mockup - Canto com Amor
 * Lógica do player de música simulado no Hero
 */

const mockupData = {
    titulo: 'Beijo de Mar',
    estilo: 'Sertanejo Romântico',
    capa: 'images/sertanejo.jpg',
    youtubeId: '',
    historia: "'Quero que a música fale do nosso primeiro encontro na praia, do som das ondas e de como o beijo dela mudou minha vida...'",
    duracao: '3:20'
};

let isPlaying = false;
let progressInterval = null;
let currentProgress = 0;

function togglePlay() {
    const btn = document.getElementById('playPauseBtn');
    const icon = document.getElementById('playPauseIcon');
    const frame = document.getElementById('youtubeFrame');
    
    isPlaying = !isPlaying;
    
    if (isPlaying) {
        icon.className = 'fas fa-pause text-white text-2xl';
        // Controle do YouTube via postMessage
        if (mockupData.youtubeId) {
            frame.src = `https://www.youtube.com/embed/${mockupData.youtubeId}?autoplay=1&enablejsapi=1`;
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
        if (mockupData.youtubeId) {
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
    document.getElementById('mockupTitle').textContent = data.titulo;
    document.getElementById('mockupStyle').textContent = data.estilo;
    document.getElementById('mockupCover').src = data.capa;
    document.getElementById('mockupStory').textContent = data.historia;
    document.getElementById('totalTime').textContent = data.duracao;
    // Reset
    currentProgress = 0;
    updateProgress(0);
    if (isPlaying) togglePlay();
}

// Exportar funções para uso global
window.togglePlay = togglePlay;
window.updateProgress = updateProgress;
window.updateMockup = updateMockup;
window.mockupData = mockupData;
