/**
 * API Route: Gerar Letra
 * 
 * Função serverless da Vercel para geração de letras de música
 * personalizadas via OpenAI.
 * 
 * Endpoint: POST /api/gerarLetra
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
            destinatario,
            mensagem,
            estilo,
            relacionamento,
            ocasiao,
            vocalGender,
            email,
            telefone,
            captchaToken
        } = req.body;

        // Validação básica
        if (!destinatario || !estilo) {
            return res.status(400).json({
                error: 'Campos obrigatórios: destinatario, estilo'
            });
        }

        // Verifica se a API key está configurada
        if (!process.env.OPENAI_API_KEY) {
            console.error('[gerarLetra] OPENAI_API_KEY não configurada');
            return res.status(500).json({
                error: 'Configuração do servidor incompleta'
            });
        }

        // Mapeia estilos para gêneros musicais em português
        const estiloMap = {
            'sertanejo': 'sertanejo universitário',
            'gospel': 'gospel/cristã contemporânea',
            'rock': 'rock brasileiro',
            'mpb': 'MPB (Música Popular Brasileira)',
            'folk': 'folk/acústica brasileira',
            'pop': 'pop brasileiro',
            'funk': 'funk carioca',
            'pagode': 'pagode',
            'forro': 'forró',
            'samba': 'samba'
        };

        const estiloDescricao = estiloMap[estilo] || estilo;

        // Mapeia relação para contexto
        const relacionamentoMap = {
            'namorado/a': 'parceiro(a) romântico(a)',
            'esposo/a': 'esposo(a)',
            'pai': 'pai',
            'mae': 'mãe',
            'irmao/a': 'irmão(ã)',
            'amigo/a': 'amigo(a) próximo(a)',
            'filho/a': 'filho(a)',
            'avo': 'avô/avó',
            'outro': 'pessoa especial'
        };

        const relacaoDescricao = relacionamentoMap[relacionamento] || relacionamento || 'pessoa especial';

        // Mapeia ocasião para contexto
        const ocasiaoMap = {
            'aniversario': 'aniversário',
            'casamento': 'casamento',
            'dia_das_maes': 'Dia das Mães',
            'dia_dos_pais': 'Dia dos Pais',
            'dia_dos_namorados': 'Dia dos Namorados',
            'natal': 'Natal',
            'ano_novo': 'Ano Novo',
            'formatura': 'formatura',
            'dia_mulher': 'Dia da Mulher',
            'valentine': 'Dia dos Namorados/Valentine',
            'sao_joao': 'São João',
            'carnaval': 'Carnaval',
            'dia_criancas': 'Dia das Crianças',
            'reveillon': 'Réveillon',
            'other': 'ocasião especial',
            'nenhuma': 'momento especial'
        };

        const ocasiaoDescricao = ocasiaoMap[ocasiao] || ocasiao || 'momento especial';

        // Gênero vocal para ajustar o tom
        const generoVocal = vocalGender === 'f' ? 'feminina' : 'masculina';

        // Monta o prompt para o OpenAI
        const prompt = `Você é um compositor profissional brasileiro especializado em ${estiloDescricao}.

Escreva uma letra de música emocionante e personalizada para ${destinatario}, que é ${relacaoDescricao} de quem está pedindo esta música.

${ocasiaoDescricao !== 'momento especial' ? `A ocasião é: ${ocasiaoDescricao}.` : ''}

${mensagem ? `Use estas informações/emoções como inspiração: "${mensagem}"` : 'Crie uma letra que expresse amor, carinho e admiração.'}

A voz será ${generoVocal}, então adapte o tom e as rimas adequadamente.

FORMATO DA RESPOSTA (JSON válido):
{
    "titulo": "Título da Música",
    "letra": "Verso 1\\n[letra do verso 1]\\n\\nRefrão\\n[letra do refrão]\\n\\nVerso 2\\n[letra do verso 2]\\n\\nRefrão\\n[letra do refrão]\\n\\nPonte\\n[letra da ponte]\\n\\nRefrão Final\\n[letra do refrão final]"
}

REGRAS IMPORTANTES:
1. A letra deve ter entre 150-250 palavras
2. Inclua pelo menos 2 versos, 1 refrão (repetido), e 1 ponte
3. Use linguagem poética mas acessível
4. Evite clichês excessivos
5. Seja original e emocionante
6. Retorne APENAS o JSON, sem texto adicional`;

        // Chama a API do OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um compositor profissional brasileiro. Sempre responda em português do Brasil. Retorne apenas JSON válido.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
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
        console.log('[gerarLetra] Sucesso:', {
            destinatario,
            estilo,
            tokens: completion.usage?.total_tokens
        });

        // Retorna sucesso
        return res.status(200).json({
            titulo: resultado.titulo,
            letra: resultado.letra,
            metadata: {
                estilo,
                ocasiao: ocasiaoDescricao,
                generoVocal,
                tokens: completion.usage?.total_tokens
            }
        });

    } catch (error) {
        console.error('[gerarLetra] Erro:', error);

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
            console.error('[gerarLetra] Erro de autenticação OpenAI');
            return res.status(500).json({
                error: 'Erro de configuração do servidor'
            });
        }

        // Erro genérico
        return res.status(500).json({
            error: 'Erro ao gerar letra. Tente novamente.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
