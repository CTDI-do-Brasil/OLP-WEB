/* ==========================================================================
   WMS RECEBIMENTO DE UNIDADES - MAIN APPLICATION SCRIPT
   ========================================================================== */

// STATE MANAGEMENT WITH LOCALSTORAGE PERSISTENCE
const STORAGE_KEYS = {
  USERS: 'wms_users_v1',
  MODELS: 'wms_models_v1',
  LOCATIONS: 'wms_locations_v1',
  UNITS: 'wms_units_v1',
  CURRENT_USER: 'wms_curr_user_v1',
  THEME: 'wms_theme_v1'
};

// Application State
let appState = {
  currentUser: null,
  users: [],
  models: [],
  locations: [],
  units: [],
  currentRecebimentoSession: [],
  currentReportSubmenu: 'recebimento',
  charts: {}
};

// INITIALIZATION & MOCK SEED DATA
async function initApp() {
  await loadStateFromServer();
  checkSession();
  setupEventListeners();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

async function loadStateFromServer() {
  try {
    const [usersRes, modelsRes, locationsRes, unitsRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/models'),
      fetch('/api/locations'),
      fetch('/api/units')
    ]);

    if (!usersRes.ok || !modelsRes.ok || !locationsRes.ok || !unitsRes.ok) {
      throw new Error("HTTP error retrieving state");
    }

    appState.users = await usersRes.json();
    appState.models = await modelsRes.json();
    appState.locations = await locationsRes.json();
    appState.units = await unitsRes.json();
  } catch (e) {
    console.warn("Erro ao carregar dados do servidor, utilizando fallback local:", e);
    // Fallback locally
    try {
      const usersData = localStorage.getItem(STORAGE_KEYS.USERS);
      appState.users = (usersData && usersData !== 'undefined' && usersData !== 'null') ? JSON.parse(usersData) : getSeedUsers();
    } catch (err) {
      appState.users = getSeedUsers();
    }
    try {
      const modelsData = localStorage.getItem(STORAGE_KEYS.MODELS);
      appState.models = (modelsData && modelsData !== 'undefined' && modelsData !== 'null') ? JSON.parse(modelsData) : getSeedModels();
    } catch (err) {
      appState.models = getSeedModels();
    }
    try {
      const locationsData = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      appState.locations = (locationsData && locationsData !== 'undefined' && locationsData !== 'null') ? JSON.parse(locationsData) : getSeedLocations();
    } catch (err) {
      appState.locations = getSeedLocations();
    }
    try {
      const unitsData = localStorage.getItem(STORAGE_KEYS.UNITS);
      appState.units = (unitsData && unitsData !== 'undefined' && unitsData !== 'null') ? JSON.parse(unitsData) : getSeedUnits();
    } catch (err) {
      appState.units = getSeedUnits();
    }
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(appState.users));
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(appState.models));
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(appState.locations));
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(appState.units));
  } catch (e) {
    console.warn("Falha ao salvar no localStorage local:", e);
  }
}

// SEED DATA GENERATORS
function getSeedUsers() {
  return [
    { login: 'RODRIGO.BARRETO', nome: 'Rodrigo Barreto', role: 'ADMIN', senha: '123' },
    { login: 'JOAO.SILVA', nome: 'João Silva', role: 'OPERATOR', senha: '123' },
    { login: 'MARIA.SANTOS', nome: 'Maria Santos', role: 'OPERATOR', senha: '123' }
  ];
}

function getSeedModels() {
  return [
    {
      id: 'MOD_1',
      fabricante: 'HUAWEI',
      nome: 'HG8145V5',
      camposCount: 2,
      rules: [
        { fieldName: 'SERIAL', lengthType: 'EXACT', exactLength: 12, prefixes: '215008,2150' },
        { fieldName: 'MAC', lengthType: 'EXACT', exactLength: 12, prefixes: '' }
      ]
    },
    {
      id: 'MOD_2',
      fabricante: 'ZTE',
      nome: 'F670L',
      camposCount: 3,
      rules: [
        { fieldName: 'SERIAL', lengthType: 'EXACT', exactLength: 12, prefixes: 'ZTEG' },
        { fieldName: 'GPON', lengthType: 'EXACT', exactLength: 12, prefixes: '48575443' },
        { fieldName: 'MAC', lengthType: 'EXACT', exactLength: 12, prefixes: '' }
      ]
    },
    {
      id: 'MOD_3',
      fabricante: 'FIBERHOME',
      nome: 'HG6245N',
      camposCount: 1,
      rules: [
        { fieldName: 'SERIAL', lengthType: 'RANGE', minLength: 10, maxLength: 16, prefixes: 'FHTT' }
      ]
    }
  ];
}

function getSeedLocations() {
  return [
    { id: 'LOC_1', nome: 'DOCA 01', desc: 'Doca Principal de Entrada' },
    { id: 'LOC_2', nome: 'PRATELEIRA A1', desc: 'Estoque Intermediário' },
    { id: 'LOC_3', nome: 'BANCADA 02', desc: 'Bancada de Testes Cosméticos' }
  ];
}

function getSeedUnits() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: 'UNI_1001',
      fabricante: 'HUAWEI',
      modelo: 'HG8145V5',
      serial: '215008123456',
      gpon: '',
      mac: 'AA11BB22CC33',
      localidade: 'DOCA 01',
      operador: 'RODRIGO.BARRETO',
      dataRecebimento: `${today} 09:30:00`,
      status: 'EXPEDIDO',
      cosmetico: { resultado: 'APROVADO', defeitos: [], obs: 'Perfeito estado', data: `${today} 10:00:00`, operador: 'RODRIGO.BARRETO' },
      funcional: { resultado: 'APROVADO', testes: ['POWER', 'WIFI', 'LAN', 'PON'], obs: 'Sem falhas', data: `${today} 10:15:00`, operador: 'RODRIGO.BARRETO' },
      embalagem: { caixaId: 'CX-2026-001', data: `${today} 11:00:00`, operador: 'RODRIGO.BARRETO' },
      expedicao: { ordem: 'ORD-5541', destino: 'CD SÃO PAULO', data: `${today} 11:45:00`, operador: 'RODRIGO.BARRETO' }
    },
    {
      id: 'UNI_1002',
      fabricante: 'ZTE',
      modelo: 'F670L',
      serial: 'ZTEG98765432',
      gpon: '485754431122',
      mac: 'BB22CC33DD44',
      localidade: 'PRATELEIRA A1',
      operador: 'JOAO.SILVA',
      dataRecebimento: `${today} 10:15:00`,
      status: 'FUNCIONAL_OK',
      cosmetico: { resultado: 'APROVADO', defeitos: [], obs: '', data: `${today} 10:40:00`, operador: 'JOAO.SILVA' },
      funcional: { resultado: 'APROVADO', testes: ['POWER', 'WIFI'], obs: 'Aprovado em banca', data: `${today} 11:10:00`, operador: 'JOAO.SILVA' },
      embalagem: null,
      expedicao: null
    }
  ];
}

/* ==========================================================================
   AUTHENTICATION & ROLE RESTRICTIONS
   ========================================================================== */

function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if(loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
}

