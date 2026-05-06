/**
 * Meta Pixel Code - Canto com Amor
 * Facebook Pixel initialization and event tracking
 */

// Stub fbq para fila de eventos enquanto o script real ainda não carregou.
// Init real é diferido (requestIdleCallback) para não bloquear o thread principal.
(function (f, b) {
    if (f.fbq) return;
    var n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
})(window, document);

function loadFbPixel() {
    if (loadFbPixel.done) return;
    loadFbPixel.done = true;
    var t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(t, s);
    fbq('init', '1692533358817704');
    fbq('track', 'PageView');
}

if ('requestIdleCallback' in window) {
    requestIdleCallback(loadFbPixel, { timeout: 3000 });
} else {
    setTimeout(loadFbPixel, 1500);
}

// Função atualizada para Appmax
async function handlePagamento() {
    // ✅ Dispara evento AddPaymentInfo do Facebook Pixel
    if (typeof fbq !== 'undefined') {
        const prioritary = document.getElementById('prioritaryDelivery')?.checked || false;
        const totalValue = window.currentBasePrice + (prioritary ? 19.90 : 0);

        fbq('track', 'AddPaymentInfo', {
            content_name: 'Checkout Música Personalizada',
            content_category: 'music_purchase',
            value: totalValue,
            currency: 'BRL'
        });
    }

    // Chama função de pagamento Appmax
    await pagarAppmax();
}

// Exportar funções para uso global
window.handlePagamento = handlePagamento;
window.loadFbPixel = loadFbPixel;
