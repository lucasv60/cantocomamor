/**
 * API Route: Webhook Pagamento
 * 
 * Função serverless da Vercel para receber confirmações de pagamento
 * do Stripe e Asaas e atualizar o status do lead no Supabase.
 * 
 * Endpoint: POST /api/webhook-pagamento
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Cliente Supabase via fetch (sem dependência adicional)
async function supabaseRequest(endpoint, method, body) {
    const url = `${process.env.SUPABASE_URL}${endpoint}`;
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    return response.json();
}

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Identifica a origem do webhook
        const stripeSignature = req.headers['stripe-signature'];
        
        if (stripeSignature) {
            // ===== WEBHOOK DO STRIPE =====
            return await handleStripeWebhook(req, res, stripeSignature);
        } else {
            // ===== WEBHOOK DO ASAAS =====
            return await handleAsaasWebhook(req, res);
        }

    } catch (error) {
        console.error('[webhook-pagamento] Erro:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}

/**
 * Processa webhook do Stripe
 */
async function handleStripeWebhook(req, res, signature) {
    let event;

    try {
        // Verifica a assinatura do webhook
        event = stripe.webhooks.constructEvent(
            req.body,
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
async function handleAsaasWebhook(req, res) {
    const event = req.body;

    // Verifica se é um evento de pagamento confirmado
    if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
        const payment = event.payment;
        const leadId = payment?.externalReference;

        if (leadId) {
            // Atualiza o lead no Supabase
            await supabaseRequest(`/rest/v1/leads?id=eq.${leadId}`, 'PATCH', {
                status_pagamento: 'pago',
                gateway: 'asaas',
                gateway_payment_id: payment.id,
                valor_pago: payment.value,
                atualizado_em: new Date().toISOString()
            });

            console.log('[webhook-pagamento] Asaas - Lead atualizado:', leadId);
        }
    }

    return res.status(200).json({ received: true });
}