async function handleLoginSubmit(e) {
  if(e) e.preventDefault();
  
  const loginInput = document.getElementById('login-username').value.trim().toUpperCase();
  const passwordInput = document.getElementById('login-password').value;
  
  // Strict Regex Validation for NOME.SOBRENOME
  const loginRegex = /^[A-Z0-9\-_]+\.[A-Z0-9\-_]+$/;
  const errorDiv = document.getElementById('login-error-msg');

  if (!loginRegex.test(loginInput)) {
    errorDiv.innerText = 'Formato de usuário inválido! Use NOME.SOBRENOME (ex: RODRIGO.BARRETO).';
    errorDiv.classList.remove('hidden');
    return;
  }

  errorDiv.classList.add('hidden');
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginInput, password: passwordInput })
    });
    
    const data = await res.json();
    if (!res.ok) {
      errorDiv.innerText = data.error || 'Erro ao realizar login!';
      errorDiv.classList.remove('hidden');
      return;
    }

    loginUser(data);
  } catch (err) {
    console.error(err);
    errorDiv.innerText = 'Erro ao se conectar ao servidor!';
    errorDiv.classList.remove('hidden');
  }
}


function loginUser(user) {
  appState.currentUser = user;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  
  const loginModal = document.getElementById('login-modal');
  if (loginModal) loginModal.classList.remove('active');
  
  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.classList.remove('hidden');

  // Update UI Sidebar Badges
  const userNameEl = document.getElementById('sidebar-user-name');
  if (userNameEl) userNameEl.innerText = user.login;
  
  const userRoleEl = document.getElementById('sidebar-user-role');
  if (userRoleEl) userRoleEl.innerText = user.role === 'ADMIN' ? 'ADMINISTRADOR' : 'OPERADOR';
  
  const userAvatarEl = document.getElementById('sidebar-user-avatar');
  if (userAvatarEl) userAvatarEl.innerText = user.login.slice(0, 2);

  // Apply Role Restrictions
  if (user.role !== 'ADMIN') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    navigate('recebimento'); // Operators start at Recebimento screen
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    navigate('dashboard'); // Admins start at Dashboard screen
  }

  populateSelectDropdowns();
}

function logout() {
  appState.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  location.reload();
}

function checkSession() {
  const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (savedUser) {
    loginUser(JSON.parse(savedUser));
  }
}

/* ==========================================================================
   NAVIGATION SYSTEM
   ========================================================================== */

function navigate(viewId) {
  // Check permission for admin views
  if (['dashboard', 'cadastro-modelo', 'cadastro-usuario', 'cadastro-localidade'].includes(viewId)) {
    if (appState.currentUser.role !== 'ADMIN') {
      alert("Acesso restrito para administradores!");
      return;
    }
  }

  // Hide all views
  document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  // Handle Relatórios Submenu Routing
  if (viewId.startsWith('relatorio-')) {
    const subType = viewId.replace('relatorio-', '');
    appState.currentReportSubmenu = subType;
    document.getElementById('view-relatorios').classList.add('active');
    setupRelatorioView(subType);
    return;
  }

  // Activate selected view
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Highlight Nav Item
  const navLink = document.querySelector(`.nav-item[onclick*="'${viewId}'"]`);
  if (navLink) {
    navLink.classList.add('active');
  }

  // Update Page Title
  updatePageTitle(viewId);

  // Trigger View Refresh Actions
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'cadastro-modelo') renderModelosTable();
  if (viewId === 'cadastro-usuario') renderUsuariosTable();
  if (viewId === 'cadastro-localidade') renderLocalidadesTable();
  if (viewId === 'recebimento') resetRecebimentoForm();
  if (viewId === 'consulta') filterConsulta();
}

function updatePageTitle(viewId) {
  const titles = {
    'dashboard': { title: 'Dashboard de Indicadores', sub: 'Visão em tempo real das métricas operacionais' },
    'cadastro-modelo': { title: 'Cadastro de Modelos & Regras', sub: 'Gerenciamento de fabricantes, campos e travas de bipagem' },
    'cadastro-usuario': { title: 'Cadastro de Usuários', sub: 'Gestão de acessos (Administradores e Operadores)' },
    'cadastro-localidade': { title: 'Cadastro de Localidades', sub: 'Mapeamento de docas e áreas de armazenagem' },
    'recebimento': { title: 'Recebimento de Unidades', sub: 'Entrada de equipamentos com validação rígida de regras' },
    'apontamento-cosmetico': { title: 'Apontamento Cosmético', sub: 'Inspeção estética e estática de unidades' },
    'apontamento-funcional': { title: 'Apontamento Funcional', sub: 'Testes de conectividade e hardware' },
    'embalagem': { title: 'Módulo de Embalagem', sub: 'Agrupamento de unidades aprovadas em caixas' },
    'expedicao': { title: 'Módulo de Expedição', sub: 'Despacho e expedição de caixas e unidades' },
    'consulta': { title: 'Consulta de Unidades', sub: 'Rastreabilidade e linha do tempo de unidades' }
  };

  const info = titles[viewId] || { title: 'WMS Recebimento', sub: '' };
  document.getElementById('page-title').innerText = info.title;
  document.getElementById('page-subtitle').innerText = info.sub;
}

function toggleAccordion(id) {
  const content = document.getElementById(id);
  const header = content.previousElementSibling;
  content.classList.toggle('hidden');
  header.classList.toggle('expanded');
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  document.body.classList.toggle('dark-theme');
}

/* ==========================================================================
   ADMIN DASHBOARD VIEW
   ========================================================================== */

function renderDashboard() {
  const units = appState.units;

  const totalRecebidos = units.length;
  const totalCosmeticos = units.filter(u => u.cosmetico).length;
  const totalFuncionais = units.filter(u => u.funcional).length;
  const totalEmbalagens = units.filter(u => u.embalagem).length;
  const totalExpedicoes = units.filter(u => u.expedicao).length;

  document.getElementById('dash-recebidos-count').innerText = totalRecebidos;
  document.getElementById('dash-cosmeticos-count').innerText = totalCosmeticos;
  document.getElementById('dash-funcionais-count').innerText = totalFuncionais;
  document.getElementById('dash-embalagens-count').innerText = totalEmbalagens;
  document.getElementById('dash-expedicoes-count').innerText = totalExpedicoes;

  // Render Dashboard Table (Recent 5 Units)
  const tbody = document.getElementById('dash-recent-table-body');
  tbody.innerHTML = '';

  const recentUnits = [...units].reverse().slice(0, 5);
  recentUnits.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.dataRecebimento || '-'}</td>
      <td><strong>${u.fabricante}</strong></td>
      <td>${u.modelo}</td>
      <td><code>${u.serial}</code></td>
      <td><code>${u.gpon || u.mac || '-'}</code></td>
      <td>${u.localidade}</td>
      <td>${u.operador}</td>
      <td><span class="badge ${getStatusBadgeClass(u.status)}">${u.status}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Render Charts
  renderDashboardCharts();
}

