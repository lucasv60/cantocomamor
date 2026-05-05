/**
 * API Route: Get Config
 * 
 * Função serverless da Vercel para retornar configurações públicas do site.
 * 
 * Endpoint: GET /api/get-config
 */

export default async function handler(req, res) {
    // Apenas aceita GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Configurações públicas do site
        // NUNCA inclua chaves secretas ou dados sensíveis aqui
        const config = {
            whatsapp: {
                numero: process.env.WHATSAPP_NUMBER || '554499723421',
                formatado: process.env.WHATSAPP_FORMATTED || '(44) 99723-4215'
            },
            email: {
                suporte: process.env.SUPPORT_EMAIL || 'lucasrodriguesfavaro@gmail.com'
            },
            features: {
                captchaEnabled: true,
                supabaseEnabled: !!process.env.SUPABASE_URL
            },
            version: '1.0.0'
        };

        // Headers de cache (configuração muda raramente)
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

        return res.status(200).json(config);

    } catch (error) {
        console.error('[get-config] Erro:', error);

        return res.status(500).json({
            error: 'Erro ao carregar configurações'
        });
    }
}
