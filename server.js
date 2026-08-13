require('dotenv').config();
const express = require('express');
const { Client, Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let pool;

// Auto Database setup & connection
async function initDbConnection() {
  const dbName = process.env.PGDATABASE || 'OLP_WEB';
  
  if (process.env.DATABASE_URL) {
    console.log("[Database] Utilizando string de conexão DATABASE_URL fornecida.");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  } else {
    // Try connecting to default postgres database to verify/create OLP_WEB
    const mainClient = new Client({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: 'postgres'
    });

    try {
      await mainClient.connect();
      const dbCheck = await mainClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
      if (dbCheck.rowCount === 0) {
        console.log(`[Database] Banco de dados "${dbName}" não encontrado. Criando...`);
        await mainClient.query(`CREATE DATABASE "${dbName}"`);
        console.log(`[Database] Banco de dados "${dbName}" criado com sucesso.`);
      }
    } catch (err) {
      console.error("[Database] Erro ao conectar ao Postgres padrão para verificar banco de dados:", err.message);
    } finally {
      try {
        await mainClient.end();
      } catch (e) {}
    }

    // Create Pool for our target Database
    pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: dbName
    });
  }

  try {
    // Run schema.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    await pool.query('ALTER TABLE units ADD COLUMN IF NOT EXISTS sucata JSONB');
    await pool.query('ALTER TABLE units ADD COLUMN IF NOT EXISTS reparo_eletronico JSONB');
    
    // Create sequence generators table for atomic sequences (concurrent safety)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sequence_generators (
        name VARCHAR(100) PRIMARY KEY,
        current_value INTEGER NOT NULL
      )
    `);
    
    // Insert default 'caixa_pallet' sequence if it doesn't exist
    await pool.query(`
      INSERT INTO sequence_generators (name, current_value)
      VALUES ('caixa_pallet', 0)
      ON CONFLICT (name) DO NOTHING
    `);

    console.log("[Database] Tabelas inicializadas com sucesso a partir de schema.sql e sequências configuradas");

    // Seed Users only if empty
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO users (login, nome, role, senha) VALUES
        ('RODRIGO.BARRETO', 'Rodrigo Barreto', 'ADMIN', '123'),
        ('JOAO.SILVA', 'João Silva', 'OPERATOR', '123'),
        ('MARIA.SANTOS', 'Maria Santos', 'OPERATOR', '123')
      `);
      console.log("[Database] Seed de usuários inserido.");
    }

    // Seed Models only if empty
    const modelsCount = await pool.query('SELECT COUNT(*) FROM models');
    if (parseInt(modelsCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO models (id, fabricante, nome, campos_count, rules) VALUES
        ('MOD_1', 'HUAWEI', 'HG8145V5', 2, '[{"fieldName": "SERIAL", "lengthType": "EXACT", "exactLength": 12, "prefixes": "215008,2150"}, {"fieldName": "MAC", "lengthType": "EXACT", "exactLength": 12, "prefixes": ""}]'::jsonb),
        ('MOD_2', 'ZTE', 'F670L', 3, '[{"fieldName": "SERIAL", "lengthType": "EXACT", "exactLength": 12, "prefixes": "ZTEG"}, {"fieldName": "GPON", "lengthType": "EXACT", "exactLength": 12, "prefixes": "48575443"}, {"fieldName": "MAC", "lengthType": "EXACT", "exactLength": 12, "prefixes": ""}]'::jsonb),
        ('MOD_3', 'FIBERHOME', 'HG6245N', 1, '[{"fieldName": "SERIAL", "lengthType": "RANGE", "minLength": 10, "maxLength": 16, "prefixes": "FHTT"}]'::jsonb)
      `);
      console.log("[Database] Seed de modelos inserido.");
    }

    // Seed Locations only if empty
    const locsCount = await pool.query('SELECT COUNT(*) FROM locations');
    if (parseInt(locsCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO locations (id, nome, description) VALUES
        ('LOC_1', 'DOCA 01', 'Doca Principal de Entrada'),
        ('LOC_2', 'PRATELEIRA A1', 'Estoque Intermediário'),
        ('LOC_3', 'BANCADA 02', 'Bancada de Testes Cosméticos')
      `);
      console.log("[Database] Seed de localidades inserido.");
    }

    // Seed Defect Codes only if empty
    const defectsCount = await pool.query('SELECT COUNT(*) FROM defect_codes');
    if (parseInt(defectsCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO defect_codes (categoria, codigo, descricao) VALUES
        ('cosmetico', 'CARCAÇA_ARRANHADA', 'Carcaça Arranhada / Riscada'),
        ('cosmetico', 'CARCAÇA_QUEBRADA', 'Carcaça Quebrada / Trincada'),
        ('cosmetico', 'ETIQUETA_DANIFICADA', 'Etiqueta do Produto Danificada/Ilegível'),
        ('cosmetico', 'SEM_PARAFUSOS', 'Sem Parafusos de Fixação'),
        ('cosmetico', 'SUJEIRA_GRAVE', 'Sujeira Grave / Manchas de Óleo'),
        ('cosmetico', 'CONECTOR_DANIFICADO', 'Conector RJ45 / PON Quebrado'),
        
        ('defeito_funcional', 'FONTE_QUEIMADA', 'Fonte Queimada / Não Liga'),
        ('defeito_funcional', 'WIFI_INSTAVEL', 'Sinal de Wi-Fi caindo ou fraco'),
        ('defeito_funcional', 'SEM_SINAL_PON', 'Não sincroniza sinal óptico'),
        ('defeito_funcional', 'PORTA_LAN_QUEIMADA', 'Portas LAN RJ45 inoperantes'),
        
        ('bom', 'PLACA_PRINCIPAL_HG8145V5', 'Placa Mãe Huawei HG8145V5'),
        ('bom', 'GABINETE_PLASTICO_HG8145V5', 'Carcaça plástica HG8145V5'),
        ('bom', 'CONECTOR_OPTICO_SHIELD', 'Protetor do Conector Óptico'),
        
        ('defeito_constatado', 'CURTO_LINHA_ENTRADA', 'Curto-circuito na entrada de alimentação'),
        ('defeito_constatado', 'LED_POWER_APAGADO', 'Led Power não acende com fonte ok'),
        ('defeito_constatado', 'PORTA_RJ45_INOPERANTE', 'Porta LAN sem sinal elétrico'),
        ('defeito_constatado', 'CPU_SOBREAQUECENDO', 'Processador principal esquentando muito'),
        
        ('local_danificado', 'PLACA_FONTE', 'Circuito de alimentação primária'),
        ('local_danificado', 'PORTA_LAN_1', 'Conector físico LAN 1'),
        ('local_danificado', 'CIRCUITO_PON', 'Circuito transceptor óptico GPON'),
        ('local_danificado', 'ANTENA_WIFI', 'Antena integrada Wi-Fi interna'),
        
        ('causa', 'SOBRETENSAO_REDE', 'Descarga elétrica / Sobretensão externa'),
        ('causa', 'DESGASTE_NATURAL', 'Desgaste natural de componentes (MTBF)'),
        ('causa', 'CURTO_CIRCUITO', 'Curto provocado por falha interna'),
        ('causa', 'QUEDA_FISICA', 'Dano físico causado por queda'),
        
        ('servico_executado', 'SUBSTITUICAO_VARISTOR', 'Substituição do varistor de proteção'),
        ('servico_executado', 'RESSOLDA_CI', 'Ressolda de Circuito Integrado BGA'),
        ('servico_executado', 'LIMPEZA_QUIMICA', 'Limpeza de oxidação com álcool isopropílico'),
        ('servico_executado', 'RECOMPOSICAO_TRILHA', 'Recomposição de trilha rompida com fio jumper'),
        
        ('referencia_designator', 'U12', 'Circuito Integrado U12'),
        ('referencia_designator', 'C45', 'Capacitor C45'),
        ('referencia_designator', 'R10', 'Resistor R10'),
        ('referencia_designator', 'D5', 'Diodo retificador D5'),
        
        ('nome_tecnico', 'RODRIGO BARRETO', 'Rodrigo Barreto - Lab 1'),
        ('nome_tecnico', 'JOÃO SILVA', 'João Silva - Reparo Placas'),
        ('nome_tecnico', 'MARIA SANTOS', 'Maria Santos - Solda BGA'),
        
        ('reparadora', 'CTDI BRASIL', 'CTDI Unidade Jundiaí'),
        ('reparadora', 'OLP REPAROS', 'OLP Laboratório Interno')
      `);
      console.log("[Database] Seed de códigos de defeito inserido.");
    }

  } catch (err) {
    console.error("[Database] Erro ao carregar schema.sql ou semear dados:", err.message);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// AUTHENTICATION
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios!' });
  }
  
  try {
    const result = await pool.query('SELECT login, nome, role, senha FROM users WHERE login = $1', [username.toUpperCase()]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Usuário não cadastrado!' });
    }
    const user = result.rows[0];
    if (user.senha !== password) {
      return res.status(401).json({ error: 'Senha incorreta!' });
    }
    res.json({
      login: user.login,
      nome: user.nome,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USERS ENDPOINTS
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT login, nome, role, senha FROM users ORDER BY login ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { login, nome, role, senha } = req.body;
  try {
    await pool.query(
      `INSERT INTO users (login, nome, role, senha) VALUES ($1, $2, $3, $4)
       ON CONFLICT (login) DO UPDATE SET nome = $2, role = $3, senha = $4`,
      [login, nome, role, senha]
    );
    res.status(201).json({ success: true, message: 'Usuário salvo com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:login', async (req, res) => {
  const { login } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE login = $1', [login]);
    res.json({ success: true, message: 'Usuário removido!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODELS ENDPOINTS
app.get('/api/models', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, fabricante, nome, campos_count, rules FROM models ORDER BY id ASC');
    res.json(result.rows.map(row => ({
      ...row,
      camposCount: row.campos_count // map to camelCase for frontend compatibility
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/models', async (req, res) => {
  const { id, fabricante, nome, camposCount, rules } = req.body;
  try {
    await pool.query(
      `INSERT INTO models (id, fabricante, nome, campos_count, rules) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET fabricante = $2, nome = $3, campos_count = $4, rules = $5`,
      [id, fabricante, nome, camposCount, JSON.stringify(rules)]
    );
    res.status(201).json({ success: true, message: 'Modelo salvo com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/models/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM models WHERE id = $1', [id]);
    res.json({ success: true, message: 'Modelo removido!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOCATIONS ENDPOINTS
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome, description as desc FROM locations ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/locations', async (req, res) => {
  const { id, nome, desc } = req.body;
  try {
    await pool.query(
      'INSERT INTO locations (id, nome, description) VALUES ($1, $2, $3)',
      [id, nome, desc]
    );
    res.status(201).json({ success: true, message: 'Localidade salva!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM locations WHERE id = $1', [id]);
    res.json({ success: true, message: 'Localidade removida!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UNITS ENDPOINTS
app.get('/api/units', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM units ORDER BY id ASC');
    res.json(result.rows.map(row => ({
      id: row.id,
      fabricante: row.fabricante,
      modelo: row.modelo,
      serial: row.serial,
      gpon: row.gpon || '',
      mac: row.mac || '',
      localidade: row.localidade,
      operador: row.operador,
      dataRecebimento: row.data_recebimento,
      status: row.status,
      cosmetico: row.cosmetico,
      funcional: row.funcional,
      embalagem: row.embalagem,
      expedicao: row.expedicao,
      sucata: row.sucata,
      reparo_eletronico: row.reparo_eletronico
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/units', async (req, res) => {
  const { id, fabricante, modelo, serial, gpon, mac, localidade, operador, dataRecebimento, status } = req.body;
  try {
    await pool.query(
      `INSERT INTO units (id, fabricante, modelo, serial, gpon, mac, localidade, operador, data_recebimento, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, fabricante, modelo, serial, gpon, mac, localidade, operador, dataRecebimento, status]
    );
    res.status(201).json({ success: true, message: 'Unidade recebida!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/units/:id', async (req, res) => {
  const { id } = req.params;
  const { status, cosmetico, funcional, embalagem, expedicao, sucata, reparo_eletronico } = req.body;
  try {
    await pool.query(
      `UPDATE units SET 
        status = COALESCE($1, status),
        cosmetico = COALESCE($2, cosmetico),
        funcional = COALESCE($3, funcional),
        embalagem = COALESCE($4, embalagem),
        expedicao = COALESCE($5, expedicao),
        sucata = COALESCE($6, sucata),
        reparo_eletronico = COALESCE($7, reparo_eletronico)
       WHERE id = $8`,
      [
        status, 
        cosmetico ? JSON.stringify(cosmetico) : null, 
        funcional ? JSON.stringify(funcional) : null, 
        embalagem ? JSON.stringify(embalagem) : null, 
        expedicao ? JSON.stringify(expedicao) : null, 
        sucata ? JSON.stringify(sucata) : null,
        reparo_eletronico ? JSON.stringify(reparo_eletronico) : null,
        id
      ]
    );
    res.json({ success: true, message: 'Unidade atualizada!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEFECT CODES ENDPOINTS
app.get('/api/defect-codes', async (req, res) => {
  const { categoria } = req.query;
  try {
    let result;
    if (categoria) {
      result = await pool.query('SELECT * FROM defect_codes WHERE categoria = $1 ORDER BY codigo ASC', [categoria]);
    } else {
      result = await pool.query('SELECT * FROM defect_codes ORDER BY categoria ASC, codigo ASC');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/defect-codes', async (req, res) => {
  const payload = req.body;
  try {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        await pool.query(
          `INSERT INTO defect_codes (categoria, codigo, descricao) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (categoria, codigo) DO UPDATE SET descricao = EXCLUDED.descricao`,
          [item.categoria, item.codigo, item.descricao || '']
        );
      }
      res.status(201).json({ success: true, message: `${payload.length} códigos salvos com sucesso!` });
    } else {
      const { categoria, codigo, descricao } = payload;
      await pool.query(
        `INSERT INTO defect_codes (categoria, codigo, descricao) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (categoria, codigo) DO UPDATE SET descricao = EXCLUDED.descricao`,
        [categoria, codigo, descricao || '']
      );
      res.status(201).json({ success: true, message: 'Código salvo com sucesso!' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/defect-codes/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo, descricao } = req.body;
  try {
    await pool.query(
      'UPDATE defect_codes SET codigo = $1, descricao = $2 WHERE id = $3',
      [codigo, descricao, id]
    );
    res.json({ success: true, message: 'Código atualizado!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/defect-codes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM defect_codes WHERE id = $1', [id]);
    res.json({ success: true, message: 'Código removido!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEQUENCE GENERATION ENDPOINTS
app.get('/api/sequence/caixa_pallet/current', async (req, res) => {
  try {
    const result = await pool.query("SELECT current_value FROM sequence_generators WHERE name = 'caixa_pallet'");
    const currentVal = result.rows[0] ? result.rows[0].current_value : 0;
    // Format C00000001
    const nextSeq = currentVal + 1;
    const formatted = 'C' + String(nextSeq).padStart(8, '0');
    res.json({ formatted, sequence: nextSeq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sequence/caixa_pallet/next', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "SELECT current_value FROM sequence_generators WHERE name = 'caixa_pallet' FOR UPDATE"
    );
    let nextVal = 1;
    if (result.rows[0]) {
      nextVal = result.rows[0].current_value + 1;
      await client.query(
        "UPDATE sequence_generators SET current_value = $1 WHERE name = 'caixa_pallet'",
        [nextVal]
      );
    } else {
      await client.query(
        "INSERT INTO sequence_generators (name, current_value) VALUES ('caixa_pallet', 1)"
      );
    }
    await client.query('COMMIT');
    const formatted = 'C' + String(nextVal).padStart(8, '0');
    res.json({ formatted, sequence: nextVal });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// STARTUP
initDbConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Servidor rodando com sucesso no endereço: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("[Server] Erro crítico ao iniciar banco de dados:", err.message);
});
