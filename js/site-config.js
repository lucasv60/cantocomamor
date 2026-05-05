/**
 * SITE-CONFIG.JS
 *
 * Carrega configurações das variáveis de ambiente da Vercel.
 * Inclua este script em TODAS as páginas HTML:
 *
 *   <script src="/scripts/site-config.js"></script>
 */

(function() {
    // Configurações padrão (fallback)
    window.CONFIG = {
        whatsapp: { numero: '', formatado: '' },
        email: { suporte: 'lucasrodriguesfavaro@gmail.com' },
        loaded: false
    };

    // Carrega da Vercel
    fetch('/api/get-config')
        .then(r => r.json())
        .then(data => {
            window.CONFIG = { ...data, loaded: true };
            document.dispatchEvent(new Event('config-loaded'));
            console.log('✅ Config carregada:', window.CONFIG);
        })
        .catch(err => {
            console.warn('⚠️ Erro ao carregar config:', err);
        });

    // ========== FUNÇÕES HELPER ==========

    /**
     * Gera link do WhatsApp
     * @param {string} msg - Mensagem (opcional)
     */
    window.getWhatsAppLink = function(msg) {
        const numero = window.CONFIG.whatsapp.numero;
        if (!numero) return '#';
        const texto = msg || 'Olá! Vim pelo site Canto com Amor';
        return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    };

    /**
     * Gera link do WhatsApp para suporte de pedido
     */
    window.getWhatsAppSuporte = function(orderId, email) {
        const msg = `Olá! Preciso de ajuda com meu pedido.\n\nPedido: ${orderId || '-'}\nEmail: ${email || '-'}`;
        return window.getWhatsAppLink(msg);
    };

    /**
     * Retorna email de suporte
     */
    window.getEmailSuporte = function() {
        return window.CONFIG.email.suporte;
    };

})();