function renderDashboardCharts() {
  const ctx1 = document.getElementById('chart-fabricantes');
  const ctx2 = document.getElementById('chart-status');

  if (typeof Chart === 'undefined') {
    console.warn("Chart.js não foi carregado. Os gráficos não serão exibidos.");
    
    // Exibe mensagem de erro amigável nos canvas se não houver Chart.js carregado
    if (ctx1 && ctx1.getContext) {
      const ctx = ctx1.getContext('2d');
      ctx.clearRect(0, 0, ctx1.width, ctx1.height);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('Gráfico indisponível (Chart.js offline)', ctx1.width / 2, ctx1.height / 2);
    }
    if (ctx2 && ctx2.getContext) {
      const ctx = ctx2.getContext('2d');
      ctx.clearRect(0, 0, ctx2.width, ctx2.height);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('Gráfico indisponível (Chart.js offline)', ctx2.width / 2, ctx2.height / 2);
    }
    return;
  }

  // Chart 1: Recebimentos por Fabricante
  const fabCounts = {};
  appState.units.forEach(u => {
    fabCounts[u.fabricante] = (fabCounts[u.fabricante] || 0) + 1;
  });

  if (appState.charts.fabricantes) appState.charts.fabricantes.destroy();

  appState.charts.fabricantes = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: Object.keys(fabCounts).length ? Object.keys(fabCounts) : ['SEM DADOS'],
      datasets: [{
        label: 'Unidades Recebidas',
        data: Object.values(fabCounts).length ? Object.values(fabCounts) : [0],
        backgroundColor: '#3b82f6',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });

  // Chart 2: Status dos Itens no Fluxo
  const statusCounts = { RECEBIDO: 0, INSPEÇÃO: 0, EMBALADO: 0, EXPEDIDO: 0 };
  appState.units.forEach(u => {
    if (u.status === 'EXPEDIDO') statusCounts.EXPEDIDO++;
    else if (u.status === 'EMBALADO') statusCounts.EMBALADO++;
    else if (u.status.includes('OK') || u.status.includes('NOK')) statusCounts.INSPEÇÃO++;
    else statusCounts.RECEBIDO++;
  });

  if (appState.charts.status) appState.charts.status.destroy();

  appState.charts.status = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
    }
  });
}

function getStatusBadgeClass(status) {
  if (!status) return 'badge-info';
  if (status === 'EXPEDIDO') return 'badge-purple';
  if (status === 'EMBALADO') return 'badge-success';
  if (status.includes('NOK')) return 'badge-danger';
  if (status.includes('OK')) return 'badge-warning';
  return 'badge-info';
}

/* ==========================================================================
   CADASTRO DE MODELOS & REGRAS (ADMIN)
   ========================================================================== */

function renderModelRuleFields() {
  const count = parseInt(document.getElementById('mod-campos-count').value);
  const container = document.getElementById('model-rules-container');
  container.innerHTML = '';

  const defaultNames = ['SERIAL', 'MAC', 'GPON', 'EAN'];

  for (let i = 0; i < count; i++) {
    const fieldName = defaultNames[i] || `CAMPO_${i+1}`;
    const ruleBox = document.createElement('div');
    ruleBox.className = 'bip-field-card margin-top';
    ruleBox.innerHTML = `
      <div class="form-group">
        <label>Nome do Campo Bipável ${i+1}</label>
        <input type="text" class="mod-rule-name" value="${fieldName}" required style="text-transform: uppercase;">
      </div>
      <div class="grid-2col">
        <div class="form-group">
          <label>Validação de Tamanho</label>
          <select class="mod-rule-lentype" onchange="toggleLengthInputs(this)">
            <option value="EXACT">Tamanho Exato</option>
            <option value="RANGE">Faixa (Mín / Máx)</option>
            <option value="ANY">Qualquer Tamanho</option>
          </select>
        </div>
        <div class="form-group mod-exact-group">
          <label>Qtde de Caracteres Exata</label>
          <input type="number" class="mod-rule-exact" value="12" min="1" max="50">
        </div>
        <div class="form-group mod-range-group hidden">
          <label>Mín / Máx (Ex: 10,20)</label>
          <input type="text" class="mod-rule-range" placeholder="10,20">
        </div>
      </div>
      <div class="form-group">
        <label>Prefixos Obrigatórios (Separados por vírgula, ex: <b>GPON,4857,ZTEG</b>)</label>
        <input type="text" class="mod-rule-prefixes" placeholder="Deixe em branco se não houver prefixo obrigatório" style="text-transform: uppercase;">
      </div>
    `;
    container.appendChild(ruleBox);
  }
}

function toggleLengthInputs(selectEl) {
  const card = selectEl.closest('.bip-field-card');
  const exactGroup = card.querySelector('.mod-exact-group');
  const rangeGroup = card.querySelector('.mod-range-group');

  if (selectEl.value === 'EXACT') {
    exactGroup.classList.remove('hidden');
    rangeGroup.classList.add('hidden');
  } else if (selectEl.value === 'RANGE') {
    exactGroup.classList.add('hidden');
    rangeGroup.classList.remove('hidden');
  } else {
    exactGroup.classList.add('hidden');
    rangeGroup.classList.add('hidden');
  }
}

async function saveModelo(e) {
  e.preventDefault();
  
  const selectVal = document.getElementById('mod-fabricante-select').value;
  let fabricante = '';
  
  if (selectVal === 'NEW_FABRICANTE') {
    fabricante = document.getElementById('mod-fabricante').value.trim().toUpperCase();
  } else {
    fabricante = selectVal.toUpperCase();
  }

  if (!fabricante) {
    alert("Por favor, selecione ou insira o Fabricante!");
    return;
  }

  const nome = document.getElementById('mod-nome').value.trim().toUpperCase();
  
  // Validação contra modelos duplicados (Fabricante + Nome do Modelo)
  const isDuplicate = appState.models.some(m => m.fabricante === fabricante && m.nome === nome);
  if (isDuplicate) {
    alert(`Erro: O modelo "${nome}" já está cadastrado para o fabricante "${fabricante}"!`);
    return;
  }

  const camposCount = parseInt(document.getElementById('mod-campos-count').value);

  const ruleCards = document.querySelectorAll('#model-rules-container .bip-field-card');
  const rules = [];

  ruleCards.forEach(card => {
    const fieldName = card.querySelector('.mod-rule-name').value.trim().toUpperCase();
    const lengthType = card.querySelector('.mod-rule-lentype').value;
    const exactLength = card.querySelector('.mod-rule-exact').value;
    const rangeVal = card.querySelector('.mod-rule-range').value;
    const prefixes = card.querySelector('.mod-rule-prefixes').value.trim().toUpperCase();

    let minL = 0, maxL = 99;
    if (lengthType === 'RANGE' && rangeVal.includes(',')) {
      const parts = rangeVal.split(',');
      minL = parseInt(parts[0]) || 0;
      maxL = parseInt(parts[1]) || 99;
    }

    rules.push({
      fieldName,
      lengthType,
      exactLength,
      minLength: minL,
      maxLength: maxL,
      prefixes
    });
  });

  const newModel = {
    id: `MOD_${Date.now()}`,
    fabricante,
    nome,
    camposCount,
    rules
  };

  try {
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModel)
    });
    if (!res.ok) throw new Error("Erro de resposta do servidor");

    appState.models.push(newModel);
    renderModelosTable();
    populateSelectDropdowns();

    document.getElementById('form-modelo').reset();
    toggleNewFabricanteInput(); // Oculta o campo de texto caso estivesse visível
    renderModelRuleFields();
    alert(`Modelo ${fabricante} - ${nome} cadastrado com sucesso!`);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar modelo no servidor!");
  }
}

function renderModelosTable() {
  const tbody = document.getElementById('table-modelos-body');
  tbody.innerHTML = '';

  appState.models.forEach(m => {
    const tr = document.createElement('tr');
    const rulesSummary = m.rules.map(r => {
      let lenStr = r.lengthType === 'EXACT' ? `${r.exactLength} chars` : 'Livre';
      let prefStr = r.prefixes ? ` (Pref: ${r.prefixes})` : '';
      return `<b>${r.fieldName}</b>: ${lenStr}${prefStr}`;
    }).join('<br>');

    tr.innerHTML = `
      <td><strong>${m.fabricante}</strong></td>
      <td>${m.nome}</td>
      <td><span class="badge badge-info">${m.camposCount} Bipável(is)</span></td>
      <td class="small">${rulesSummary}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteModelo('${m.id}')">
          <i class="fa-solid fa-trash"></i> Excluir
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteModelo(id) {
  if (confirm("Deseja realmente remover este modelo?")) {
    try {
      const res = await fetch(`/api/models/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro de resposta");

      appState.models = appState.models.filter(m => m.id !== id);
      renderModelosTable();
      populateSelectDropdowns();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover modelo do servidor!");
    }
  }
}

