/**
 * API Route: Stripe Checkout
 * 
 * Função serverless da Vercel para criar sessão de checkout do Stripe.
 * 
 * Endpoint: POST /api/stripe-checkout
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const {
            leadId,
            email,
            nome,
            telefone,
            cpf,
            destinatario,
            estilo,
            preco,
            prioritaryDelivery
        } = req.body;

        // Validação básica
        if (!email || !preco) {
            return res.status(400).json({
                error: 'Campos obrigatórios: email, preco'
            });
        }

        // Verifica se a API key está configurada
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('[stripe-checkout] STRIPE_SECRET_KEY não configurada');
            return res.status(500).json({
                error: 'Configuração do servidor incompleta'
            });
        }

        // Calcula o valor em centavos (Stripe trabalha com centavos)
        const valorCentavos = Math.round(parseFloat(preco) * 100);

        // Cria a sessão de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            client_reference_id: leadId || undefined,
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `Música Personalizada - ${estilo || 'Personalizado'}`,
                            description: `Música para ${destinatario || 'pessoa especial'}${prioritaryDelivery ? ' (Entrega Prioritária)' : ''}`,
                        },
                        unit_amount: valorCentavos,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/?cancel=true`,
            metadata: {
                leadId: leadId || '',
                email: email,
                nome: nome || '',
                telefone: telefone || '',
                cpf: cpf || '',
                destinatario: destinatario || '',
                estilo: estilo || '',
                prioritaryDelivery: prioritaryDelivery ? 'true' : 'false'
            }
        });

        // Log para monitoramento
        console.log('[stripe-checkout] Sessão criada:', {
            sessionId: session.id,
            leadId,
            email,
            valor: preco
        });

        // Retorna a URL de checkout
        return res.status(200).json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('[stripe-checkout] Erro:', error);

        // Erro de autenticação Stripe
        if (error.type === 'StripeAuthenticationError') {
            return res.status(500).json({
                error: 'Erro de configuração do servidor'
            });
        }

        // Erro genérico
        return res.status(500).json({
            error: 'Erro ao criar sessão de pagamento. Tente novamente.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
