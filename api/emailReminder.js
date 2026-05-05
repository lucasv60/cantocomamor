/**
 * API Route: Email Reminder
 * 
 * Função serverless da Vercel para envio de email de lembrete
 * sobre a música personalizada.
 * 
 * Endpoint: POST /api/emailReminder
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const {
            destinatario,
            email,
            telefone,
            estilo,
            relacionamento,
            ocasiao,
            mensagem,
            letra,
            lyricFeedback,
            linkPagamento,
            vocalGender
        } = req.body;

        // Validação básica
        if (!email || !destinatario) {
            return res.status(400).json({
                error: 'Campos obrigatórios: email, destinatario'
            });
        }

        // Verifica configuração de email
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('[emailReminder] SMTP não configurado - email não enviado');
            return res.status(200).json({
                success: true,
                message: 'Email não enviado (SMTP não configurado)'
            });
        }

        // Configura transporter SMTP
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Mapeia estilos
        const estiloMap = {
            'sertanejo': 'Sertanejo',
            'gospel': 'Gospel',
            'rock': 'Rock',
            'mpb': 'MPB',
            'folk': 'Folk/Acústica',
            'pop': 'Pop'
        };

        const estiloNome = estiloMap[estilo] || estilo || 'Personalizado';

        // Monta o corpo do email
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .lyrics { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; white-space: pre-wrap; }
        .cta { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎵 Sua Música está Quase Pronta!</h1>
        </div>
        <div class="content">
            <p>Olá!</p>
            <p>Você estava criando uma música especial em estilo <strong>${estiloNome}</strong> para <strong>${destinatario}</strong>.</p>
            
            ${letra ? `
            <h3>📝 Sua letra atual:</h3>
            <div class="lyrics">${letra}</div>
            ` : ''}
            
            ${linkPagamento ? `
            <p>Complete sua compra para receber a versão final da sua música personalizada!</p>
            <a href="${linkPagamento}" class="cta">💳 Finalizar Pagamento</a>
            ` : ''}
            
            <p>Precisa de ajuda? Responda este email ou entre em contato pelo WhatsApp.</p>
            
            <p>Com carinho,<br>
            <strong>Equipe MonteSuaMúsica</strong></p>
        </div>
        <div class="footer">
            <p>Este email foi enviado porque você iniciou a criação de uma música personalizada.</p>
        </div>
    </div>
</body>
</html>
        `;

        // Configura o email
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: `🎵 Sua música para ${destinatario} está quase pronta!`,
            html: htmlBody
        };

        // Envia o email
        await transporter.sendMail(mailOptions);

        console.log('[emailReminder] Email enviado com sucesso:', {
            email,
            destinatario,
            estilo
        });

        return res.status(200).json({
            success: true,
            message: 'Email enviado com sucesso'
        });

    } catch (error) {
        console.error('[emailReminder] Erro:', error);

        return res.status(500).json({
            error: 'Erro ao enviar email',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