/* ==========================================================================
   CADASTRO DE USUÁRIOS E LOCALIDADES (ADMIN)
   ========================================================================== */

let editingUserLogin = null;

async function saveUsuario(e) {
  e.preventDefault();
  const login = document.getElementById('usr-login').value.trim().toUpperCase();
  const nome = document.getElementById('usr-nome').value.trim();
  const role = document.getElementById('usr-role').value;
  const senha = document.getElementById('usr-password').value.trim();

  if (!/^[A-Z0-9\-_]+\.[A-Z0-9\-_]+$/.test(login)) {
    alert("O login deve obrigatoriamente estar no formato NOME.SOBRENOME (ex: MARCOS.SOUZA)");
    return;
  }

  const payload = { login, nome, role, senha };

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Erro de resposta");

    if (editingUserLogin) {
      const userIndex = appState.users.findIndex(u => u.login === editingUserLogin);
      if (userIndex > -1) {
        appState.users[userIndex].nome = nome;
        appState.users[userIndex].role = role;
        appState.users[userIndex].senha = senha;

        if (appState.currentUser && appState.currentUser.login === editingUserLogin) {
          appState.currentUser.nome = nome;
          appState.currentUser.role = role;
          appState.currentUser.senha = senha;
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(appState.currentUser));
        }
        
        alert(`Usuário ${editingUserLogin} atualizado com sucesso!`);
        cancelUserEdit();
      }
    } else {
      if (appState.users.some(u => u.login === login)) {
        alert("Usuário com este login já cadastrado!");
        return;
      }
      appState.users.push(payload);
      document.getElementById('form-usuario').reset();
      alert(`Usuário ${login} cadastrado!`);
    }

    renderUsuariosTable();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar usuário no servidor!");
  }
}

