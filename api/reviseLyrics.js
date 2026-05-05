/**
 * API Route: Revisar Letra
 * 
 * Função serverless da Vercel para revisão/regeneração de letras
 * de música personalizadas via OpenAI.
 * 
 * Endpoint: POST /api/reviseLyrics
 */

import OpenAI from 'openai';

// Inicializa cliente OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const {
            estilo,
            ocasiao,
            relacionamento,
            destinatario,
            mensagem,
            letraAtual,
            correcoes,
            captchaToken
        } = req.body;

        // Validação básica
        if (!letraAtual || !correcoes) {
            return res.status(400).json({
                error: 'Campos obrigatórios: letraAtual, correcoes'
            });
        }

        // Verifica se a API key está configurada
        if (!process.env.OPENAI_API_KEY) {
            console.error('[reviseLyrics] OPENAI_API_KEY não configurada');
            return res.status(500).json({
                error: 'Configuração do servidor incompleta'
            });
        }

        // Monta o prompt para revisão
        const prompt = `Você é um compositor profissional brasileiro.

O usuário solicitou uma revisão na seguinte letra de música:

--- LETRA ATUAL ---
${letraAtual}
--- FIM DA LETRA ATUAL ---

--- SOLICITAÇÃO DE REVISÃO ---
${correcoes}
--- FIM DA SOLICITAÇÃO ---

${destinatario ? `A música é para: ${destinatario}` : ''}
${estilo ? `Estilo musical: ${estilo}` : ''}
${ocasiao ? `Ocasião: ${ocasiao}` : ''}
${relacionamento ? `Relacionamento: ${relacionamento}` : ''}
${mensagem ? `Contexto original: ${mensagem}` : ''}

Instruções:
1. Mantenha o título se não houver solicitação para mudá-lo
2. Aplique as correções solicitadas mantendo a essência da música
3. Se a solicitação for "Gere outra versão", crie uma variação com rimas e fluidez diferentes
4. Mantenha a estrutura (versos, refrão, ponte)
5. Preserve o tom emocional

FORMATO DA RESPOSTA (JSON válido):
{
    "titulo": "Título da Música",
    "letra": "Verso 1\\n[letra do verso 1]\\n\\nRefrão\\n[letra do refrão]\\n..."
}

Retorne APENAS o JSON, sem texto adicional.`;

        // Chama a API do OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um compositor profissional brasileiro especializado em revisões de letras. Sempre responda em português do Brasil. Retorne apenas JSON válido.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        // Extrai a resposta
        const responseContent = completion.choices[0]?.message?.content;

        if (!responseContent) {
            throw new Error('Resposta vazia do OpenAI');
        }

        // Parse do JSON
        const resultado = JSON.parse(responseContent);

        // Valida estrutura da resposta
        if (!resultado.titulo || !resultado.letra) {
            throw new Error('Resposta incompleta do OpenAI');
        }

        // Log para monitoramento
        console.log('[reviseLyrics] Sucesso:', {
            destinatario,
            estilo,
            tokens: completion.usage?.total_tokens
        });

        // Retorna sucesso
        return res.status(200).json({
            titulo: resultado.titulo,
            letra: resultado.letra,
            metadata: {
                tokens: completion.usage?.total_tokens
            }
        });

    } catch (error) {
        console.error('[reviseLyrics] Erro:', error);

        // Erro de parsing do JSON do OpenAI
        if (error instanceof SyntaxError) {
            return res.status(500).json({
                error: 'Erro ao processar resposta da IA',
                details: 'Formato de resposta inválido'
            });
        }

        // Erro de quota da OpenAI
        if (error.status === 429) {
            return res.status(429).json({
                error: 'Limite de requisições excedido. Tente novamente em alguns segundos.'
            });
        }

        // Erro de autenticação OpenAI
        if (error.status === 401) {
            console.error('[reviseLyrics] Erro de autenticação OpenAI');
            return res.status(500).json({
                error: 'Erro de configuração do servidor'
            });
        }

        // Erro genérico
        return res.status(500).json({
            error: 'Erro ao revisar letra. Tente novamente.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
