-- =====================================================
-- HOSTEL CASA PERUÍBE - SETUP COMPLETO DO SUPABASE
-- Execute este SQL no SQL Editor do Supabase
-- =====================================================

-- 1. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir configurações iniciais
INSERT INTO config (chave, valor) VALUES
    ('nome_hostel', 'Hostel Casa Peruíbe'),
    ('subtitulo', 'Réveillon 2025 com piscina e pertinho da praia'),
    ('nome_locador', ''),
    ('cpf_locador', ''),
    ('telefone', '11998770637'),
    ('email', ''),
    ('pix_tipo', 'telefone'),
    ('pix_chave', ''),
    ('pix_nome', ''),
    ('endereco_completo', ''),
    ('endereco_bairro', ''),
    ('endereco_cep', '11750-000'),
    ('endereco_maps', ''),
    ('percentual_sinal', '50'),
    ('senha_painel', 'hostel2025'),
    ('instagram', ''),
    ('checkin_horario', '14:00'),
    ('checkout_horario', '11:00'),
    ('foto_hero', ''),
    ('logo', ''),
    ('distancia_praia', '5 min a pé'),
    ('distancia_mercado', '3 min a pé'),
    ('distancia_centro', '5 min de carro'),
    ('distancia_mcdonalds', '5 min de carro'),
    ('ativo', 'true')
ON CONFLICT (chave) DO NOTHING;

-- 2. TABELA DE QUARTOS
CREATE TABLE IF NOT EXISTS quartos (
    id SERIAL PRIMARY KEY,
    nome_praia VARCHAR(100) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    capacidade INTEGER NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    tem_ar BOOLEAN DEFAULT FALSE,
    tem_tv BOOLEAN DEFAULT FALSE,
    tem_banheiro_privativo BOOLEAN DEFAULT FALSE,
    descricao TEXT,
    camas VARCHAR(255),
    tamanho_m2 INTEGER,
    foto_url TEXT,
    fotos_extras TEXT[], -- Array de URLs
    destaque VARCHAR(100), -- Tag tipo "Menor preço", "Mais completo"
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir quartos iniciais
INSERT INTO quartos (nome_praia, tipo, capacidade, preco, tem_ar, tem_tv, descricao, camas, destaque, ordem) VALUES
    ('Praia do Costão', 'Quarto Pequeno', 4, 2500.00, FALSE, FALSE, 'Quarto aconchegante, ideal para grupos pequenos ou famílias.', 'A definir', 'Menor preço', 1),
    ('Praia das Ruínas', 'Quarto Grande', 5, 3200.00, FALSE, FALSE, 'Quarto espaçoso com bastante ventilação natural.', 'A definir', NULL, 2),
    ('Prainha', 'Quarto Grande com TV', 5, 3500.00, FALSE, TRUE, 'Quarto amplo com TV para seu conforto.', 'A definir', 'Mais escolhido', 3),
    ('Guaraú', 'Suíte', 5, 4500.00, TRUE, TRUE, 'Nossa melhor acomodação! Suíte com ar-condicionado e TV.', 'A definir', 'Mais completo', 4);

-- 3. TABELA DE RESERVAS
CREATE TYPE status_reserva AS ENUM (
    'pre_reserva',
    'confirmada',
    'aguardando_sinal',
    'sinal_pago',
    'checkin',
    'finalizada',
    'cancelada'
);

CREATE TYPE periodo_reserva AS ENUM (
    '29-02',
    '30-03'
);

CREATE TABLE IF NOT EXISTS reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarto_id INTEGER REFERENCES quartos(id),
    status status_reserva DEFAULT 'pre_reserva',
    periodo periodo_reserva NOT NULL,
    
    -- Dados do responsável
    nome_responsavel VARCHAR(255) NOT NULL,
    cpf_responsavel VARCHAR(14) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    
    -- Dados da reserva
    qtd_hospedes INTEGER NOT NULL,
    observacoes TEXT,
    
    -- Valores
    valor_total DECIMAL(10,2),
    valor_sinal DECIMAL(10,2),
    sinal_pago BOOLEAN DEFAULT FALSE,
    data_sinal DATE,
    
    -- Contrato
    contrato_gerado BOOLEAN DEFAULT FALSE,
    contrato_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA DE HÓSPEDES (para o contrato)
CREATE TABLE IF NOT EXISTS hospedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID REFERENCES reservas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    rg VARCHAR(20),
    parentesco VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_quarto ON reservas(quarto_id);
CREATE INDEX IF NOT EXISTS idx_reservas_periodo ON reservas(periodo);
CREATE INDEX IF NOT EXISTS idx_hospedes_reserva ON hospedes(reserva_id);

-- 6. FUNÇÃO PARA ATUALIZAR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_quartos_updated ON quartos;
CREATE TRIGGER trigger_quartos_updated
    BEFORE UPDATE ON quartos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_reservas_updated ON reservas;
CREATE TRIGGER trigger_reservas_updated
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_config_updated ON config;
CREATE TRIGGER trigger_config_updated
    BEFORE UPDATE ON config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 7. POLÍTICAS RLS (Row Level Security)
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospedes ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura
CREATE POLICY "Leitura pública config" ON config FOR SELECT USING (true);
CREATE POLICY "Leitura pública quartos" ON quartos FOR SELECT USING (true);
CREATE POLICY "Leitura pública reservas" ON reservas FOR SELECT USING (true);

-- Políticas de escrita (usando anon key por simplicidade - em produção usar auth)
CREATE POLICY "Escrita config" ON config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Escrita quartos" ON quartos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Escrita reservas" ON reservas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Escrita hospedes" ON hospedes FOR ALL USING (true) WITH CHECK (true);

-- 8. VIEW PARA DISPONIBILIDADE DOS QUARTOS
CREATE OR REPLACE VIEW quartos_disponibilidade AS
SELECT 
    q.id,
    q.nome_praia,
    q.tipo,
    q.capacidade,
    q.preco,
    q.tem_ar,
    q.tem_tv,
    q.descricao,
    q.camas,
    q.foto_url,
    q.destaque,
    q.ordem,
    -- Disponibilidade período 29-02
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM reservas r 
            WHERE r.quarto_id = q.id 
            AND r.periodo = '29-02' 
            AND r.status IN ('confirmada', 'aguardando_sinal', 'sinal_pago', 'checkin')
        ) THEN 'ocupado'
        WHEN EXISTS (
            SELECT 1 FROM reservas r 
            WHERE r.quarto_id = q.id 
            AND r.periodo = '29-02' 
            AND r.status = 'pre_reserva'
        ) THEN 'pre_reserva'
        ELSE 'disponivel'
    END AS status_29_02,
    -- Disponibilidade período 30-03
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM reservas r 
            WHERE r.quarto_id = q.id 
            AND r.periodo = '30-03' 
            AND r.status IN ('confirmada', 'aguardando_sinal', 'sinal_pago', 'checkin')
        ) THEN 'ocupado'
        WHEN EXISTS (
            SELECT 1 FROM reservas r 
            WHERE r.quarto_id = q.id 
            AND r.periodo = '30-03' 
            AND r.status = 'pre_reserva'
        ) THEN 'pre_reserva'
        ELSE 'disponivel'
    END AS status_30_03
FROM quartos q
WHERE q.ativo = TRUE
ORDER BY q.ordem;

-- =====================================================
-- PRONTO! Agora você pode usar o sistema.
-- =====================================================