function renderUsuariosTable() {
  const tbody = document.getElementById('table-usuarios-body');
  tbody.innerHTML = '';

  appState.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${u.login}</code></td>
      <td>${u.nome}</td>
      <td><span class="badge ${u.role === 'ADMIN' ? 'badge-purple' : 'badge-info'}">${u.role}</span></td>
      <td><code>${u.senha || '---'}</code></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="editUsuario('${u.login}')" style="margin-right: 5px;">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteUsuario('${u.login}')">
          <i class="fa-solid fa-trash"></i> Excluir
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editUsuario(login) {
  const user = appState.users.find(u => u.login === login);
  if (!user) return;

  editingUserLogin = login;

  document.getElementById('usr-login').value = user.login;
  document.getElementById('usr-login').disabled = true; // Não permite trocar o login único
  document.getElementById('usr-nome').value = user.nome;
  document.getElementById('usr-role').value = user.role;
  document.getElementById('usr-password').value = user.senha || '';

  // Atualiza botões e títulos
  document.getElementById('user-form-title').innerHTML = '<i class="fa-solid fa-user-pen"></i> Editar Usuário';
  document.getElementById('btn-save-user').innerHTML = '<i class="fa-solid fa-user-check"></i> Atualizar Usuário';
  document.getElementById('btn-cancel-user-edit').classList.remove('hidden');
}

function cancelUserEdit() {
  editingUserLogin = null;

  document.getElementById('form-usuario').reset();
  document.getElementById('usr-login').disabled = false;
  document.getElementById('usr-password').value = '123'; // valor padrão para novos

  document.getElementById('user-form-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> Novo Usuário';
  document.getElementById('btn-save-user').innerHTML = '<i class="fa-solid fa-user-check"></i> Salvar Usuário';
  document.getElementById('btn-cancel-user-edit').classList.add('hidden');
}

async function deleteUsuario(login) {
  if (login === appState.currentUser.login) {
    alert("Você não pode excluir seu próprio usuário logado!");
    return;
  }
  if (confirm(`Excluir usuário ${login}?`)) {
    try {
      const res = await fetch(`/api/users/${login}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro ao deletar");

      appState.users = appState.users.filter(u => u.login !== login);
      renderUsuariosTable();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover usuário do servidor!");
    }
  }
}

async function saveLocalidade(e) {
  e.preventDefault();
  const nome = document.getElementById('loc-nome').value.trim().toUpperCase();
  const desc = document.getElementById('loc-desc').value.trim();
  const id = `LOC_${Date.now()}`;
  const newLoc = { id, nome, desc };

  try {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoc)
    });
    if (!res.ok) throw new Error("Erro de resposta");

    appState.locations.push(newLoc);
    renderLocalidadesTable();
    populateSelectDropdowns();
    document.getElementById('form-localidade').reset();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar localidade no servidor!");
  }
}

function renderLocalidadesTable() {
  const tbody = document.getElementById('table-localidades-body');
  tbody.innerHTML = '';

  appState.locations.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${l.nome}</strong></td>
      <td>${l.desc || '-'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteLocalidade('${l.id}')">
          <i class="fa-solid fa-trash"></i> Excluir
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteLocalidade(id) {
  if (confirm("Excluir esta localidade?")) {
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro de resposta");

      appState.locations = appState.locations.filter(l => l.id !== id);
      renderLocalidadesTable();
      populateSelectDropdowns();
    } catch (err) {
      console.error(err);
      alert("Erro ao remover localidade do servidor!");
    }
  }
}

/* ==========================================================================
   DROPDOWN POPULATION HELPERS
   ========================================================================== */

function populateSelectDropdowns() {
  // Populate Manufacturers in Cadastro de Modelo
  const modFabSelect = document.getElementById('mod-fabricante-select');
  if (modFabSelect) {
    const fabs = [...new Set(appState.models.map(m => m.fabricante))];
    modFabSelect.innerHTML = `
      <option value="">-- Selecione o Fabricante --</option>
      <option value="NEW_FABRICANTE">+ Cadastrar Novo Fabricante...</option>
    `;
    fabs.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.innerText = f;
      modFabSelect.insertBefore(opt, modFabSelect.lastElementChild);
    });
  }

  // Populate Manufacturers in Recebimento
  const fabSelect = document.getElementById('rec-fabricante');
  if (fabSelect) {
    const fabs = [...new Set(appState.models.map(m => m.fabricante))];
    fabSelect.innerHTML = '<option value="">-- Selecione o Fabricante --</option>';
    fabs.forEach(f => {
      fabSelect.innerHTML += `<option value="${f}">${f}</option>`;
    });
  }

  // Populate Locations
  const locSelect = document.getElementById('rec-localidade');
  if (locSelect) {
    locSelect.innerHTML = '<option value="">-- Selecione a Localidade --</option>';
    appState.locations.forEach(l => {
      locSelect.innerHTML += `<option value="${l.nome}">${l.nome} (${l.desc})</option>`;
    });
  }

  // Populate Search Filters
  const searchFab = document.getElementById('search-fabricante');
  if (searchFab) {
    const fabs = [...new Set(appState.models.map(m => m.fabricante))];
    searchFab.innerHTML = '<option value="">TODOS</option>';
    fabs.forEach(f => searchFab.innerHTML += `<option value="${f}">${f}</option>`);
  }

  const searchOp = document.getElementById('search-operador');
  if (searchOp) {
    searchOp.innerHTML = '<option value="">TODOS</option>';
    appState.users.forEach(u => searchOp.innerHTML += `<option value="${u.login}">${u.login}</option>`);
  }

  // Populate Report Selects
  const relFab = document.getElementById('rel-fabricante');
  if (relFab) {
    const fabs = [...new Set(appState.models.map(m => m.fabricante))];
    relFab.innerHTML = '<option value="">TODOS OS FABRICANTES</option>';
    fabs.forEach(f => relFab.innerHTML += `<option value="${f}">${f}</option>`);
  }
}

function toggleNewFabricanteInput() {
  const select = document.getElementById('mod-fabricante-select');
  const input = document.getElementById('mod-fabricante');
  if (!select || !input) return;

  if (select.value === 'NEW_FABRICANTE') {
    input.style.display = 'block';
    input.required = true;
    input.focus();
  } else {
    input.style.display = 'none';
    input.required = false;
    input.value = '';
  }
}

/* ==========================================================================
   MENU RECEBIMENTO (OPERACIONAL) WITH RIGID DUPLICATE LOCK
   ========================================================================== */

function onRecebimentoFabricanteChange() {
  const fab = document.getElementById('rec-fabricante').value;
  const modSelect = document.getElementById('rec-modelo');
  
  modSelect.innerHTML = '<option value="">-- Selecione o Modelo --</option>';
  
  if (!fab) {
    modSelect.disabled = true;
    document.getElementById('recebimento-scanner-section').classList.add('hidden');
    return;
  }

  const filteredModels = appState.models.filter(m => m.fabricante === fab);
  filteredModels.forEach(m => {
    modSelect.innerHTML += `<option value="${m.id}">${m.nome}</option>`;
  });
  
  modSelect.disabled = false;
}

function onRecebimentoModeloChange() {
  const modelId = document.getElementById('rec-modelo').value;
  const scannerSection = document.getElementById('recebimento-scanner-section');

  if (!modelId) {
    scannerSection.classList.add('hidden');
    return;
  }

  const selectedModel = appState.models.find(m => m.id === modelId);
  if (!selectedModel) return;

  document.getElementById('rec-model-title').innerText = `Modelo Selecionado: ${selectedModel.fabricante} - ${selectedModel.nome}`;
  
  const rulesSummary = selectedModel.rules.map(r => r.fieldName).join(', ');
  document.getElementById('rec-model-rules-summary').innerText = `Campos exigidos para este modelo: ${rulesSummary}`;

  renderRecebimentoDynamicInputs(selectedModel);
  scannerSection.classList.remove('hidden');
}

function renderRecebimentoDynamicInputs(modelObj) {
  const container = document.getElementById('dynamic-bip-inputs');
  container.innerHTML = '';

  modelObj.rules.forEach((rule, index) => {
    const fieldCard = document.createElement('div');
    fieldCard.className = 'bip-field-card';
    fieldCard.id = `card-field-${index}`;

    fieldCard.innerHTML = `
      <div class="form-group mb-0">
        <label for="input-field-${index}">
          <i class="fa-solid fa-barcode"></i> ${rule.fieldName} *
        </label>
        <input type="text" id="input-field-${index}" 
               data-field-name="${rule.fieldName}" 
               data-rule-index="${index}"
               placeholder="Bipe ou digite o ${rule.fieldName}..." 
               required autocomplete="off"
               oninput="validateRecebimentoSingleInput(this)">
        <div class="rule-feedback" id="feedback-field-${index}">
          <span class="small text-muted">Aguardando bipagem...</span>
        </div>
      </div>
    `;
    container.appendChild(fieldCard);
  });

  // Focus first input automatically
  setTimeout(() => {
    const firstInput = document.getElementById('input-field-0');
    if (firstInput) firstInput.focus();
  }, 100);
}

function validateRecebimentoSingleInput(inputEl) {
  const val = inputEl.value;
  const ruleIdx = parseInt(inputEl.dataset.ruleIndex);
  const modelId = document.getElementById('rec-modelo').value;
  const selectedModel = appState.models.find(m => m.id === modelId);

  if (!selectedModel || !selectedModel.rules[ruleIdx]) return;

  const ruleObj = selectedModel.rules[ruleIdx];
  const card = document.getElementById(`card-field-${ruleIdx}`);
  const feedback = document.getElementById(`feedback-field-${ruleIdx}`);

  if (!val) {
    card.className = 'bip-field-card';
    feedback.className = 'rule-feedback';
    feedback.innerHTML = '<span class="small text-muted">Aguardando bipagem...</span>';
    return;
  }

  const result = validateFieldRule(val, ruleObj);

  if (result.isValid) {
    card.className = 'bip-field-card valid';
    feedback.className = 'rule-feedback valid';
    feedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> Regra atendida';
  } else {
    card.className = 'bip-field-card invalid';
    feedback.className = 'rule-feedback invalid';
    feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${result.errorMsg}`;
  }
}

async function processRecebimentoSubmit(e) {
  e.preventDefault();

  const modelId = document.getElementById('rec-modelo').value;
  const localidade = document.getElementById('rec-localidade').value;
  const selectedModel = appState.models.find(m => m.id === modelId);

  if (!localidade) {
    alert("Selecione a localidade de armazenagem!");
    return;
  }

  // Gather scanned values
  const scannedInputs = document.querySelectorAll('#dynamic-bip-inputs input');
  const valuesMap = {};
  const scannedArray = [];

  let hasRuleError = false;

  scannedInputs.forEach((inputEl, index) => {
    const fieldName = inputEl.dataset.fieldName;
    const val = inputEl.value.trim().toUpperCase();
    const ruleObj = selectedModel.rules[index];
    
    valuesMap[fieldName.toLowerCase()] = val;
    scannedArray.push(val);

    const ruleRes = validateFieldRule(val, ruleObj);
    if (!ruleRes.isValid) {
      hasRuleError = true;
    }
  });

  // 1. Rule validation check
  if (hasRuleError) {
    playErrorBeep();
    showAlertModal(
      "VIOLAÇÃO DE REGRA DE BIPAGEM",
      "Um ou mais campos não cumprem o formato/tamanho ou prefixo exigidos!",
      "Verifique a mensagem de erro vermelha sob o campo."
    );
    return;
  }

  // 2. Inter-field duplicate check (e.g. SERIAL == MAC)
  const interDup = checkInterFieldDuplicates(scannedArray);
  if (interDup.hasDuplicate) {
    playErrorBeep();
    showAlertModal(
      "BLOQUEIO DE VALORES DUPLICADOS",
      `Não é permitido informar o mesmo valor em campos diferentes!`,
      `Valor duplicado entre campos: <b>${interDup.duplicateVal}</b>`
    );
    return;
  }

  // 3. Database historical duplicate check (e.g. Serial or MAC already received)
  const dbItemToCheck = {
    serial: valuesMap.serial || scannedArray[0] || '',
    gpon: valuesMap.gpon || '',
    mac: valuesMap.mac || (scannedArray.length > 1 ? scannedArray[1] : '')
  };

  const dbDup = checkDatabaseDuplicates(dbItemToCheck, appState.units);
  if (dbDup.isDuplicate) {
    playErrorBeep();
    showAlertModal(
      "BLOQUEIO: UNIDADE JÁ RECEBIDA!",
      `A unidade com ${dbDup.conflictField} "${dbDup.conflictVal}" JÁ FOI RECEBIDA no sistema!`,
      `<b>Data do Recebimento Anterior:</b> ${dbDup.conflictRecord.dataRecebimento}<br>
       <b>Recebido por:</b> ${dbDup.conflictRecord.operador}<br>
       <b>Status Atual:</b> ${dbDup.conflictRecord.status}`
    );
    return;
  }

  // SUCCESSFUL SCAN & RECEIVING!
  playSuccessBeep();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const newUnit = {
    id: `UNI_${Date.now()}`,
    fabricante: selectedModel.fabricante,
    modelo: selectedModel.nome,
    serial: dbItemToCheck.serial,
    gpon: dbItemToCheck.gpon,
    mac: dbItemToCheck.mac,
    localidade: localidade,
    operador: appState.currentUser.login,
    dataRecebimento: dateStr,
    status: 'RECEBIDO',
    cosmetico: null,
    funcional: null,
    embalagem: null,
    expedicao: null
  };

  try {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUnit)
    });
    if (!res.ok) throw new Error("Erro de resposta");

    appState.units.push(newUnit);
    appState.currentRecebimentoSession.unshift(newUnit);

    renderRecebimentoSessaoTable();
    clearRecebimentoFields();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar recebimento no servidor!");
  }
}

function renderRecebimentoSessaoTable() {
  const tbody = document.getElementById('table-recebidos-sessao');
  tbody.innerHTML = '';

  appState.currentRecebimentoSession.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.dataRecebimento.split(' ')[1]}</td>
      <td><strong>${u.fabricante} ${u.modelo}</strong></td>
      <td><code>${u.serial}</code></td>
      <td><code>${u.gpon || u.mac || '-'}</code></td>
      <td>${u.localidade}</td>
      <td>${u.operador}</td>
      <td><span class="badge badge-info">${u.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function clearRecebimentoFields() {
  document.querySelectorAll('#dynamic-bip-inputs input').forEach((input, index) => {
    input.value = '';
    validateRecebimentoSingleInput(input);
  });
  const firstInput = document.getElementById('input-field-0');
  if (firstInput) firstInput.focus();
}

function resetRecebimentoForm() {
  document.getElementById('rec-fabricante').value = '';
  onRecebimentoFabricanteChange();
}

/* ==========================================================================
   ALERT & CONFIRMATION MODALS
   ========================================================================== */

function showAlertModal(title, message, details = '') {
  document.getElementById('alert-modal-title').innerText = title;
  document.getElementById('alert-modal-msg').innerHTML = message;
  
  const detDiv = document.getElementById('alert-modal-details');
  if (details) {
    detDiv.innerHTML = details;
    detDiv.classList.remove('hidden');
  } else {
    detDiv.classList.add('hidden');
  }

  document.getElementById('alert-modal').classList.remove('hidden');
}

function closeAlertModal() {
  document.getElementById('alert-modal').classList.add('hidden');
  clearRecebimentoFields();
}

/* ==========================================================================
   MENU APONTAMENTO (COSMÉTICO E FUNCIONAL)
   ========================================================================== */

function lookupUnitForCosmetico() {
  const serial = document.getElementById('cos-serial').value.trim().toUpperCase();
  const previewDiv = document.getElementById('cos-unit-preview');
  
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);
  
  if (unit) {
    document.getElementById('cos-prev-fab').innerText = unit.fabricante;
    document.getElementById('cos-prev-mod').innerText = unit.modelo;
    document.getElementById('cos-prev-loc').innerText = unit.localidade;
    document.getElementById('cos-prev-status').innerText = unit.status;
    previewDiv.classList.remove('hidden');
  } else {
    previewDiv.classList.add('hidden');
  }
}

async function saveApontamentoCosmetico(e) {
  e.preventDefault();
  const serial = document.getElementById('cos-serial').value.trim().toUpperCase();
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    alert("Unidade não encontrada no recebimento!");
    return;
  }

  const resVal = document.querySelector('input[name="cos-resultado"]:checked').value;
  const defeitosSelect = document.getElementById('cos-defeitos');
  const defeitos = Array.from(defeitosSelect.selectedOptions).map(o => o.value);
  const obs = document.getElementById('cos-obs').value;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const cosmeticoData = {
    resultado: resVal,
    defeitos,
    obs,
    data: dateStr,
    operador: appState.currentUser.login
  };
  const targetStatus = resVal === 'APROVADO' ? 'COSMETICO_OK' : 'COSMETICO_NOK';

  try {
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetStatus,
        cosmetico: cosmeticoData
      })
    });
    if (!res.ok) throw new Error("Erro de resposta");

    unit.cosmetico = cosmeticoData;
    unit.status = targetStatus;

    document.getElementById('form-cosmetico').reset();
    document.getElementById('cos-unit-preview').classList.add('hidden');
    alert(`Apontamento Cosmético registrado (${resVal})!`);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar apontamento cosmético no servidor!");
  }
}

