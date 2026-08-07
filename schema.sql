-- CREATE TABLES FOR WMS RECEIVING SYSTEM

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  login VARCHAR(100) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  senha VARCHAR(255) DEFAULT '123'
);

-- 2. Models Table
CREATE TABLE IF NOT EXISTS models (
  id VARCHAR(100) PRIMARY KEY,
  fabricante VARCHAR(100) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  campos_count INTEGER NOT NULL,
  rules JSONB NOT NULL
);

-- 3. Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(100) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  description VARCHAR(255)
);

-- 4. Units Table
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(100) PRIMARY KEY,
  fabricante VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  serial VARCHAR(100) NOT NULL,
  gpon VARCHAR(100),
  mac VARCHAR(100),
  localidade VARCHAR(100) NOT NULL,
  operador VARCHAR(100) NOT NULL,
  data_recebimento VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  cosmetico JSONB,
  funcional JSONB,
  embalagem JSONB,
  expedicao JSONB
);

-- INSERT SEED DATA IF NOT EXISTS

-- Seed Users
INSERT INTO users (login, nome, role, senha) VALUES
('RODRIGO.BARRETO', 'Rodrigo Barreto', 'ADMIN', '123'),
('JOAO.SILVA', 'João Silva', 'OPERATOR', '123'),
('MARIA.SANTOS', 'Maria Santos', 'OPERATOR', '123')
ON CONFLICT (login) DO NOTHING;

-- Seed Models
INSERT INTO models (id, fabricante, nome, campos_count, rules) VALUES
('MOD_1', 'HUAWEI', 'HG8145V5', 2, '[{"fieldName": "SERIAL", "lengthType": "EXACT", "exactLength": 12, "prefixes": "215008,2150"}, {"fieldName": "MAC", "lengthType": "EXACT", "exactLength": 12, "prefixes": ""}]'::jsonb),
('MOD_2', 'ZTE', 'F670L', 3, '[{"fieldName": "SERIAL", "lengthType": "EXACT", "exactLength": 12, "prefixes": "ZTEG"}, {"fieldName": "GPON", "lengthType": "EXACT", "exactLength": 12, "prefixes": "48575443"}, {"fieldName": "MAC", "lengthType": "EXACT", "exactLength": 12, "prefixes": ""}]'::jsonb),
('MOD_3', 'FIBERHOME', 'HG6245N', 1, '[{"fieldName": "SERIAL", "lengthType": "RANGE", "minLength": 10, "maxLength": 16, "prefixes": "FHTT"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed Locations
INSERT INTO locations (id, nome, description) VALUES
('LOC_1', 'DOCA 01', 'Doca Principal de Entrada'),
('LOC_2', 'PRATELEIRA A1', 'Estoque Intermediário'),
('LOC_3', 'BANCADA 02', 'Bancada de Testes Cosméticos')
ON CONFLICT (id) DO NOTHING;
