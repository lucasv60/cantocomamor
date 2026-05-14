/**
 * Meta Conversions API (CAPI) Endpoint
 * Envia eventos de conversão para a Meta via servidor
 * 
 * Pixel ID: 1951531058824472
 */

const META_PIXEL_ID = '1951531058824472';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_API_VERSION = 'v18.0';
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events`;

/**
 * Gera um ID único para o evento
 */
function generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hash SHA-256 dos dados do usuário para correspondência avançada
 */
async function hashData(data) {
    if (!data) return null;
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Prepara dados do usuário com hash para correspondência avançada
 */
async function prepareUserData(userData) {
    const hashedData = {};
    
    if (userData?.email) {
        hashedData.em = [await hashData(userData.email)];
    }
    if (userData?.phone) {
        // Remove caracteres não numéricos e adiciona código do país se necessário
        let phone = userData.phone.replace(/\D/g, '');
        if (phone.length === 11 && phone.startsWith('0')) {
            phone = '55' + phone.substring(1);
        } else if (phone.length === 11) {
            phone = '55' + phone;
        }
        hashedData.ph = [await hashData(phone)];
    }
    if (userData?.name) {
        const nameParts = userData.name.toLowerCase().trim().split(' ');
        if (nameParts.length > 0) {
            hashedData.fn = [await hashData(nameParts[0])];
        }
        if (nameParts.length > 1) {
            hashedData.ln = [await hashData(nameParts[nameParts.length - 1])];
        }
    }
    if (userData?.cpf) {
        hashedData.external_id = [await hashData(userData.cpf.replace(/\D/g, ''))];
    }
    if (userData?.external_id) {
        hashedData.external_id = [await hashData(userData.external_id)];
    }
    if (userData?.fbp) {
        hashedData.fbp = userData.fbp;
    }
    if (userData?.fbc) {
        hashedData.fbc = userData.fbc;
    }
    if (userData?.client_ip_address) {
        hashedData.client_ip_address = userData.client_ip_address;
    }
    if (userData?.client_user_agent) {
        hashedData.client_user_agent = userData.client_user_agent;
    }
    
    return hashedData;
}

/**
 * Envia evento para a Meta Conversions API
 */
async function sendMetaEvent(eventName, eventData, userData, actionSource = 'website', testEventCode = null, eventId = null) {
    // Usa event_id fornecido ou gera um novo (para deduplicação)
    const finalEventId = eventId || generateEventId();
    const eventTime = Math.floor(Date.now() / 1000);
    
    const hashedUserData = await prepareUserData(userData);
    
    const payload = {
        data: [
            {
                event_name: eventName,
                event_time: eventTime,
                event_id: finalEventId,
                action_source: actionSource,
                user_data: hashedUserData,
                custom_data: {
                    content_name: eventData?.content_name || '',
                    content_category: eventData?.content_category || '',
                    value: eventData?.value || 0,
                    currency: eventData?.currency || 'BRL',
                    content_type: 'product',
                    contents: [{
                        id: 'musica_personalizada',
                        quantity: 1,
                        item_price: eventData?.value || 0
                    }]
                }
            }
        ]
    };
    
    // Adiciona test_event_code se fornecido (para testes no Facebook Events Manager)
    const testCodeParam = testEventCode ? `&test_event_code=${testEventCode}` : '';
    
    try {
        const response = await fetch(`${META_API_URL}?access_token=${META_ACCESS_TOKEN}${testCodeParam}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        console.log('[Meta CAPI] Event sent:', {
            event_name: eventName,
            event_id: finalEventId,
            status: response.status,
            result: result
        });
        
        return {
            success: response.ok,
            event_id: eventId,
            status: response.status,
            result: result
        };
    } catch (error) {
        console.error('[Meta CAPI] Error sending event:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handler principal da API
 */
export default async function handler(req, res) {
    // Apenas POST é permitido
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { event_name, event_id, event_data, user_data, test_event_code } = req.body;
        
        if (!event_name) {
            return res.status(400).json({ error: 'event_name is required' });
        }
        
        // Lista de eventos permitidos
        const allowedEvents = [
            'PageView',
            'ViewContent',
            'InitiateCheckout',
            'AddPaymentInfo',
            'Purchase',
            'Lead'
        ];
        
        if (!allowedEvents.includes(event_name)) {
            return res.status(400).json({
                error: 'Invalid event_name',
                allowed_events: allowedEvents
            });
        }
        
        // Extrai IP e User Agent da requisição
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                         req.headers['x-real-ip'] ||
                         req.connection?.remoteAddress ||
                         null;
        const clientUserAgent = req.headers['user-agent'] || null;
        
        // Adiciona IP e User Agent aos dados do usuário
        const enrichedUserData = {
            ...user_data,
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent
        };
        
        const result = await sendMetaEvent(event_name, event_data, enrichedUserData, 'website', test_event_code, event_id);
        
        return res.status(result.success ? 200 : 500).json(result);
        
    } catch (error) {
        console.error('[Meta CAPI] Handler error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