function lookupUnitForFuncional() {
  const serial = document.getElementById('func-serial').value.trim().toUpperCase();
  const previewDiv = document.getElementById('func-unit-preview');
  
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);
  
  if (unit) {
    document.getElementById('func-prev-fab').innerText = unit.fabricante;
    document.getElementById('func-prev-mod').innerText = unit.modelo;
    document.getElementById('func-prev-cos').innerText = unit.cosmetico ? unit.cosmetico.resultado : 'PENDENTE';
    document.getElementById('func-prev-status').innerText = unit.status;
    previewDiv.classList.remove('hidden');
  } else {
    previewDiv.classList.add('hidden');
  }
}

async function saveApontamentoFuncional(e) {
  e.preventDefault();
  const serial = document.getElementById('func-serial').value.trim().toUpperCase();
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    alert("Unidade não encontrada no recebimento!");
    return;
  }

  const resVal = document.querySelector('input[name="func-resultado"]:checked').value;
  const testes = [];
  if (document.getElementById('chk-power').checked) testes.push('POWER');
  if (document.getElementById('chk-wifi').checked) testes.push('WIFI');
  if (document.getElementById('chk-lan').checked) testes.push('LAN');
  if (document.getElementById('chk-pon').checked) testes.push('PON');
  const obs = document.getElementById('func-obs').value;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const funcionalData = {
    resultado: resVal,
    testes,
    obs,
    data: dateStr,
    operador: appState.currentUser.login
  };
  const targetStatus = resVal === 'APROVADO' ? 'FUNCIONAL_OK' : 'FUNCIONAL_NOK';

  try {
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetStatus,
        funcional: funcionalData
      })
    });
    if (!res.ok) throw new Error("Erro de resposta");

    unit.funcional = funcionalData;
    unit.status = targetStatus;

    document.getElementById('form-funcional').reset();
    document.getElementById('func-unit-preview').classList.add('hidden');
    alert(`Apontamento Funcional registrado (${resVal})!`);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar apontamento funcional no servidor!");
  }
}

/* ==========================================================================
   MENU EMBALAGEM
   ========================================================================== */

