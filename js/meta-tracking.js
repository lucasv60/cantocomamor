/**
 * Meta Tracking Helper - Captura de cookies e dados para EMQ
 * Este arquivo deve ser incluído em todas as páginas
 */

(function() {
    'use strict';

    /**
     * Captura cookie pelo nome
     */
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    /**
     * Captura todos os cookies relevantes para Meta
     */
    function getMetaCookies() {
        return {
            fbp: getCookie('_fbp') || null,
            fbc: getCookie('_fbc') || null
        };
    }

    /**
     * Gera um ID único para eventos
     */
    function generateEventId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Captura dados técnicos do navegador
     */
    function getTechnicalData() {
        return {
            client_user_agent: navigator.userAgent,
            client_ip_address: null // Será capturado no backend
        };
    }

    /**
     * Prepara dados completos para envio à API
     */
    function prepareEventData(eventName, eventData, userData) {
        const cookies = getMetaCookies();
        const technicalData = getTechnicalData();
        const eventId = generateEventId();
        
        return {
            event_name: eventName,
            event_id: eventId,
            event_data: eventData || {},
            user_data: {
                ...userData,
                fbp: cookies.fbp,
                fbc: cookies.fbc,
                client_user_agent: technicalData.client_user_agent
            }
        };
    }

    // Exporta funções para uso global
    window.MetaTracking = {
        getCookie: getCookie,
        getMetaCookies: getMetaCookies,
        generateEventId: generateEventId,
        getTechnicalData: getTechnicalData,
        prepareEventData: prepareEventData
    };

    console.log('[Meta Tracking] Helper carregado. Cookies:', getMetaCookies());
})();
