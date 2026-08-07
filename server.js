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

  // Run schema.sql
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log("[Database] Tabelas inicializadas com sucesso a partir de schema.sql");
  } catch (err) {
    console.error("[Database] Erro ao carregar schema.sql:", err.message);
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
      'INSERT INTO models (id, fabricante, nome, campos_count, rules) VALUES ($1, $2, $3, $4, $5)',
      [id, fabricante, nome, camposCount, JSON.stringify(rules)]
    );
    res.status(201).json({ success: true, message: 'Modelo salvo!' });
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
      expedicao: row.expedicao
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
  const { status, cosmetico, funcional, embalagem, expedicao } = req.body;
  try {
    await pool.query(
      `UPDATE units SET 
        status = COALESCE($1, status),
        cosmetico = COALESCE($2, cosmetico),
        funcional = COALESCE($3, funcional),
        embalagem = COALESCE($4, embalagem),
        expedicao = COALESCE($5, expedicao)
       WHERE id = $6`,
      [status, cosmetico ? JSON.stringify(cosmetico) : null, funcional ? JSON.stringify(funcional) : null, embalagem ? JSON.stringify(embalagem) : null, expedicao ? JSON.stringify(expedicao) : null, id]
    );
    res.json({ success: true, message: 'Unidade atualizada!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
