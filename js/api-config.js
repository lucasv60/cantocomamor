/**
 * API-CONFIG.JS
 *
 * Configuração centralizada de endpoints e integrações.
 * Este arquivo deve ser carregado ANTES de love-script.js
 *
 * Para alterar o backend, modifique API_BASE_URL.
 */

(function() {
    'use strict';

    // ========================================
    // URL BASE DO BACKEND
    // ========================================
    // Em produção na Vercel, usa funções serverless relativas
    // Para desenvolvimento local, pode apontar para outro servidor
    const API_BASE_URL = '';

    // ========================================
    // ENDPOINTS DA API
    // ========================================
    const ENDPOINTS = {
        // Geração de letra via IA
        gerarLetra: '/api/gerarLetra',
        
        // Revisão/regeneração de letra
        reviseLyrics: '/api/reviseLyrics',
        
        // Email de lembrete
        emailReminder: '/api/emailReminder',
        
        // Configurações do site
        getConfig: '/api/get-config',
        
        // Appmax - Criar checkout
        criarCheckoutAppmax: '/api/criarCheckoutAppmax',
        
        // Appmax - Verificar status do pagamento
        verificarPagamentoAppmax: '/api/verificarPagamentoAppmax'
    };

    // ========================================
    // CONFIGURAÇÕES DO EMAILJS
    // ========================================
    const EMAILJS = {
        // Substitua pelos seus valores ou deixe vazio para usar variáveis de ambiente
        serviceId: '',
        templateId: '',
        publicKey: ''
    };

    // ========================================
    // CONFIGURAÇÕES DO RECAPTCHA
    // ========================================
    const RECAPTCHA = {
        siteKey: '6LdTs5AsAAAAAOfcTmGMRhocyVn0Sdoy5Yz5zWXW'
    };

    // ========================================
    // CONFIGURAÇÕES DO WHATSAPP
    // ========================================
    const WHATSAPP = {
        numero: '554499723421',
        mensagemPadrao: 'Olá! Vim pelo site Canto com Amor'
    };

    // ========================================
    // CONFIGURAÇÕES DO SUPABASE
    // ========================================
    const SUPABASE = {
        url: 'https://lhxefftvulruaefgtbhs.supabase.co',  // Substitua pela sua URL do Supabase (ex: https://xxxxx.supabase.co)
        anonKey: 'sb_publishable_y29KQ8N_j0_WyGA3HLokIw_GlrkAnhl'  // Substitua pela sua anon key do Supabase
    };

    // Inicializa cliente Supabase se as credenciais estiverem configuradas
    let supabaseClient = null;
    if (SUPABASE.url && SUPABASE.anonKey && typeof supabase !== 'undefined') {
        try {
            supabaseClient = supabase.createClient(SUPABASE.url, SUPABASE.anonKey);
            console.log('[API-CONFIG] Supabase client inicializado');
        } catch (err) {
            console.error('[API-CONFIG] Erro ao inicializar Supabase:', err);
        }
    }

    // ========================================
    // HELPER: Monta URL completa do endpoint
    // ========================================
    function getEndpointUrl(endpointName) {
        const path = ENDPOINTS[endpointName];
        if (!path) {
            console.error(`[API-CONFIG] Endpoint desconhecido: ${endpointName}`);
            return null;
        }
        return API_BASE_URL + path;
    }

    // ========================================
    // HELPER: Fetch com configurações padrão
    // ========================================
    async function apiFetch(endpointName, options = {}) {
        const url = getEndpointUrl(endpointName);
        if (!url) throw new Error(`Endpoint não encontrado: ${endpointName}`);

        const defaultOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        return fetch(url, mergedOptions);
    }

    // ========================================
    // HELPER: Link do WhatsApp
    // ========================================
    function getWhatsAppLink(mensagem) {
        const msg = mensagem || WHATSAPP.mensagemPadrao;
        return `https://wa.me/${WHATSAPP.numero}?text=${encodeURIComponent(msg)}`;
    }

    // ========================================
    // EXPORTA CONFIGURAÇÃO GLOBAL
    // ========================================
    window.API_CONFIG = {
        baseUrl: API_BASE_URL,
        endpoints: ENDPOINTS,
        emailjs: EMAILJS,
        recaptcha: RECAPTCHA,
        whatsapp: WHATSAPP,
        supabase: SUPABASE,
        supabaseClient: supabaseClient,
        
        // Helpers
        getEndpointUrl: getEndpointUrl,
        apiFetch: apiFetch,
        getWhatsAppLink: getWhatsAppLink
    };

    console.log('[API-CONFIG] Configuração carregada:', {
        baseUrl: API_BASE_URL || '(relativo)',
        endpoints: Object.keys(ENDPOINTS).length,
        supabase: supabaseClient ? 'conectado' : 'não configurado'
    });

})();
