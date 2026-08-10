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


