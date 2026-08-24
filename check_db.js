const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'OLP_WEB',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
});

async function check() {
  try {
    const res = await pool.query('SELECT id, serial, modelo, localidade, embalagem, pallet FROM units WHERE embalagem IS NOT NULL OR pallet IS NOT NULL ORDER BY id ASC');
    console.log('Total units with embalagem/pallet:', res.rows.length);
    
    // Group by pallet
    const pallets = {};
    const caixas = {};
    
    res.rows.forEach(r => {
      const pId = r.pallet ? r.pallet.palletId : 'SEM_PALLET';
      const cId = r.embalagem ? r.embalagem.caixaId : 'SEM_CAIXA';
      
      if (!pallets[pId]) pallets[pId] = {};
      if (!pallets[pId][cId]) pallets[pId][cId] = [];
      pallets[pId][cId].push(r.serial);
      
      if (!caixas[cId]) caixas[cId] = [];
      caixas[cId].push(r.serial);
    });
    
    console.log('=== PALLETS ===');
    for (const [pId, cMap] of Object.entries(pallets)) {
      const cKeys = Object.keys(cMap);
      let totalUnits = 0;
      cKeys.forEach(k => totalUnits += cMap[k].length);
      console.log('Pallet [' + pId + ']: ' + cKeys.length + ' caixas, ' + totalUnits + ' unidades');
      for (const [cId, snList] of Object.entries(cMap)) {
        console.log('   - Caixa [' + cId + ']: ' + snList.length + ' units');
      }
    }
    
    console.log('\n=== ALL CAIXAS ===');
    for (const [cId, snList] of Object.entries(caixas)) {
      console.log('Caixa [' + cId + ']: ' + snList.length + ' units');
    }
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    pool.end();
  }
}
check();