async function processEmbalarUnidade(e) {
  e.preventDefault();
  const caixaId = document.getElementById('emb-caixa-id').value.trim().toUpperCase();
  const serial = document.getElementById('emb-serial').value.trim().toUpperCase();

  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    alert("Unidade não encontrada!");
    return;
  }

  if (unit.status.includes('NOK')) {
    alert("Unidade com apontamento REPROVADO não pode ser embalada!");
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const embalagemData = {
    caixaId,
    data: dateStr,
    operador: appState.currentUser.login
  };

  try {
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'EMBALADO',
        embalagem: embalagemData
      })
    });
    if (!res.ok) throw new Error("Erro de resposta");

    unit.embalagem = embalagemData;
    unit.status = 'EMBALADO';

    document.getElementById('emb-serial').value = '';

    // Update Box summary
    document.getElementById('current-box-code').innerText = caixaId;
    const boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
    document.getElementById('current-box-count').innerText = boxUnits.length;

    const unitsContainer = document.getElementById('current-box-units');
    unitsContainer.innerHTML = '';
    boxUnits.forEach(u => {
      unitsContainer.innerHTML += `
        <div class="box-unit-chip">
          <span>${u.serial}</span>
          <span class="badge badge-success">${u.modelo}</span>
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar embalagem no servidor!");
  }
}

/* ==========================================================================
   MENU EXPEDIÇÃO
   ========================================================================== */

async function processExpedicao(e) {
  e.preventDefault();
  const ordem = document.getElementById('exp-ordem').value.trim().toUpperCase();
  const destino = document.getElementById('exp-destino').value.trim();
  const barcode = document.getElementById('exp-barcode').value.trim().toUpperCase();

  const matchingUnits = appState.units.filter(u => 
    u.serial === barcode || u.gpon === barcode || u.mac === barcode || (u.embalagem && u.embalagem.caixaId === barcode)
  );

  if (matchingUnits.length === 0) {
    alert("Nenhuma caixa ou unidade encontrada com este código!");
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  try {
    await Promise.all(matchingUnits.map(u => {
      const expedicaoData = {
        ordem,
        destino,
        data: dateStr,
        operador: appState.currentUser.login
      };
      return fetch(`/api/units/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'EXPEDIDO',
          expedicao: expedicaoData
        })
      }).then(res => {
        if (!res.ok) throw new Error();
        u.expedicao = expedicaoData;
        u.status = 'EXPEDIDO';
      });
    }));

    document.getElementById('exp-barcode').value = '';
    alert(`Expedição confirmada para ${matchingUnits.length} unidade(s)!`);
  } catch (err) {
    console.error(err);
    alert("Erro ao registrar expedição no servidor!");
  }
}

/* ==========================================================================
   MENU CONSULTA & TIMELINE MODAL
   ========================================================================== */

