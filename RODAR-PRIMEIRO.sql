-- =============================================
-- GUEST HOUSE PERUÍBE - SETUP COMPLETO
-- RODE ESTE SQL NO SUPABASE > SQL EDITOR
-- =============================================

-- 1. TIPOS ENUMERADOS
DROP TYPE IF EXISTS status_reserva CASCADE;
DROP TYPE IF EXISTS status_quarto CASCADE;
DROP TYPE IF EXISTS periodo_estadia CASCADE;

CREATE TYPE status_reserva AS ENUM ('pre_reserva', 'confirmada', 'aguardando_sinal', 'sinal_pago', 'checkin', 'finalizada', 'cancelada');
CREATE TYPE status_quarto AS ENUM ('disponivel', 'pre_reserva', 'ocupado');
CREATE TYPE periodo_estadia AS ENUM ('29-02', '30-03');

-- 2. TABELA DE CONFIGURAÇÕES
DROP TABLE IF EXISTS config CASCADE;
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descricao TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABELA DE QUARTOS
DROP TABLE IF EXISTS quartos CASCADE;
CREATE TABLE quartos (
    id SERIAL PRIMARY KEY,
    nome_praia VARCHAR(100) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    capacidade INTEGER NOT NULL DEFAULT 5,
    preco DECIMAL(10,2) NOT NULL,
    camas VARCHAR(200),
    descricao TEXT,
    tem_ar BOOLEAN DEFAULT FALSE,
    tem_tv BOOLEAN DEFAULT FALSE,
    foto_url TEXT,
    destaque VARCHAR(100),
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    status_29_02 status_quarto DEFAULT 'disponivel',
    status_30_03 status_quarto DEFAULT 'disponivel',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA DE RESERVAS
DROP TABLE IF EXISTS reservas CASCADE;
CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarto_id INTEGER REFERENCES quartos(id),
    nome_responsavel VARCHAR(200) NOT NULL,
    cpf_responsavel VARCHAR(20),
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(200),
    periodo periodo_estadia NOT NULL,
    qtd_hospedes INTEGER NOT NULL DEFAULT 1,
    valor_total DECIMAL(10,2),
    valor_sinal DECIMAL(10,2),
    status status_reserva DEFAULT 'pre_reserva',
    observacoes TEXT,
    data_checkin DATE,
    data_checkout DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABELA DE HÓSPEDES
DROP TABLE IF EXISTS hospedes CASCADE;
CREATE TABLE hospedes (
    id SERIAL PRIMARY KEY,
    reserva_id UUID REFERENCES reservas(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    documento VARCHAR(50),
    is_responsavel BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. INSERIR CONFIGURAÇÕES PADRÃO
INSERT INTO config (chave, valor, descricao) VALUES
('nome_locador', 'Davi', 'Nome do proprietário'),
('cpf_locador', '', 'CPF do proprietário'),
('telefone', '11998770637', 'WhatsApp principal'),
('email', '', 'E-mail de contato'),
('pix_tipo', 'telefone', 'Tipo da chave Pix'),
('pix_chave', '11998770637', 'Chave Pix'),
('pix_nome', 'Davi', 'Nome do titular do Pix'),
('endereco_completo', 'Peruíbe, SP', 'Endereço'),
('endereco_bairro', '', 'Bairro'),
('endereco_cep', '', 'CEP'),
('endereco_maps', '', 'Link do Google Maps embed'),
('distancia_praia', '5 min a pé', 'Distância até a praia'),
('distancia_mercado', '3 min a pé', 'Distância até mercado'),
('distancia_centro', '5 min de carro', 'Distância até centro'),
('distancia_mcdonalds', '5 min de carro', 'Distância até McDonalds'),
('checkin_horario', '14:00', 'Horário de check-in'),
('checkout_horario', '11:00', 'Horário de check-out'),
('instagram', '', 'Instagram'),
('senha_painel', 'hostel2025', 'Senha do painel admin'),
('foto_hero', '', 'URL da foto do hero');

-- 7. INSERIR OS 4 QUARTOS COM FOTOS
INSERT INTO quartos (nome_praia, tipo, capacidade, preco, camas, descricao, tem_ar, tem_tv, foto_url, destaque, ordem) VALUES
('Costão', 'Quarto Econômico', 4, 2500.00, '1 cama casal + 2 solteiro', 'Quarto aconchegante, ideal para famílias pequenas ou grupos de amigos', FALSE, FALSE, 'https://vzdgwosgcojhztbrkukh.supabase.co/storage/v1/object/public/hostel-fotos/quarto-costao.jpg', '💰 Menor preço', 1),
('Ruínas', 'Quarto Standard', 5, 3200.00, '1 cama casal + 3 solteiro', 'Quarto espaçoso com ótima ventilação natural', FALSE, TRUE, 'https://vzdgwosgcojhztbrkukh.supabase.co/storage/v1/object/public/hostel-fotos/quarto-ruinas.jpg', NULL, 2),
('Prainha', 'Quarto Conforto', 5, 3500.00, '1 cama casal + 1 beliche + 1 solteiro', 'Quarto amplo com ar-condicionado e TV', TRUE, TRUE, 'https://vzdgwosgcojhztbrkukh.supabase.co/storage/v1/object/public/hostel-fotos/quarto-prainha.jpg', '⭐ Mais procurado', 3),
('Guaraú', 'Quarto Premium', 6, 4500.00, '1 cama casal + 2 beliches', 'O maior quarto da casa, com ar-condicionado e TV. Suíte com banheiro privativo.', TRUE, TRUE, 'https://vzdgwosgcojhztbrkukh.supabase.co/storage/v1/object/public/hostel-fotos/quarto-guarau.jpg', '👑 Suíte Premium', 4);

-- 8. HABILITAR RLS (Row Level Security)
ALTER TABLE quartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospedes ENABLE ROW LEVEL SECURITY;

-- 9. POLÍTICAS DE ACESSO PÚBLICO

-- Quartos: leitura pública
DROP POLICY IF EXISTS "Quartos leitura publica" ON quartos;
CREATE POLICY "Quartos leitura publica" ON quartos FOR SELECT USING (true);

-- Quartos: atualização
DROP POLICY IF EXISTS "Quartos atualizacao" ON quartos;
CREATE POLICY "Quartos atualizacao" ON quartos FOR UPDATE USING (true);

-- Config: leitura pública
DROP POLICY IF EXISTS "Config leitura publica" ON config;
CREATE POLICY "Config leitura publica" ON config FOR SELECT USING (true);

-- Config: atualização
DROP POLICY IF EXISTS "Config atualizacao" ON config;
CREATE POLICY "Config atualizacao" ON config FOR UPDATE USING (true);

-- Reservas: todas as operações
DROP POLICY IF EXISTS "Reservas leitura" ON reservas;
CREATE POLICY "Reservas leitura" ON reservas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reservas insercao" ON reservas;
CREATE POLICY "Reservas insercao" ON reservas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Reservas atualizacao" ON reservas;
CREATE POLICY "Reservas atualizacao" ON reservas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Reservas delecao" ON reservas;
CREATE POLICY "Reservas delecao" ON reservas FOR DELETE USING (true);

-- Hóspedes: todas as operações
DROP POLICY IF EXISTS "Hospedes leitura" ON hospedes;
CREATE POLICY "Hospedes leitura" ON hospedes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hospedes insercao" ON hospedes;
CREATE POLICY "Hospedes insercao" ON hospedes FOR INSERT WITH CHECK (true);

-- 10. VIEW DE DISPONIBILIDADE (opcional)
DROP VIEW IF EXISTS quartos_disponibilidade;
CREATE VIEW quartos_disponibilidade AS
SELECT 
    q.*,
    CASE 
        WHEN q.status_29_02 = 'ocupado' OR q.status_30_03 = 'ocupado' THEN 'ocupado'
        WHEN q.status_29_02 = 'pre_reserva' OR q.status_30_03 = 'pre_reserva' THEN 'pre_reserva'
        ELSE 'disponivel'
    END as status_geral
FROM quartos q
WHERE q.ativo = true
ORDER BY q.ordem;

-- =============================================
-- PRONTO! Agora suba as fotos no Storage
-- =============================================
