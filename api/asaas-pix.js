/**
 * API Route: Asaas PIX
 * 
 * Função serverless da Vercel para gerar cobrança PIX via Asaas.
 * 
 * Endpoint: POST /api/asaas-pix
 */

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
            cpf,
            telefone,
            destinatario,
            estilo,
            preco,
            prioritaryDelivery
        } = req.body;

        // Validação básica
        if (!email || !preco || !nome) {
            return res.status(400).json({
                error: 'Campos obrigatórios: email, preco, nome'
            });
        }

        // Verifica se a API key está configurada
        if (!process.env.ASAAS_API_KEY) {
            console.error('[asaas-pix] ASAAS_API_KEY não configurada');
            return res.status(500).json({
                error: 'Configuração do servidor incompleta'
            });
        }

        const ASAAS_API_URL = process.env.ASAAS_SANDBOX === 'true' 
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://www.asaas.com/api/v3';

        // Primeiro, cria ou busca o cliente no Asaas
        let customerId;
        
        // Busca cliente existente pelo email
        const searchResponse = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(email)}`, {
            headers: {
                'access_token': process.env.ASAAS_API_KEY
            }
        });
        
        const searchData = await searchResponse.json();
        
        if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
        } else {
            // Cria novo cliente
            const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': process.env.ASAAS_API_KEY
                },
                body: JSON.stringify({
                    name: nome,
                    email: email,
                    cpfCnpj: cpf ? cpf.replace(/\D/g, '') : undefined,
                    phone: telefone || undefined,
                    notificationDisabled: false
                })
            });

            const customerData = await createCustomerResponse.json();
            
            if (!createCustomerResponse.ok) {
                console.error('[asaas-pix] Erro ao criar cliente:', customerData);
                return res.status(500).json({
                    error: 'Erro ao criar cliente no gateway de pagamento'
                });
            }
            
            customerId = customerData.id;
        }

        // Cria a cobrança PIX
        const valor = parseFloat(preco);
        
        const cobrancaResponse = await fetch(`${ASAAS_API_URL}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
                customer: customerId,
                billingType: 'PIX',
                value: valor,
                dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0], // 30 minutos
                description: `Música Personalizada - ${estilo || 'Personalizado'} - Para: ${destinatario || 'pessoa especial'}`,
                externalReference: leadId || undefined,
                postalService: false
            })
        });

        const cobrancaData = await cobrancaResponse.json();

        if (!cobrancaResponse.ok) {
            console.error('[asaas-pix] Erro ao criar cobrança:', cobrancaData);
            return res.status(500).json({
                error: 'Erro ao gerar cobrança PIX. Tente novamente.'
            });
        }

        // Busca o QR Code do PIX
        const qrCodeResponse = await fetch(`${ASAAS_API_URL}/payments/${cobrancaData.id}/pixQrCode`, {
            headers: {
                'access_token': process.env.ASAAS_API_KEY
            }
        });

        const qrCodeData = await qrCodeResponse.json();

        // Log para monitoramento
        console.log('[asaas-pix] Cobrança criada:', {
            paymentId: cobrancaData.id,
            leadId,
            email,
            valor
        });

        // Retorna os dados do PIX
        return res.status(200).json({
            paymentId: cobrancaData.id,
            qrCode: qrCodeData.encodedImage || null,
            copyPaste: qrCodeData.payload || null,
            valor: valor,
            expiraEm: cobrancaData.dueDate
        });

    } catch (error) {
        console.error('[asaas-pix] Erro:', error);

        // Erro genérico
        return res.status(500).json({
            error: 'Erro ao gerar PIX. Tente novamente.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