function filterConsulta() {
  const term = (document.getElementById('search-term').value || '').trim().toUpperCase();
  const fab = document.getElementById('search-fabricante').value;
  const status = document.getElementById('search-status').value;
  const op = document.getElementById('search-operador').value;

  const filtered = appState.units.filter(u => {
    const matchTerm = !term || u.serial.includes(term) || (u.gpon && u.gpon.includes(term)) || (u.mac && u.mac.includes(term));
    const matchFab = !fab || u.fabricante === fab;
    const matchStatus = !status || u.status === status;
    const matchOp = !op || u.operador === op;
    return matchTerm && matchFab && matchStatus && matchOp;
  });

  const tbody = document.getElementById('table-consulta-body');
  tbody.innerHTML = '';

  filtered.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${u.serial}</code></td>
      <td><code>${u.gpon || u.mac || '-'}</code></td>
      <td><strong>${u.fabricante} ${u.modelo}</strong></td>
      <td>${u.dataRecebimento}</td>
      <td><span class="badge ${getStatusBadgeClass(u.status)}">${u.status}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openUnitTimelineModal('${u.id}')">
          <i class="fa-solid fa-eye"></i> Histórico
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openUnitTimelineModal(unitId) {
  const u = appState.units.find(item => item.id === unitId);
  if (!u) return;

  const modalBody = document.getElementById('unit-modal-body');
  modalBody.innerHTML = `
    <div class="grid-2col margin-bottom">
      <div><strong>Serial:</strong> <code>${u.serial}</code></div>
      <div><strong>Modelo:</strong> ${u.fabricante} - ${u.modelo}</div>
      <div><strong>GPON/MAC:</strong> <code>${u.gpon || u.mac || '-'}</code></div>
      <div><strong>Localidade:</strong> ${u.localidade}</div>
    </div>
    
    <div class="timeline">
      <!-- 1. RECEBIMENTO -->
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span><i class="fa-solid fa-dolly"></i> RECEBIMENTO</span>
            <small class="text-muted">${u.dataRecebimento}</small>
          </div>
          <p class="small">Recebido na localidade <b>${u.localidade}</b> por <b>${u.operador}</b>.</p>
        </div>
      </div>

      <!-- 2. COSMÉTICO -->
      ${u.cosmetico ? `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span><i class="fa-solid fa-sparkles"></i> COSMÉTICO: ${u.cosmetico.resultado}</span>
            <small class="text-muted">${u.cosmetico.data}</small>
          </div>
          <p class="small">Apontado por: <b>${u.cosmetico.operador}</b>. Defeitos: ${u.cosmetico.defeitos.join(', ') || 'Nenhum'}</p>
        </div>
      </div>` : ''}

      <!-- 3. FUNCIONAL -->
      ${u.funcional ? `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span><i class="fa-solid fa-plug-circle-check"></i> FUNCIONAL: ${u.funcional.resultado}</span>
            <small class="text-muted">${u.funcional.data}</small>
          </div>
          <p class="small">Testes: ${u.funcional.testes.join(', ')}. Operador: <b>${u.funcional.operador}</b>.</p>
        </div>
      </div>` : ''}

      <!-- 4. EMBALAGEM -->
      ${u.embalagem ? `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span><i class="fa-solid fa-box-open"></i> EMBALAGEM</span>
            <small class="text-muted">${u.embalagem.data}</small>
          </div>
          <p class="small">Embalado na caixa <b>${u.embalagem.caixaId}</b> por <b>${u.embalagem.operador}</b>.</p>
        </div>
      </div>` : ''}

      <!-- 5. EXPEDIÇÃO -->
      ${u.expedicao ? `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span><i class="fa-solid fa-truck-fast"></i> EXPEDIÇÃO</span>
            <small class="text-muted">${u.expedicao.data}</small>
          </div>
          <p class="small">Ordem <b>${u.expedicao.ordem}</b> enviada para <b>${u.expedicao.destino}</b> por <b>${u.expedicao.operador}</b>.</p>
        </div>
      </div>` : ''}
    </div>
  `;

  document.getElementById('unit-detail-modal').classList.remove('hidden');
}

function closeUnitDetailModal() {
  document.getElementById('unit-detail-modal').classList.add('hidden');
}

/* ==========================================================================
   MENU RELATÓRIOS E EXPORTAÇÃO EXCEL
   ========================================================================== */

function setupRelatorioView(subType) {
  const titleMap = {
    'recebimento': 'Relatório de Recebimento',
    'cosmetico': 'Relatório Cosmético',
    'funcional': 'Relatório Funcional',
    'embalagem': 'Relatório de Embalagem',
    'expedicao': 'Relatório de Expedição'
  };

  document.getElementById('relatorio-title').innerHTML = `<i class="fa-solid fa-file-excel"></i> ${titleMap[subType]}`;
  renderRelatorioTable();
}

function renderRelatorioTable() {
  const subType = appState.currentReportSubmenu;
  const dataInicio = document.getElementById('rel-data-inicio').value;
  const dataFim = document.getElementById('rel-data-fim').value;
  const fab = document.getElementById('rel-fabricante').value;
  const mod = document.getElementById('rel-modelo').value;

  const filteredUnits = appState.units.filter(u => {
    if (fab && u.fabricante !== fab) return false;
    if (mod && u.modelo !== mod) return false;

    let targetDate = u.dataRecebimento.slice(0, 10);
    if (subType === 'cosmetico' && u.cosmetico) targetDate = u.cosmetico.data.slice(0, 10);
    if (subType === 'funcional' && u.funcional) targetDate = u.funcional.data.slice(0, 10);
    if (subType === 'embalagem' && u.embalagem) targetDate = u.embalagem.data.slice(0, 10);
    if (subType === 'expedicao' && u.expedicao) targetDate = u.expedicao.data.slice(0, 10);

    if (dataInicio && targetDate < dataInicio) return false;
    if (dataFim && targetDate > dataFim) return false;

    if (subType === 'cosmetico') return u.cosmetico !== null;
    if (subType === 'funcional') return u.funcional !== null;
    if (subType === 'embalagem') return u.embalagem !== null;
    if (subType === 'expedicao') return u.expedicao !== null;

    return true;
  });

  const thead = document.getElementById('relatorio-thead');
  const tbody = document.getElementById('relatorio-tbody');
  tbody.innerHTML = '';

  if (subType === 'recebimento') {
    thead.innerHTML = `
      <tr>
        <th>Data/Hora</th>
        <th>Fabricante</th>
        <th>Modelo</th>
        <th>Serial</th>
        <th>GPON</th>
        <th>MAC</th>
        <th>Localidade</th>
        <th>Operador</th>
        <th>Status</th>
      </tr>
    `;
    filteredUnits.forEach(u => {
      tbody.innerHTML += `
        <tr>
          <td>${u.dataRecebimento}</td>
          <td>${u.fabricante}</td>
          <td>${u.modelo}</td>
          <td><code>${u.serial}</code></td>
          <td><code>${u.gpon || '-'}</code></td>
          <td><code>${u.mac || '-'}</code></td>
          <td>${u.localidade}</td>
          <td>${u.operador}</td>
          <td><span class="badge ${getStatusBadgeClass(u.status)}">${u.status}</span></td>
        </tr>
      `;
    });
  } else if (subType === 'cosmetico') {
    thead.innerHTML = `
      <tr>
        <th>Data/Hora</th>
        <th>Serial</th>
        <th>Fabricante</th>
        <th>Modelo</th>
        <th>Resultado</th>
        <th>Defeitos</th>
        <th>Observações</th>
        <th>Operador</th>
      </tr>
    `;
    filteredUnits.forEach(u => {
      tbody.innerHTML += `
        <tr>
          <td>${u.cosmetico.data}</td>
          <td><code>${u.serial}</code></td>
          <td>${u.fabricante}</td>
          <td>${u.modelo}</td>
          <td><span class="badge ${u.cosmetico.resultado === 'APROVADO' ? 'badge-success' : 'badge-danger'}">${u.cosmetico.resultado}</span></td>
          <td>${u.cosmetico.defeitos.join(', ') || '-'}</td>
          <td>${u.cosmetico.obs || '-'}</td>
          <td>${u.cosmetico.operador}</td>
        </tr>
      `;
    });
  } else if (subType === 'funcional') {
    thead.innerHTML = `
      <tr>
        <th>Data/Hora</th>
        <th>Serial</th>
        <th>Fabricante</th>
        <th>Modelo</th>
        <th>Resultado</th>
        <th>Testes Aprovados</th>
        <th>Observações</th>
        <th>Operador</th>
      </tr>
    `;
    filteredUnits.forEach(u => {
      tbody.innerHTML += `
        <tr>
          <td>${u.funcional.data}</td>
          <td><code>${u.serial}</code></td>
          <td>${u.fabricante}</td>
          <td>${u.modelo}</td>
          <td><span class="badge ${u.funcional.resultado === 'APROVADO' ? 'badge-success' : 'badge-danger'}">${u.funcional.resultado}</span></td>
          <td>${u.funcional.testes.join(', ')}</td>
          <td>${u.funcional.obs || '-'}</td>
          <td>${u.funcional.operador}</td>
        </tr>
      `;
    });
  } else if (subType === 'embalagem') {
    thead.innerHTML = `
      <tr>
        <th>Data/Hora</th>
        <th>Código da Caixa</th>
        <th>Serial</th>
        <th>Fabricante</th>
        <th>Modelo</th>
        <th>Operador</th>
      </tr>
    `;
    filteredUnits.forEach(u => {
      tbody.innerHTML += `
        <tr>
          <td>${u.embalagem.data}</td>
          <td><strong>${u.embalagem.caixaId}</strong></td>
          <td><code>${u.serial}</code></td>
          <td>${u.fabricante}</td>
          <td>${u.modelo}</td>
          <td>${u.embalagem.operador}</td>
        </tr>
      `;
    });
  } else if (subType === 'expedicao') {
    thead.innerHTML = `
      <tr>
        <th>Data/Hora</th>
        <th>Ordem Expedição</th>
        <th>Destino</th>
        <th>Serial</th>
        <th>Fabricante / Modelo</th>
        <th>Operador</th>
      </tr>
    `;
    filteredUnits.forEach(u => {
      tbody.innerHTML += `
        <tr>
          <td>${u.expedicao.data}</td>
          <td><strong>${u.expedicao.ordem}</strong></td>
          <td>${u.expedicao.destino}</td>
          <td><code>${u.serial}</code></td>
          <td>${u.fabricante} ${u.modelo}</td>
          <td>${u.expedicao.operador}</td>
        </tr>
      `;
    });
  }
}

function exportCurrentReportToExcel() {
  const subType = appState.currentReportSubmenu;
  const dataRows = [];

  const tbody = document.querySelectorAll('#relatorio-tbody tr');
  tbody.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length === 0) return;

    if (subType === 'recebimento') {
      dataRows.push({
        'Data Recebimento': tds[0].innerText,
        'Fabricante': tds[1].innerText,
        'Modelo': tds[2].innerText,
        'Serial': tds[3].innerText,
        'GPON': tds[4].innerText,
        'MAC': tds[5].innerText,
        'Localidade': tds[6].innerText,
        'Operador': tds[7].innerText,
        'Status': tds[8].innerText
      });
    } else if (subType === 'cosmetico') {
      dataRows.push({
        'Data Apontamento': tds[0].innerText,
        'Serial': tds[1].innerText,
        'Fabricante': tds[2].innerText,
        'Modelo': tds[3].innerText,
        'Resultado Cosmético': tds[4].innerText,
        'Defeitos': tds[5].innerText,
        'Observações': tds[6].innerText,
        'Operador': tds[7].innerText
      });
    } else if (subType === 'funcional') {
      dataRows.push({
        'Data Apontamento': tds[0].innerText,
        'Serial': tds[1].innerText,
        'Fabricante': tds[2].innerText,
        'Modelo': tds[3].innerText,
        'Resultado Funcional': tds[4].innerText,
        'Testes Executados': tds[5].innerText,
        'Observações': tds[6].innerText,
        'Operador': tds[7].innerText
      });
    } else if (subType === 'embalagem') {
      dataRows.push({
        'Data Embalagem': tds[0].innerText,
        'Código Caixa': tds[1].innerText,
        'Serial': tds[2].innerText,
        'Fabricante': tds[3].innerText,
        'Modelo': tds[4].innerText,
        'Operador': tds[5].innerText
      });
    } else if (subType === 'expedicao') {
      dataRows.push({
        'Data Expedição': tds[0].innerText,
        'Ordem Expedição': tds[1].innerText,
        'Destino': tds[2].innerText,
        'Serial': tds[3].innerText,
        'Fabricante/Modelo': tds[4].innerText,
        'Operador': tds[5].innerText
      });
    }
  });

  generateExcelFile(dataRows, `Relatorio_${subType.toUpperCase()}`, `Relatório ${subType}`);
}
