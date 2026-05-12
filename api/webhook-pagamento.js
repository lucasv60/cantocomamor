/**
 * API Route: Webhook Pagamento
 *
 * Função serverless da Vercel para receber confirmações de pagamento
 * do Stripe e Asaas e atualizar o status do lead no Supabase.
 *
 * Endpoint: POST /api/webhook-pagamento
 */

import Stripe from 'stripe';

// Inicializa Stripe apenas se a chave for válida (não placeholder)
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey && !stripeKey.includes('your_') && stripeKey.startsWith('sk_')
    ? new Stripe(stripeKey)
    : null;

// Desativa o bodyParser para receber raw body (necessário para validação de assinatura)
export const config = {
    api: {
        bodyParser: false
    }
};

// Cliente Supabase via fetch (sem dependência adicional)
async function supabaseRequest(endpoint, method, body) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('[webhook-pagamento] SUPABASE_URL ou SUPABASE_ANON_KEY não configurados');
        throw new Error('Configuração do Supabase incompleta');
    }
    
    const url = `${supabaseUrl}${endpoint}`;
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[webhook-pagamento] Erro Supabase:', response.status, errorText);
        throw new Error(`Supabase retornou ${response.status}: ${errorText}`);
    }
    
    return response.json();
}

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Coleta o raw body (chunks) para validação de assinatura
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const rawBody = Buffer.concat(chunks).toString();

        // Identifica a origem do webhook
        const stripeSignature = req.headers['stripe-signature'];
        
        if (stripeSignature && stripe) {
            // ===== WEBHOOK DO STRIPE =====
            return await handleStripeWebhook(req, res, stripeSignature, rawBody);
        } else {
            // ===== WEBHOOK DO ASAAS =====
            return await handleAsaasWebhook(req, res, rawBody);
        }

    } catch (error) {
        console.error('[webhook-pagamento] Erro:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}

/**
 * Processa webhook do Stripe
 */
async function handleStripeWebhook(req, res, signature, rawBody) {
    let event;

    try {
        // Verifica a assinatura do webhook usando o raw body
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('[webhook-pagamento] Erro na verificação do Stripe:', err.message);
        return res.status(400).json({ error: 'Assinatura inválida' });
    }

    // Processa apenas eventos de pagamento concluído
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const leadId = session.metadata?.leadId;

        if (leadId) {
            // Atualiza o lead no Supabase
            await supabaseRequest(`/rest/v1/leads?id=eq.${leadId}`, 'PATCH', {
                status_pagamento: 'pago',
                gateway: 'stripe',
                gateway_payment_id: session.payment_intent,
                valor_pago: session.amount_total / 100, // Converte de centavos
                atualizado_em: new Date().toISOString()
            });

            console.log('[webhook-pagamento] Stripe - Lead atualizado:', leadId);
        }
    }

    return res.status(200).json({ received: true });
}

/**
 * Processa webhook do Asaas
 */
async function handleAsaasWebhook(req, res, rawBody) {
    // Parse do raw body para JSON
    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (err) {
        console.error('[webhook-pagamento] Erro ao parsear body do Asaas:', err.message);
        return res.status(400).json({ error: 'Body inválido' });
    }

    // Log de confirmação de conexão
    console.log('[webhook-pagamento] Webhook recebido da conta Asaas - Evento:', event.event);

    // Verifica se é um evento de pagamento confirmado
    if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
        const payment = event.payment;
        const leadId = payment?.externalReference;

        if (leadId) {
            // Atualiza o lead no Supabase
            try {
                const result = await supabaseRequest(`/rest/v1/leads?id=eq.${leadId}`, 'PATCH', {
                    status: 'paid',
                    status_pagamento: 'pago',
                    payment_id: payment.id,
                    gateway: 'asaas',
                    gateway_payment_id: payment.id,
                    valor_pago: payment.value,
                    atualizado_em: new Date().toISOString()
                });
                console.log('[webhook-pagamento] Asaas - Lead atualizado:', leadId, JSON.stringify(result));
            } catch (err) {
                console.error('[webhook-pagamento] Erro ao atualizar lead:', leadId, err.message);
            }
        }
    }

    return res.status(200).json({ received: true });
}
