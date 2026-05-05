/**
 * API Route: Check Files (Debug)
 * 
 * Função temporária para diagnosticar quais arquivos a Vercel está vendo.
 * REMOVER APÓS DIAGNÓSTICO!
 * 
 * Endpoint: GET /api/check-files
 */

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    try {
        const rootDir = process.cwd();
        
        // Lista arquivos no diretório raiz
        const rootFiles = fs.readdirSync(rootDir);
        
        // Verifica se index.html existe
        const indexExists = fs.existsSync(path.join(rootDir, 'index.html'));
        
        // Lista arquivos na pasta api/
        let apiFiles = [];
        try {
            apiFiles = fs.readdirSync(path.join(rootDir, 'api'));
        } catch (e) {
            apiFiles = ['Erro ao ler pasta api/'];
        }

        return res.status(200).json({
            debug: true,
            cwd: rootDir,
            indexHtmlExists: indexExists,
            rootFiles: rootFiles,
            apiFiles: apiFiles,
            nodeVersion: process.version,
            platform: process.platform
        });

    } catch (error) {
        return res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
}
