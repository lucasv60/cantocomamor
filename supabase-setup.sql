-- ========================================
-- Canto com Amor - Setup Supabase
-- ========================================
-- Execute este SQL no SQL Editor do Supabase
-- https://app.supabase.com/project/_/sql

-- ========================================
-- TABELA: leads
-- Captura precoce de leads antes da geração da música
-- ========================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Dados de contato (capturados no Step 1)
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    
    -- Dados do casal
    destinatario VARCHAR(255) NOT NULL,
    relacionamento VARCHAR(50) NOT NULL,
    ocasiao VARCHAR(50) NOT NULL,
    estilo VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    vocal_gender CHAR(1) DEFAULT 'm',
    
    -- Letra gerada (preenchida após geração)
    letra_gerada TEXT,
    titulo_musica VARCHAR(255),
    feedback_letra TEXT,
    
    -- Controle
    revisoes_count INTEGER DEFAULT 0,
    usa_letra_propria BOOLEAN DEFAULT FALSE,
    
    -- Metadados de rastreamento
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    referrer_url TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    letra_gerada_at TIMESTAMPTZ,
    pagamento_iniciado_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_ocasiao ON leads(ocasiao);
CREATE INDEX IF NOT EXISTS idx_leads_estilo ON leads(estilo);

-- ========================================
-- TABELA: pedidos
-- Registro de pedidos após pagamento
-- ========================================
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Dados do cliente
    email VARCHAR(255) NOT NULL,
    nome_cliente VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14),
    
    -- Dados da música
    destinatario VARCHAR(255) NOT NULL,
    estilo VARCHAR(50) NOT NULL,
    ocasiao VARCHAR(50) NOT NULL,
    relacionamento VARCHAR(50) NOT NULL,
    mensagem TEXT NOT NULL,
    vocal_gender CHAR(1) DEFAULT 'm',
    letra_final TEXT NOT NULL,
    titulo_musica VARCHAR(255),
    
    -- Pagamento
    metodo_pagamento VARCHAR(20) NOT NULL, -- 'pix', 'credit_card', 'boleto'
    preco_base DECIMAL(10,2) NOT NULL,
    entrega_prioritaria BOOLEAN DEFAULT FALSE,
    taxa_prioritaria DECIMAL(10,2) DEFAULT 0,
    desconto_pix DECIMAL(10,2) DEFAULT 0,
    preco_total DECIMAL(10,2) NOT NULL,
    
    -- Appmax
    appmax_order_id VARCHAR(100),
    appmax_transaction_id VARCHAR(100),
    status_pagamento VARCHAR(30) DEFAULT 'pendente', -- 'pendente', 'aprovado', 'recusado', 'estornado', 'em_analise'
    
    -- Entrega
    status_entrega VARCHAR(30) DEFAULT 'pendente', -- 'pendente', 'em_producao', 'entregue'
    arquivo_musica_url TEXT,
    arquivo_ebook_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    pagamento_aprovado_at TIMESTAMPTZ,
    entrega_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_email ON pedidos(email);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_pagamento ON pedidos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_pedidos_appmax_order_id ON pedidos(appmax_order_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_lead_id ON pedidos(lead_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilita RLS nas tabelas
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Política para INSERT público na tabela leads
-- Permite que qualquer pessoa (anon) insira leads
CREATE POLICY "Permitir INSERT público em leads"
    ON leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Política para SELECT apenas por service_role
-- Apenas o backend pode ler os leads
CREATE POLICY "Permitir SELECT apenas por service_role em leads"
    ON leads
    FOR SELECT
    TO service_role
    USING (true);

-- Política para UPDATE apenas por service_role
CREATE POLICY "Permitir UPDATE apenas por service_role em leads"
    ON leads
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política para INSERT público na tabela pedidos
-- Permite que qualquer pessoa (anon) insira pedidos
CREATE POLICY "Permitir INSERT público em pedidos"
    ON pedidos
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Política para SELECT apenas por service_role
CREATE POLICY "Permitir SELECT apenas por service_role em pedidos"
    ON pedidos
    FOR SELECT
    TO service_role
    USING (true);

-- Política para UPDATE apenas por service_role
CREATE POLICY "Permitir UPDATE apenas por service_role em pedidos"
    ON pedidos
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ========================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMENTÁRIOS NAS TABELAS
-- ========================================
COMMENT ON TABLE leads IS 'Leads capturados antes da geração da música (Step 1)';
COMMENT ON TABLE pedidos IS 'Pedidos registrados após pagamento iniciado';

-- ========================================
-- MIGRAÇÃO: Adicionar nome_completo à tabela leads
-- ========================================
-- Execute este comando no SQL Editor do Supabase se a tabela já existir:
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nome_completo TEXT;

-- ========================================
-- VERIFICAÇÃO
-- ========================================
-- Execute para verificar se as tabelas foram criadas:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
