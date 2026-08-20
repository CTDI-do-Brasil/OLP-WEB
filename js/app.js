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
  defectCodes: [],
  printers: [],
  currentRecebimentoSession: [],
  currentReportSubmenu: 'recebimento',
  currentDefectCategory: 'cosmetico',
  charts: {}
};

// INITIALIZATION & MOCK SEED DATA
async function initApp() {
  await loadStateFromServer();
  checkSession();
  setupEventListeners();

  // Atualizar dashboard a cada 1 minuto
  setInterval(async () => {
    if (appState.currentUser) {
      await loadStateFromServer();
      const activeView = document.querySelector('.page-view.active');
      if (activeView && activeView.id === 'view-dashboard') {
        renderDashboard();
      }
    }
  }, 60000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

async function loadStateFromServer() {
  try {
    const [usersRes, modelsRes, locationsRes, unitsRes, defectsRes, printersRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/models'),
      fetch('/api/locations'),
      fetch('/api/units'),
      fetch('/api/defect-codes'),
      fetch('/api/printers')
    ]);

    if (!usersRes.ok || !modelsRes.ok || !locationsRes.ok || !unitsRes.ok || !defectsRes.ok) {
      throw new Error("HTTP error retrieving state");
    }

    appState.users = await usersRes.json();
    appState.models = await modelsRes.json();
    appState.locations = await locationsRes.json();
    appState.units = await unitsRes.json();
    appState.defectCodes = await defectsRes.json();
    appState.printers = printersRes.ok ? await printersRes.json() : [];
  } catch (e) {
    console.warn("Erro ao carregar dados do servidor, utilizando fallback local:", e);
    appState.defectCodes = [];
    appState.printers = [];
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
  if (['dashboard', 'cadastro-modelo', 'cadastro-usuario', 'cadastro-localidade'].includes(viewId) || viewId.startsWith('cadastro-defeito-')) {
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
  } else if (viewId.startsWith('cadastro-defeito-')) {
    // Handle Cadastro Defeito Submenu Routing
    const subType = viewId.replace('cadastro-defeito-', '');
    appState.currentDefectCategory = subType;
    document.getElementById('view-cadastro-defeito').classList.add('active');
    setupCadastroDefeitoView(subType);
  } else {
    // Activate selected view
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
    }
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
  if (viewId === 'cadastro-impressora') renderPrintersTable();
  if (viewId === 'recebimento') resetRecebimentoForm();
  if (viewId === 'consulta') filterConsulta();
  if (viewId === 'embalagem') initEmbalagemView();
  if (viewId === 'embalagem-pallet') initPalletView();
}

function updatePageTitle(viewId) {
  const titles = {
    'dashboard': { title: 'Dashboard de Indicadores', sub: 'Visão em tempo real das métricas operacionais' },
    'cadastro-modelo': { title: 'Cadastro de Modelos & Regras', sub: 'Gerenciamento de fabricantes, campos e travas de bipagem' },
    'cadastro-usuario': { title: 'Cadastro de Usuários', sub: 'Gestão de acessos (Administradores e Operadores)' },
    'cadastro-localidade': { title: 'Cadastro de Localidades', sub: 'Mapeamento de docas e áreas de armazenagem' },
    'cadastro-impressora': { title: 'Cadastro de Impressoras Zebra', sub: 'Gerenciamento de impressoras térmicas ZPL por IP e Posto de Trabalho' },
    'recebimento': { title: 'Recebimento de Unidades', sub: 'Entrada de equipamentos com validação rígida de regras' },
    'apontamento-cosmetico': { title: 'Apontamento Cosmético', sub: 'Inspeção estética e estática de unidades' },
    'apontamento-funcional': { title: 'Apontamento Funcional', sub: 'Testes de conectividade e hardware' },
    'embalagem': { title: 'Módulo de Embalagem', sub: 'Agrupamento de unidades aprovadas in caixas' },
    'embalagem-pallet': { title: 'Processo de Embalagem - Pallet', sub: 'Embalagem rígida por lote com validação de modelo, localidade e etapas' },
    'expedicao': { title: 'Módulo de Expedição', sub: 'Despacho e expedição de caixas e unidades' },
    'sucata': { title: 'Módulo de Sucata', sub: 'Registro e descarte de equipamentos avariados (sucateamento)' },
    'reparo-eletronico': { title: 'Reparo Eletrônico', sub: 'Apontamento de reparo em placas e componentes' },
    'consulta': { title: 'Consulta de Unidades', sub: 'Rastreabilidade e linha do tempo de unidades' }
  };

  let info = titles[viewId];
  if (!info && viewId.startsWith('relatorio-')) {
    const rType = viewId.replace('relatorio-', '');
    const rNames = {
      'recebimento': 'Relatório de Recebimento',
      'cosmetico': 'Relatório Cosmético',
      'funcional': 'Relatório Funcional',
      'embalagem': 'Relatório de Embalagem',
      'expedicao': 'Relatório de Expedição'
    };
    info = {
      title: rNames[rType] || 'Relatório Geral',
      sub: 'Visualização, filtros e download da planilha de dados'
    };
  } else if (!info && viewId.startsWith('cadastro-defeito-')) {
    const catClean = viewId.replace('cadastro-defeito-', '');
    const catName = catClean.replace('_', ' ').toUpperCase();
    info = {
      title: `Código de Defeito: ${catName}`,
      sub: `Gerenciamento de códigos e importações da categoria ${catClean.toLowerCase()}`
    };
  }

  if (!info) {
    info = { title: 'WMS Recebimento', sub: '' };
  }
  
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const units = appState.units.filter(u => u.dataRecebimento && u.dataRecebimento.startsWith(todayStr));

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
  renderDashboardCharts(units);
}

function renderDashboardCharts(units) {
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
  units.forEach(u => {
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
  units.forEach(u => {
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
  if (status === 'SUCATA') return 'badge-danger';
  if (status === 'REPARO_ELETRONICO') return 'badge-warning';
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
    ruleBox.id = `rule-card-${i}`;
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

let editingModelId = null;

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
  const targetId = editingModelId ? editingModelId : `MOD_${Date.now()}`;
  
  // Validação contra modelos duplicados (Fabricante + Nome do Modelo), ignorando o próprio em edição
  const isDuplicate = appState.models.some(m => m.id !== targetId && m.fabricante === fabricante && m.nome === nome);
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
    id: targetId,
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

    if (editingModelId) {
      const idx = appState.models.findIndex(m => m.id === editingModelId);
      if (idx > -1) {
        appState.models[idx] = newModel;
      }
      alert(`Modelo ${fabricante} - ${nome} atualizado com sucesso!`);
      cancelModelEdit();
    } else {
      appState.models.push(newModel);
      alert(`Modelo ${fabricante} - ${nome} cadastrado com sucesso!`);
      document.getElementById('form-modelo').reset();
      toggleNewFabricanteInput(); 
      renderModelRuleFields();
    }

    renderModelosTable();
    populateSelectDropdowns();
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
        <button class="btn btn-primary btn-sm" onclick="editModelo('${m.id}')" style="margin-right: 5px;">
          <i class="fa-solid fa-pen-to-square"></i> Editar
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteModelo('${m.id}')">
          <i class="fa-solid fa-trash"></i> Excluir
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editModelo(id) {
  const model = appState.models.find(m => m.id === id);
  if (!model) return;

  editingModelId = id;

  document.getElementById('model-form-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Modelo';
  document.getElementById('btn-save-model').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar Modelo';
  document.getElementById('btn-cancel-model-edit').classList.remove('hidden');

  const selectDropdown = document.getElementById('mod-fabricante-select');
  const textInput = document.getElementById('mod-fabricante');
  
  let selectHasOption = false;
  for (let i = 0; i < selectDropdown.options.length; i++) {
    if (selectDropdown.options[i].value === model.fabricante) {
      selectHasOption = true;
      break;
    }
  }

  if (selectHasOption) {
    selectDropdown.value = model.fabricante;
    textInput.style.display = 'none';
    textInput.required = false;
  } else {
    selectDropdown.value = 'NEW_FABRICANTE';
    textInput.value = model.fabricante;
    textInput.style.display = 'block';
    textInput.required = true;
  }

  document.getElementById('mod-nome').value = model.nome;
  document.getElementById('mod-campos-count').value = model.camposCount;

  renderModelRuleFields();

  model.rules.forEach((rule, idx) => {
    const card = document.getElementById(`rule-card-${idx}`);
    if (card) {
      card.querySelector('.mod-rule-name').value = rule.fieldName;
      card.querySelector('.mod-rule-lentype').value = rule.lengthType;
      
      const exactGroup = card.querySelector('.mod-exact-group');
      const rangeGroup = card.querySelector('.mod-range-group');
      
      if (rule.lengthType === 'EXACT') {
        card.querySelector('.mod-rule-exact').value = rule.exactLength;
        exactGroup.classList.remove('hidden');
        rangeGroup.classList.add('hidden');
      } else if (rule.lengthType === 'RANGE') {
        card.querySelector('.mod-rule-range').value = `${rule.minLength},${rule.maxLength}`;
        exactGroup.classList.add('hidden');
        rangeGroup.classList.remove('hidden');
      } else {
        exactGroup.classList.add('hidden');
        rangeGroup.classList.add('hidden');
      }
      card.querySelector('.mod-rule-prefixes').value = rule.prefixes;
    }
  });

  document.getElementById('view-cadastro-modelo').scrollIntoView({ behavior: 'smooth' });
}

function cancelModelEdit() {
  editingModelId = null;

  document.getElementById('model-form-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Cadastrar Novo Modelo';
  document.getElementById('btn-save-model').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Modelo';
  document.getElementById('btn-cancel-model-edit').classList.add('hidden');

  document.getElementById('form-modelo').reset();
  toggleNewFabricanteInput();
  renderModelRuleFields();
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
   CADASTRO DE IMPRESSORAS ZEBRA
   ========================================================================== */

async function savePrinter(e) {
  e.preventDefault();
  const id = document.getElementById('prt-id').value.trim();
  const nome = document.getElementById('prt-nome').value.trim();
  const posto = document.getElementById('prt-posto').value.trim();
  const ip = document.getElementById('prt-ip').value.trim();
  const porta = parseInt(document.getElementById('prt-porta').value.trim()) || 9100;
  const modelo = document.getElementById('prt-modelo').value.trim();
  const dpi = parseInt(document.getElementById('prt-dpi').value) || 300;
  const status = document.getElementById('prt-status').value;

  const printerObj = {
    id: id || `PRT_${Date.now()}`,
    nome,
    posto,
    ip,
    porta,
    modelo,
    dpi,
    status
  };

  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/printers/${id}` : '/api/printers';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(printerObj)
    });
    if (!res.ok) throw new Error("Erro ao salvar impressora");

    if (id) {
      const idx = appState.printers.findIndex(p => p.id === id);
      if (idx !== -1) appState.printers[idx] = printerObj;
    } else {
      appState.printers.push(printerObj);
    }

    renderPrintersTable();
    populatePrinterDropdowns();
    resetPrinterForm();
    showToast(`Impressora "${nome}" salva com sucesso!`);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar impressora no servidor: " + err.message);
  }
}

function renderPrintersTable() {
  const tbody = document.getElementById('table-printers-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (appState.printers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma impressora cadastrada ainda.</td></tr>';
    return;
  }

  appState.printers.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${p.nome}</strong>
        ${p.modelo ? `<br><small class="text-muted">${p.modelo}</small>` : ''}
      </td>
      <td><span class="badge badge-info">${p.posto}</span></td>
      <td><code>${p.ip}:${p.porta || 9100}</code></td>
      <td><span class="badge ${p.dpi === 203 ? 'badge-warning' : 'badge-primary'}">${p.dpi || 300} DPI</span></td>
      <td>
        <span class="badge ${p.status === 'ATIVA' ? 'badge-success' : 'badge-danger'}">
          ${p.status || 'ATIVA'}
        </span>
      </td>
      <td>
        <div class="flex-row gap-1">
          <button class="btn btn-outline btn-sm" onclick="editPrinter('${p.id}')" title="Editar">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deletePrinter('${p.id}')" title="Excluir">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editPrinter(id) {
  const p = appState.printers.find(x => x.id === id);
  if (!p) return;

  document.getElementById('prt-id').value = p.id;
  document.getElementById('prt-nome').value = p.nome;
  document.getElementById('prt-posto').value = p.posto;
  document.getElementById('prt-ip').value = p.ip;
  document.getElementById('prt-porta').value = p.porta || 9100;
  document.getElementById('prt-modelo').value = p.modelo || '';
  document.getElementById('prt-dpi').value = p.dpi || 300;
  document.getElementById('prt-status').value = p.status || 'ATIVA';

  document.getElementById('btn-save-printer').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar Impressora';
}

function resetPrinterForm() {
  const form = document.getElementById('form-cadastro-impressora');
  if (form) form.reset();
  document.getElementById('prt-id').value = '';
  document.getElementById('prt-porta').value = '9100';
  document.getElementById('prt-dpi').value = '300';
  document.getElementById('btn-save-printer').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Impressora';
}

async function deletePrinter(id) {
  if (confirm("Deseja realmente excluir esta impressora?")) {
    try {
      const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro de resposta");

      appState.printers = appState.printers.filter(p => p.id !== id);
      renderPrintersTable();
      populatePrinterDropdowns();
      showToast("Impressora removida com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao remover impressora do servidor!");
    }
  }
}

function populatePrinterDropdowns() {
  const embSelect = document.getElementById('emb-printer-select');
  const palletSelect = document.getElementById('pallet-printer-select');
  const reimpSelect = document.getElementById('reimp-printer-select');

  const savedEmbPrinter = localStorage.getItem('wms_selected_printer_emb') || '';
  const savedPalletPrinter = localStorage.getItem('wms_selected_printer_pallet') || '';

  [
    { el: embSelect, saved: savedEmbPrinter },
    { el: palletSelect, saved: savedPalletPrinter },
    { el: reimpSelect, saved: savedEmbPrinter }
  ].forEach(({ el, saved }) => {
    if (!el) return;
    el.innerHTML = '<option value="">-- Selecione a Impressora Zebra --</option>';
    appState.printers.filter(p => p.status === 'ATIVA').forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.innerText = `${p.nome} - [${p.posto}] (${p.ip}:${p.porta || 9100}) - ${p.dpi || 300} DPI`;
      if (p.id === saved) opt.selected = true;
      el.appendChild(opt);
    });
  });
}

async function reimprimirEtiquetaCaixa(e) {
  if (e) e.preventDefault();
  const query = document.getElementById('reimp-caixa-id').value.trim().toUpperCase();
  const resultInfo = document.getElementById('reimp-result-info');

  if (!query) {
    alert("Informe o código da caixa ou o serial/MAC de uma unidade!");
    return;
  }

  // 1. Procurar unidades por caixaId direto ou encontrar a unidade bipada para descobrir a caixaId
  let targetCaixaId = query;
  let boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === targetCaixaId);

  if (boxUnits.length === 0) {
    const singleUnit = appState.units.find(u => (u.serial === query || u.gpon === query || u.mac === query) && u.embalagem);
    if (singleUnit) {
      targetCaixaId = singleUnit.embalagem.caixaId;
      boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === targetCaixaId);
    }
  }

  if (boxUnits.length === 0) {
    playErrorBeep();
    alert(`Nenhuma caixa ou unidade embalada encontrada para a busca: "${query}".`);
    if (resultInfo) {
      resultInfo.classList.remove('hidden');
      resultInfo.innerHTML = `<div class="alert alert-danger">Nenhum registro encontrado para "${query}".</div>`;
    }
    return;
  }

  const modelo = boxUnits[0].modelo || 'PRODUTO';

  // Obter a impressora selecionada no form ou a padrão
  const reimpSelectVal = document.getElementById('reimp-printer-select') ? document.getElementById('reimp-printer-select').value : null;
  if (reimpSelectVal) {
    localStorage.setItem('wms_selected_printer_emb', reimpSelectVal);
  }

  if (resultInfo) {
    resultInfo.classList.remove('hidden');
    resultInfo.innerHTML = `
      <div class="alert alert-info">
        <strong>Caixa Encontrada:</strong> ${targetCaixaId} | <b>Modelo:</b> ${modelo} | <b>Unidades:</b> ${boxUnits.length}
      </div>
    `;
  }

  // Abre o modal com a etiqueta ZPL e opção de disparar impressão
  showZplModal(targetCaixaId, modelo, boxUnits);
  playSuccessBeep();
  showToast(`Caixa ${targetCaixaId} carregada para reimpressão!`);
}

function saveSelectedPrinterPreference(viewType) {
  if (viewType === 'embalagem') {
    const val = document.getElementById('emb-printer-select').value;
    localStorage.setItem('wms_selected_printer_emb', val);
  } else if (viewType === 'pallet') {
    const val = document.getElementById('pallet-printer-select').value;
    localStorage.setItem('wms_selected_printer_pallet', val);
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

  // Populate Defect Codes Selects
  if (appState.defectCodes) {
    // 1. Cosméticos: <select id="cos-defeitos" multiple>
    const cosDefSelect = document.getElementById('cos-defeitos');
    if (cosDefSelect) {
      cosDefSelect.innerHTML = '';
      appState.defectCodes
        .filter(d => d.categoria === 'cosmetico')
        .forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.codigo;
          opt.innerText = d.descricao ? `${d.codigo} - ${d.descricao}` : d.codigo;
          cosDefSelect.appendChild(opt);
        });
    }

    // 2. Electronic Repair Selects
    const mapCategoryToSelectId = {
      'defeito_constatado': 'rep-defeito',
      'local_danificado': 'rep-local',
      'causa': 'rep-causa',
      'servico_executado': 'rep-servico',
      'referencia_designator': 'rep-designator',
      'nome_tecnico': 'rep-tecnico',
      'reparadora': 'rep-reparadora'
    };

    Object.entries(mapCategoryToSelectId).forEach(([category, selectId]) => {
      const selectEl = document.getElementById(selectId);
      if (selectEl) {
        selectEl.innerHTML = '<option value="">Selecione...</option>';
        appState.defectCodes
          .filter(d => d.categoria === category)
          .forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.codigo;
            opt.innerText = d.descricao ? `${d.codigo} - ${d.descricao}` : d.codigo;
            selectEl.appendChild(opt);
          });
      }
    });
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
               oninput="validateRecebimentoSingleInput(this)"
               onkeydown="handleRecebimentoInputKeyDown(event, this)">
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

let autoRecebimentoTimeout = null;
let isRecebimentoSubmitting = false;

function handleRecebimentoInputKeyDown(event, inputEl) {
  if (event.key === 'Enter') {
    event.preventDefault(); // Impede o envio padrão do formulário do HTML

    if (autoRecebimentoTimeout) {
      clearTimeout(autoRecebimentoTimeout);
      autoRecebimentoTimeout = null;
    }

    const ruleIdx = parseInt(inputEl.dataset.ruleIndex);
    const modelId = document.getElementById('rec-modelo').value;
    const selectedModel = appState.models.find(m => m.id === modelId);
    if (!selectedModel) return;

    // Valida o campo atual
    const ruleObj = selectedModel.rules[ruleIdx];
    const val = inputEl.value.trim().toUpperCase();
    const result = validateFieldRule(val, ruleObj);

    if (!result.isValid) {
      playErrorBeep();
      return; // Trava se houver erro
    }

    const totalFields = selectedModel.rules.length;
    if (ruleIdx < totalFields - 1) {
      // Avança o foco para o próximo campo bipável
      const nextInput = document.getElementById(`input-field-${ruleIdx + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    } else {
      // Se for o último campo, confirma o recebimento de forma direta
      processRecebimentoSubmit(event);
    }
  }
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

    // Se todos os campos estiverem preenchidos e válidos, agenda o recebimento automático
    const inputs = document.querySelectorAll('#dynamic-bip-inputs input');
    let allFilled = true;
    let allValid = true;

    inputs.forEach((inp, idx) => {
      const v = inp.value.trim().toUpperCase();
      if (!v) {
        allFilled = false;
        allValid = false;
        return;
      }
      const rObj = selectedModel.rules[idx];
      const res = validateFieldRule(v, rObj);
      if (!res.isValid) {
        allValid = false;
      }
    });

    if (allFilled && allValid) {
      if (autoRecebimentoTimeout) {
        clearTimeout(autoRecebimentoTimeout);
      }
      // Pequeno atraso de 150ms para feedback visual (ver o campo acender verde antes de enviar)
      autoRecebimentoTimeout = setTimeout(() => {
        const freshInputs = document.querySelectorAll('#dynamic-bip-inputs input');
        let stillGood = true;
        freshInputs.forEach((freshInp, freshIdx) => {
          const freshV = freshInp.value.trim().toUpperCase();
          const rObj = selectedModel.rules[freshIdx];
          if (!freshV || !validateFieldRule(freshV, rObj).isValid) {
            stillGood = false;
          }
        });
        if (stillGood && !isRecebimentoSubmitting) {
          processRecebimentoSubmit();
        }
      }, 150);
    }

  } else {
    card.className = 'bip-field-card invalid';
    feedback.className = 'rule-feedback invalid';
    feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${result.errorMsg}`;
  }
}

async function processRecebimentoSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  if (autoRecebimentoTimeout) {
    clearTimeout(autoRecebimentoTimeout);
    autoRecebimentoTimeout = null;
  }

  if (isRecebimentoSubmitting) {
    console.warn("Recebimento já em processamento, bloqueando chamada duplicada.");
    return;
  }

  isRecebimentoSubmitting = true;

  try {
    const modelId = document.getElementById('rec-modelo').value;
    const localidade = document.getElementById('rec-localidade').value;
    const selectedModel = appState.models.find(m => m.id === modelId);

    if (!selectedModel) {
      alert("Selecione um modelo válido!");
      return;
    }

    if (!localidade) {
      alert("Selecione a localidade de armazenagem!");
      return;
    }

    // Coleta os valores bipados de forma robusta
    const scannedInputs = document.querySelectorAll('#dynamic-bip-inputs input');
    const scannedArray = [];
    let hasRuleError = false;

    let serialVal = '';
    let gponVal = '';
    let macVal = '';

    scannedInputs.forEach((inputEl, index) => {
      const fieldName = inputEl.dataset.fieldName.toUpperCase();
      const val = inputEl.value.trim().toUpperCase();
      scannedArray.push(val);

      const ruleObj = selectedModel.rules[index];
      const ruleRes = validateFieldRule(val, ruleObj);
      if (!ruleRes.isValid) {
        hasRuleError = true;
      }

      if (fieldName.includes('SERIAL') || fieldName.includes('SERIE') || fieldName.includes('SÉRIE')) {
        serialVal = val;
      } else if (fieldName.includes('GPON') || fieldName.includes('PON')) {
        gponVal = val;
      } else if (fieldName.includes('MAC')) {
        macVal = val;
      }
    });

    // Fallbacks de posição se não encontrar explicitamente pelo nome
    if (!serialVal && scannedArray.length > 0) serialVal = scannedArray[0];
    if (!macVal && scannedArray.length > 1) {
      if (scannedArray.length === 2) macVal = scannedArray[1];
      else if (scannedArray.length === 3) {
        gponVal = scannedArray[1];
        macVal = scannedArray[2];
      }
    }

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

    const dbItemToCheck = {
      serial: serialVal,
      gpon: gponVal,
      mac: macVal
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

    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUnit)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 409) {
        playErrorBeep();
        showAlertModal(
          "BLOQUEIO: UNIDADE JÁ RECEBIDA!",
          errData.error || "Esta unidade já consta registrada no banco de dados.",
          errData.existing ? `<b>Data do Recebimento Anterior:</b> ${errData.existing.data_recebimento}<br><b>Recebido por:</b> ${errData.existing.operador}<br><b>Status Atual:</b> ${errData.existing.status}` : ''
        );
        return;
      }
      throw new Error(errData.error || "Erro de resposta do servidor");
    }

    // SUCCESSFUL SCAN & RECEIVING!
    playSuccessBeep();

    appState.units.push(newUnit);
    appState.currentRecebimentoSession.unshift(newUnit);

    renderRecebimentoSessaoTable();
    clearRecebimentoFields();
    
    // Mostra toast rápido de confirmação
    showToast(`Unidade ${newUnit.serial} recebida com sucesso!`);
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar recebimento no servidor: " + err.message);
  } finally {
    isRecebimentoSubmitting = false;
  }
}

function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message ${isError ? 'error' : ''}`;
  toast.innerHTML = `
    <i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 2500);
}

function renderRecebimentoSessaoTable() {
  const tbody = document.getElementById('table-recebidos-sessao');
  tbody.innerHTML = '';

  const counterEl = document.getElementById('session-receiving-counter');
  if (counterEl) {
    counterEl.innerText = appState.currentRecebimentoSession.length;
  }

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
  if (autoRecebimentoTimeout) {
    clearTimeout(autoRecebimentoTimeout);
    autoRecebimentoTimeout = null;
  }
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
    if (unit.status === 'COSMETICO_NOK') {
      alert("Aguardando embalagem");
    }
    document.getElementById('cos-prev-fab').innerText = unit.fabricante;
    document.getElementById('cos-prev-mod').innerText = unit.modelo;
    document.getElementById('cos-prev-loc').innerText = unit.localidade;
    document.getElementById('cos-prev-status').innerText = unit.status;
    
    const funcBadge = document.getElementById('cos-prev-func');
    if (funcBadge) {
      funcBadge.innerText = unit.funcional ? 'REALIZADO' : 'PENDENTE';
      funcBadge.className = `badge ${unit.funcional ? 'badge-success' : 'badge-danger'}`;
    }
    
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
    alert("Unidade não encontrada no recebimento! A unidade precisa estar recebida no sistema.");
    return;
  }

  if (!unit.funcional) {
    alert("Apontamento Cosmético só pode ser feito se o Apontamento Funcional correspondente já tiver sido realizado!");
    return;
  }

  const resVal = document.querySelector('input[name="cos-resultado"]:checked').value;
  const defeitosSelect = document.getElementById('cos-defeitos');
  const defeitos = Array.from(defeitosSelect.selectedOptions).map(o => o.value);
  const defeitoConstatado = document.getElementById('cos-defeito-constatado').value.trim();
  const obs = document.getElementById('cos-obs').value;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const cosmeticoData = {
    resultado: resVal,
    defeitos,
    defeitoConstatado,
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
   MENU SUCATA
   ========================================================================== */

function lookupUnitForSucata() {
  const serial = document.getElementById('suc-serial').value.trim().toUpperCase();
  const previewDiv = document.getElementById('suc-unit-preview');
  
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);
  
  if (unit) {
    document.getElementById('suc-prev-fab').innerText = unit.fabricante;
    document.getElementById('suc-prev-mod').innerText = unit.modelo;
    document.getElementById('suc-prev-loc').innerText = unit.localidade;
    document.getElementById('suc-prev-status').innerText = unit.status;
    previewDiv.classList.remove('hidden');
  } else {
    previewDiv.classList.add('hidden');
  }
}

async function saveApontamentoSucata(e) {
  e.preventDefault();
  const serial = document.getElementById('suc-serial').value.trim().toUpperCase();
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    alert("Unidade não encontrada no recebimento! Apenas unidades já recebidas no sistema podem ser apontadas como sucata.");
    return;
  }

  const motivo = document.getElementById('suc-motivo').value;
  const obs = document.getElementById('suc-obs').value;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const sucataData = {
    motivo,
    obs,
    data: dateStr,
    operador: appState.currentUser.login
  };
  const targetStatus = 'SUCATA';

  try {
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetStatus,
        sucata: sucataData
      })
    });
    if (!res.ok) throw new Error("Erro de resposta");

    unit.sucata = sucataData;
    unit.status = targetStatus;

    document.getElementById('form-sucata').reset();
    document.getElementById('suc-unit-preview').classList.add('hidden');
    alert(`Apontamento de Sucata registrado com sucesso!`);
    
    if (document.getElementById('view-dashboard').classList.contains('active')) {
      renderDashboard();
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar apontamento de sucata no servidor!");
  }
}

/* ==========================================================================
   MENU REPARO ELETRÔNICO
   ========================================================================== */

function lookupUnitForReparo() {
  const serial = document.getElementById('rep-serial').value.trim().toUpperCase();
  const previewDiv = document.getElementById('rep-unit-preview');
  
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);
  
  if (unit) {
    document.getElementById('rep-prev-fab').innerText = unit.fabricante;
    document.getElementById('rep-prev-mod').innerText = unit.modelo;
    document.getElementById('rep-prev-loc').innerText = unit.localidade;
    document.getElementById('rep-prev-status').innerText = unit.status;
    previewDiv.classList.remove('hidden');

    if (unit.status === 'REPARO_ELETRONICO') {
      alert("apontamento cosmético");
    }
  } else {
    previewDiv.classList.add('hidden');
  }
}

async function saveApontamentoReparo(e) {
  e.preventDefault();
  const serial = document.getElementById('rep-serial').value.trim().toUpperCase();
  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    alert("Unidade não encontrada no recebimento! A unidade precisa estar recebida no sistema.");
    return;
  }

  if (unit.status === 'REPARO_ELETRONICO') {
    alert("apontamento cosmético");
  }

  const defeito = document.getElementById('rep-defeito').value;
  const local = document.getElementById('rep-local').value;
  const causa = document.getElementById('rep-causa').value;
  const servico = document.getElementById('rep-servico').value;
  const designator = document.getElementById('rep-designator').value;
  const tecnico = document.getElementById('rep-tecnico').value;
  const reparadora = document.getElementById('rep-reparadora').value;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const reparoData = {
    defeito,
    local,
    causa,
    servico,
    designator,
    tecnico,
    reparadora,
    data: dateStr,
    operador: appState.currentUser.login
  };
  const targetStatus = 'REPARO_ELETRONICO';

  try {
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetStatus,
        reparo_eletronico: reparoData
      })
    });
    if (!res.ok) throw new Error("Erro de resposta");

    unit.reparo_eletronico = reparoData;
    unit.status = targetStatus;

    document.getElementById('form-reparo').reset();
    document.getElementById('rep-unit-preview').classList.add('hidden');
    alert(`Reparo Eletrônico registrado com sucesso!`);
    
    if (document.getElementById('view-dashboard').classList.contains('active')) {
      renderDashboard();
    }
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar reparo eletrônico no servidor!");
  }
}

/* ==========================================================================
   MENU EMBALAGEM
   ========================================================================== */

async function fetchCurrentCaixaCodeFromServer() {
  try {
    const res = await fetch('/api/sequence/caixa/current');
    if (!res.ok) throw new Error("Erro de resposta");
    const data = await res.json();
    return data.formatted;
  } catch (err) {
    console.error(err);
    return 'C000000001';
  }
}

async function generateNextCaixaCodeFromServer() {
  try {
    const res = await fetch('/api/sequence/caixa/next', { method: 'POST' });
    if (!res.ok) throw new Error("Erro de resposta");
    const data = await res.json();
    return data.formatted;
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar novo código de caixa no servidor!");
    return null;
  }
}

async function initEmbalagemView() {
  const codeField = document.getElementById('emb-caixa-id');
  if (codeField) {
    codeField.placeholder = "Carregando...";
    const code = await fetchCurrentCaixaCodeFromServer();
    codeField.value = code;
    updateEmbalagemBoxSummary();
  }
  populatePrinterDropdowns();
}

async function generateNewCaixaCode() {
  const codeField = document.getElementById('emb-caixa-id');
  if (!codeField) return;

  const currentCaixaId = codeField.value.trim().toUpperCase();
  const currentBoxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === currentCaixaId);

  // BLOQUEIO: Não permitir gerar nova caixa se a atual estiver sem nenhuma unidade registrada
  if (currentCaixaId && currentBoxUnits.length === 0) {
    playErrorBeep();
    alert(`A caixa atual [${currentCaixaId}] não possui nenhuma unidade registrada!\n\nVocê só pode gerar uma nova caixa após registrar pelo menos 1 unidade ou fechar a caixa atual.`);
    return;
  }

  codeField.placeholder = "Carregando...";
  const code = await generateNextCaixaCodeFromServer();
  if (code) {
    codeField.value = code;
    updateEmbalagemBoxSummary();
    showToast(`Nova caixa sequencial ${code} iniciada no servidor!`);
  }
}

function updateEmbalagemBoxSummary() {
  const codeField = document.getElementById('emb-caixa-id');
  if (!codeField) return;
  const caixaId = codeField.value.trim().toUpperCase();
  document.getElementById('current-box-code').innerText = caixaId || 'C000000001';
  const boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
  
  const countEl = document.getElementById('current-box-count');
  if (countEl) {
    countEl.innerText = `${boxUnits.length} / 10`;
  }

  const modeloRefEl = document.getElementById('current-box-modelo');
  if (modeloRefEl) {
    if (boxUnits.length > 0) {
      modeloRefEl.innerText = boxUnits[0].modelo;
    } else {
      modeloRefEl.innerText = '-';
    }
  }

  const localidadeRefEl = document.getElementById('current-box-localidade');
  if (localidadeRefEl) {
    if (boxUnits.length > 0) {
      localidadeRefEl.innerText = boxUnits[0].localidade || '-';
    } else {
      localidadeRefEl.innerText = '-';
    }
  }

  const unitsContainer = document.getElementById('current-box-units');
  if (!unitsContainer) return;
  unitsContainer.innerHTML = '';
  if (boxUnits.length > 0) {
    boxUnits.forEach(u => {
      unitsContainer.innerHTML += `
        <div class="box-unit-chip">
          <span>${u.serial}</span>
          <span class="badge badge-success">${u.modelo}</span>
          <small class="text-muted" style="margin-left:6px;">${u.localidade || '-'}</small>
        </div>
      `;
    });
  } else {
    unitsContainer.innerHTML = '<p class="text-muted text-center">Nenhuma unidade embalada nesta caixa ainda.</p>';
  }
}

function generateZplBoxLabel(caixaId, modelo, units, targetDpi = 300) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const qtdStr = `QTD:${units.length}`;
  const modeloStr = modelo || (units.length > 0 ? units[0].modelo : 'PRODUTO');
  const localidadeStr = (units.length > 0 && units[0].localidade) ? units[0].localidade.toUpperCase() : 'GERAL';

  // Build QR Code string: GPON ID por unidade; se não tiver GPON ID, usa o Serial (SN)
  const idList = units.map(u => {
    const gpon = (u.gpon || '').trim().toUpperCase();
    const serial = (u.serial || '').trim().toUpperCase();
    return gpon || serial;
  }).filter(Boolean);

  const qrData = idList.join('\\0D\\0A') + (idList.length > 0 ? '\\0D\\0A' : '');
  const barcodeData = caixaId;

  // Se a impressora for de 203 DPI (~8 dots/mm) vs 300 DPI (~12 dots/mm), usamos coordenadas dimensionadas (fator 203/300 = 0.677)
  if (parseInt(targetDpi) === 203 || parseInt(targetDpi) === 200) {
    return `CT~~CD,~CC^~CT~
^XA
~TA000
~JSN
^LT0
^MNN
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR2,2
~SD25
^JUS
^LRN
^CI27
^PA0,1,1,0
^XZ
^XA
^MMT
^PW824
^LL640
^LS0
^FO0,124^GB824,0,6^FS
^FT33,209^A0B,17,17^FH\\^CI28^FD${dateStr}^FS^CI27
^FT120,204^A0B,17,17^FH\\^CI28^FD${timeStr}^FS^CI27
^FO0,210^GB824,0,6^FS
^FO131,127^GB0,87,6^FS
^FO136,167^GB688,0,6^FS
^FT143,158^A0N,31,31^FH\\^CI28^FDBOX ID:^FS^CI27
^BY2,3,24^FT444,161^BCN,,N,N
^FH\\^FD${barcodeData}^FS
^FT247,160^A0N,28,29^FH\\^CI28^FD${caixaId}^FS^CI27
^FT143,202^A0N,28,29^FH\\^CI28^FD${modeloStr}^FS^CI27
^FO324,171^GB0,41,6^FS
^FT355,202^A0N,28,29^FH\\^CI28^FDBrasil TecPar^FS^CI27
^FO1,258^GB824,0,6^FS
^FT29,250^A0N,28,29^FH\\^CI28^FD${qtdStr}^FS^CI27
^FO324,213^GB0,51,6^FS
^FT355,248^A0N,28,29^FH\\^CI28^FD${localidadeStr}^FS^CI27
^FO285,290^BQN,2,5
^FH\\^FDLA,${qrData}^FS
^PQ1,0,1,Y
^XZ`;
  }

  // Padrão 300 DPI (Novo Layout Atualizado com Elementos Gráficos)
  return `CT~~CD,~CC^~CT~
^XA
~TA000
~JSN
^LT0
^MNN
^MTT
^PON
^PMN
^LH0,0
^JMA
^PR2,2
~SD25
^JUS
^LRN
^CI27
^PA0,1,1,0
^XZ
^XA
^MMT
^PW1217
^LL945
^LS0
^FO313,52^GFA,3521,8280,69,:Z64:eJylmc9rG0kWx6u7LdTIjJXACp+yFsplcSA5LQsTiPrgZa9asPBlQ/6FHMb4sLOjxrk0Dsz8CSO8F9EC5xrUEPk4xxyS24SIOQktyMuQEGEn6n2/qrq65MQxWwZ166Ny1atX3371qlopLtt9VS7bTRc431XqAq9zfXDDbaQ+G4QlsDEbxA5IyuBuGpeBurWrrgAPXbDvAtU+bpZBftz0yyDtl2tcuEDtO9+991eCd64hwTIMw9gG50lS8sH6eZqWQN0Fyvuv02p1Bbx0QP3UtaQ6Ucpv2lV+8/1WCRy3WiXQBlDWUjVyWt10u7kaqHacxMnABuCSEniRQrHB0gVqy231+yvBxxVLfsCPVmz102rCn1XjHFzSsp6WwAVKfec06j2+NlDBAmQS1voWQJ8cFaatz46gpAWoz9AnFtAyiQyonF4bqGCCn37h6/rEx1KYRjJptQrQJmBHoYrVIJWGuhwUIWTTBSATKoWvSSa2UF4MoNi6IJmUhCL9rBkgoWLn8+AfJY7lAV+2Yw1GSjWhFGF1RC5pGeALsIQi7Xn6u46nN78eKEUysYTiL9gnRii1KX6zhLLBMrGEopv1IgF6tipfD0QmllDWxSQjlHWWSSGUOwIKoZjm9NKiZWKWFgNWapjV6F4sZS7gbiJlKuAERYNKMUBcYkChz13neg2gvjU3MV9T9xdRhRGKP2KfHLdGK61pkzoO8K4ESk1ViH9huDHhfgasmyT5kU2rDbSTNNAuSU9it1mZpmLyvxoUalDBc+6nAHxXO6bwAk64zWBb66Z1p19uzNhkniENbrqg4QJVQ4kcpQMjlG0EsBAZoaTaJcnRgkFRGHCzlS7OEc/THyC07OzsdLuRAPwEoEwN/PTwd+XJ1NLcZ9koVup+TP1ATM1GWZ5PRChps9nCXsEHBHy8u53l6BkRSoea/fA+0mO9gYZBOYgYeBpos+mZCrp7lnvw2a3neQ5yqU8Uy2RjjmUa1mMCSfITVJjhFUEthdjydH52BNaNY+PfCtR5qScqko67pwzWIq7wKVIFUFWxhP6FZNKGOuciFJTJRjpMh8MJC6UWs6l56vsMjsknY7zcm5Al+LHXy3vfiVUIviFLogJU8l6v17FqaEtYKDVIzmLsZwnqWIpMfkSXnJ0m8UeRCfokn4lQUowtz8AyKMOFqEJ5b3HIIgBcfm6JT1gi4rT8nSqAqr5mS34lmTSbKsAqeYxrIevmwQhKFvOSpKcvP4ecBQHKpHUvX9LTsxRVqOrBwQeyRD8UbIkAqpGLrRrA/5Alij4HesTLmIRC0eSP5JMkDCHTJMA1EhIKh5ef8iXmLEckFJzn+sM33bd5ZNKOwhIEWOOb/P0jskQDsI3TtlsAfJhstZWfD8knwUJ0kw2HGfYBaxLKBHwCNZaHykdw2ILYUhefoFA87vjv3gE8KiY8NMCOvZ4qcrPNvf1Gzwaq2mNLqo9JJkkyzmeHeX4aKxAKhZdxPp+DaVA+qhQjy8/59CjPByQUDi/gE5TLAIVCScm/IJo8fIND/UH6Ua+77B5JYG+9eeX10Gsmo90Sn3gfUSYwrn9eDJp5Ts6IJXu9yCZ0faD+hJd2PvXHeR+SFgBN/J+2+ISFAmW/21HdPexHp+xeVyzZ1E7qsNdMjU2xRB2wTBIc7Vn+SxhC3pjgD6Gan/1Ci0/9lFYhsCQkn4BQeBUak2wSEQoUfGC7j7Dr6kQs0T6p8uUW2PrwbVQA4xO1dcqLzn+y41aKjwrk7E36Jcgy7iD4nS73s4Eak9eC3xStQu38vGWEonTg5tvHxicl8GfwCXvNKKcnN9XHoAoYGIRTXlcgonCq8oRVEmvwYjmN2QlPJaEb5wvOWoaLhjhAW6J6xifiL9bFPlrCtb7XPpF9ovdrmxxxMerj6EAFSnwd5BfSyFh80vezJSJ/2aTSzhfsk9vPafcH3WpDvD3tE7kRXbAlFlB/MZZ0IICE4fp8rhfbp2fTkC3JY8paas9IL8v5tHa2hAATHo1tn2DOMvFeli2p/O2UXf7mtRDWxX430pZIzHmUy1a5EgUYrFEUfpod+i1//d8LpS2hmxpnuRdZP6DlWm1XEfjwNP3OWQss4LLAK6/BC5pEFB1BdYjpFpZIjUc9HXtg4xLH6sn8LH5yQio4iZcJ6qKudZLGHynFnU9gLaLtM28Q4XkTbc05eqNPqtzPrmQgVQqoCuPprlhS0SLeLftkl1OSAJaYajbCPU6q7vfxF4igXGXAOcps2L+TYS4CDxsnLZC+kF5az3mZR8VWKVWC8TbEEnM+0hBLGt1dC4AlkXERpiTB/NkEMhJIXI+magOHGmpLagO1gYKZn0xhJeJN0V2Ui/HJjxNuCC15SP2AXZyj6FVlTWztdv/a7e4WoLAEv+EmJ5il2cUQRwz9BJCF0DrDlsSco2TDLB3iolzT2S1FF1/5tHPcpX72MMzScFkG1Z45PyBbaUXsFAC8dBAVHpqTCs5m8wWEFtzTzXl1XopMIPeH8AIOmc2nDPyprZMZtajwyZB+TDK7JbMTGVu7HE4iXaP7OipUg5uci9EopWMz3Ol8e0yryrnIhBIWeLqy0bAv+0TOfCniNlu0ccT0b1/68Tp6kFuFTshROkswbtBxjh200Q/VA8xGYlIFgIGOFqAKmpA4DCivTWTvXMMbjC647tBUVTqSjsic84dYsiaALNEJnVaOkQmPsj7MshdKdjr+gFcVn2VCj0swhDKygPI5uugDhhuYk3I/FRolpmRbvZfyGwFPT58GxhLJ8mZx/HQ5P1uIKjhvHbMKGAziQ/BIPtE1fNgbHWJ0wRrcCLTofeIkoNjNbH0iS3YEVN5AwdtI1/D4u97K4qhyzk5SDWRVafLpwTYluiQcDXQQ1ucL6N/ND++MC2jL1yAPyGFBg3YdygbaJ/o4AYQS1nC3o5utDXBPTMmHgBi/Y9ZSE5BgDfvMpfL5ffHalcDsi80RlTQrANRCqrB3zivAnEOZwzLZEBcn8jc/BzoOIKHEJnhgOaGNsZEJCqVcw3cBRxQq/8/5iRlX6oCm9Y75X3NB4U+z8185Qvp6AAFEztl0szhLZQCaoKuxJHGO5opZjxyw9vXADKw48dMg1qDvAF21OK7UA/OuBDc/C3jpseechKJsMEiSUg0tFOsUVIRynfPYFaDucAepC4pzX9w8l0AqBhWNiK+LA+eVI2kG3heA2piUVIHA6WfDDi9Y7iWU5PYtS/ihjBzT1q4D5HzNatZnEBcA1mffBpyjFDIpjqgKcPlbQO8LNSiZtVVxCVjY4QVNW7g1WChrFiDTdq4F+HwtdYH9HukBboVLr55UWSb6iMoG6jJw40tA1aclmSBQLijJBA+2S/OpWChrJfCyLALa5HwZqGDpvDEOzssiWAX1hQPkYMgq3oELVt6erryPU/n0qDTnl4HUAYMj5931lvvOdQU8euWA3iv7jReW9fPy20V8CdsvgXsuaM/cF8Yrb39X3tt67mvalfe2+HIiLoPUBbOyqZeAskouBV8o/wPz502t:BDDB
^FO0,183^GFA,41,1520,152,:Z64:eJxjYKAe+D8KRsEoGAWjgKqAikU0AwD/NFL0:7666
^FO65,211^GFA,309,972,12,:Z64:eJx1k0EKAzEIRcVVyCmGLD2ly6GnGLIKnrKazLSNWpkqhMdX0x+RJxh+g3rv0i32c/nHEzWaAZ7nkvCt95mi/gAomb5lTPT5abPrX7Ng0D9XfXn9u6LTH4rJTDt/KAqtHYD7uU2v34tr4FdFCLyRJwYeF+/m15+dFKdPdw+vL3cDP0/rs4Hu4PRtT4bq9yU6vo02XkHWNYJ/5JrjRP8M5blG/5CN4+9/OoFL4M06tnBL/MlnAcr09e9qmb5eUPS/6A0BSqYPUBP/0yqJvuHJ/NfMUX9A+r6oYfq+Pu/xDUQ9jQ0=:122A
^FT49,309^A0B,25,25^FH\\^CI28^FD${dateStr}^FS^CI27
^FT178,301^A0B,25,25^FH\\^CI28^FD${timeStr}^FS^CI27
^FO0,310^GB1216,0,9^FS
^FO194,188^GB0,128,9^FS
^FO201,246^GFA,85,1664,128,:Z64:eJztzbEVABAMRVEqY1ndWKpELYp/NF4Rd4HrvrHymN+Z8K8M+FfoP7D/J/+DCv9Kg3+lw79y/Au5e3K9:3DC8
^FT211,234^A0N,46,46^FH\\^CI28^FDBOX ID:^FS^CI27
^BY3,3,35^FT656,238^BCN,,N,N
^FH\\^FD${barcodeData}^FS
^FT365,236^A0N,42,43^FH\\^CI28^FD${caixaId}^FS^CI27
^FT211,299^A0N,42,43^FH\\^CI28^FD${modeloStr}^FS^CI27
^FO478,252^GB0,61,9^FS
^FT525,298^A0N,42,43^FH\\^CI28^FDBrasil TecPar^FS^CI27
^FO1,381^GFA,97,1976,152,:Z64:eJxjYBh4wPgfA/yju43EAfLdRa6N5LuLtjYSB/4NtANwgFF3kQZG3UUaGBTuon+hMADFI9k2ku0uGttIHAAAxaVS6w==:824C
^FT43,370^A0N,42,43^FH\\^CI28^FD${qtdStr}^FS^CI27
^FO479,314^GB0,75,9^FS
^FT525,367^A0N,42,43^FH\\^CI28^FD${localidadeStr}^FS^CI27
^FO420,430^BQN,2,7
^FH\\^FDLA,${qrData}^FS
^PQ1,0,1,Y
^XZ`;
}

let lastGeneratedZpl = '';
let lastGeneratedBoxId = '';
let lastGeneratedBoxUnits = [];
let lastGeneratedBoxModelo = '';

function showZplModal(caixaId, modelo, units) {
  lastGeneratedBoxId = caixaId;
  lastGeneratedBoxModelo = modelo;
  lastGeneratedBoxUnits = units;

  // Obter DPI da impressora selecionada (se houver)
  const selectedPrinterId = localStorage.getItem('wms_selected_printer_emb') || 
                            localStorage.getItem('wms_selected_printer_pallet') || 
                            (appState.printers.length > 0 ? appState.printers[0].id : null);
  const printer = appState.printers.find(p => p.id === selectedPrinterId);
  const targetDpi = printer ? (printer.dpi || 300) : 300;

  lastGeneratedZpl = generateZplBoxLabel(caixaId, modelo, units, targetDpi);

  document.getElementById('zpl-modal-box-id').innerText = caixaId;
  document.getElementById('zpl-modal-code').value = lastGeneratedZpl;
  document.getElementById('zpl-modal-info').innerHTML = `
    <b>Modelo:</b> ${modelo} | <b>Total de Unidades:</b> ${units.length} | <b>Resolução:</b> ${targetDpi} DPI | <b>Data/Hora:</b> ${new Date().toLocaleString('pt-BR')}
  `;

  document.getElementById('zpl-modal').classList.remove('hidden');
}

function closeZplModal() {
  document.getElementById('zpl-modal').classList.add('hidden');
}

function copiarCodigoZpl() {
  const textarea = document.getElementById('zpl-modal-code');
  textarea.select();
  navigator.clipboard.writeText(textarea.value).then(() => {
    showToast("Código ZPL copiado para a área de transferência!");
  }).catch(() => {
    document.execCommand('copy');
    showToast("Código ZPL copiado!");
  });
}

function baixarArquivoZpl() {
  if (!lastGeneratedZpl) return;
  const blob = new Blob([lastGeneratedZpl], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Etiqueta_${lastGeneratedBoxId || 'Caixa'}.zpl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function imprimirZplDiretoImpressora() {
  // Get active printer from dropdown preference or list
  const selectedPrinterId = localStorage.getItem('wms_selected_printer_emb') || 
                            localStorage.getItem('wms_selected_printer_pallet') || 
                            (appState.printers.length > 0 ? appState.printers[0].id : null);

  const printer = appState.printers.find(p => p.id === selectedPrinterId);

  if (!printer) {
    alert("Nenhuma impressora Zebra selecionada ou cadastrada! Cadastre uma impressora em 'Cadastros > Impressoras Zebra' e selecione-a na tela de Embalagem.");
    return;
  }

  // Gera o ZPL exato para a resolução configurada desta impressora
  const zplParaEnviar = generateZplBoxLabel(
    lastGeneratedBoxId, 
    lastGeneratedBoxModelo, 
    lastGeneratedBoxUnits, 
    printer.dpi || 300
  );

  try {
    showToast(`Enviando etiqueta para impressora ${printer.nome} [${printer.dpi || 300} DPI] (${printer.ip})...`);

    // Envia para o serviço local Python (Micro-serviço Zebra Socket)
    const response = await fetch('http://localhost:5000/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: printer.ip,
        port: printer.porta || 9100,
        dpi: printer.dpi || 300,
        zpl: zplParaEnviar,
        boxId: lastGeneratedBoxId,
        printerName: printer.nome,
        posto: printer.posto
      })
    });

    if (response.ok) {
      const data = await response.json();
      playSuccessBeep();
      showToast(`Impressão enviada com sucesso para ${printer.nome} [${printer.posto}]!`);
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Erro de comunicação com o serviço local");
    }
  } catch (err) {
    console.warn("Serviço Python local não detectado ou erro de socket:", err);
    alert(`Atenção: Não foi possível conectar ao Agente Python local (http://localhost:5000).\n\nCertifique-se de executar o script/executável "ZebraPrintAgent.exe" na máquina do operador para envio direto via rede/IP.\n\nVocê também pode copiar o ZPL ou baixar o arquivo .zpl.`);
  }
}

function closeConfirmBoxModal() {
  document.getElementById('confirm-box-modal').classList.add('hidden');
}

function solicitarFechamentoManualCaixa() {
  const caixaId = document.getElementById('emb-caixa-id').value.trim().toUpperCase();
  const boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);

  if (boxUnits.length === 0) {
    alert("Não há nenhuma unidade embalada nesta caixa para fechar.");
    return;
  }

  if (boxUnits.length < 10) {
    document.getElementById('confirm-box-title').innerText = "FECHAMENTO ANTECIPADO DE CAIXA";
    document.getElementById('confirm-box-msg').innerText = `Atenção: A caixa ${caixaId} contém apenas ${boxUnits.length} unidade(s) (menos que 10).`;
    document.getElementById('confirm-box-details').innerHTML = `
      Deseja realmente fechar a caixa com <b>${boxUnits.length} unidade(s)</b> e gerar a etiqueta ZPL agora?
    `;
    document.getElementById('confirm-box-modal').classList.remove('hidden');
    return;
  }

  // Se já tiver 10 ou mais unidades, fecha direto
  fecharCaixaEmbalagem(caixaId);
}

async function confirmarFechamentoManualCaixa() {
  closeConfirmBoxModal();
  const caixaId = document.getElementById('emb-caixa-id').value.trim().toUpperCase();
  await fecharCaixaEmbalagem(caixaId);
}

async function fecharCaixaEmbalagem(caixaId) {
  const boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
  const modelo = boxUnits.length > 0 ? boxUnits[0].modelo : '';

  // Exibe a etiqueta ZPL gerada
  showZplModal(caixaId, modelo, boxUnits);
  playSuccessBeep();

  // Gera novo lote/código de caixa no backend
  await generateNewCaixaCode();
  showToast(`Caixa ${caixaId} fechada com sucesso! Nova caixa iniciada.`);
}

async function processEmbalarUnidade(e) {
  e.preventDefault();
  const caixaId = document.getElementById('emb-caixa-id').value.trim().toUpperCase();
  const serial = document.getElementById('emb-serial').value.trim().toUpperCase();

  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    playErrorBeep();
    alert("Erro: Unidade não encontrada no recebimento! A unidade precisa estar recebida no sistema.");
    return;
  }

  // Verificar se a unidade já foi embalada anteriormente
  if (unit.embalagem) {
    playErrorBeep();
    alert(`Esta unidade já foi embalada na caixa: ${unit.embalagem.caixaId}!`);
    return;
  }

  // Verificar status de reprovação
  if (unit.status && unit.status.includes('NOK')) {
    playErrorBeep();
    alert("Unidade com apontamento REPROVADO não pode ser embalada!");
    return;
  }

  // Verificar se a caixa já possui unidades de outro modelo ou outra regional (Validação Rígida de Modelo e Regional)
  const existingBoxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
  if (existingBoxUnits.length > 0) {
    const modeloReferencia = existingBoxUnits[0].modelo;
    const localidadeReferencia = existingBoxUnits[0].localidade;

    if (unit.modelo !== modeloReferencia) {
      playErrorBeep();
      alert(`BLOQUEIO DE MODELO:\nA caixa [${caixaId}] está configurada para o modelo [${modeloReferencia}].\nA unidade bipada é do modelo [${unit.modelo}] e não pode ser misturada nesta caixa!`);
      return;
    }

    if (unit.localidade !== localidadeReferencia) {
      playErrorBeep();
      alert(`BLOQUEIO DE REGIONAL / LOCALIDADE:\nA caixa [${caixaId}] pertence à regional [${localidadeReferencia}].\nA unidade bipada pertence à regional [${unit.localidade}] e não pode ser misturada nesta caixa!`);
      return;
    }
  }

  // Verificar se a caixa já possui 10 unidades
  if (existingBoxUnits.length >= 10) {
    playErrorBeep();
    alert(`A caixa [${caixaId}] já atingiu a capacidade máxima de 10 unidades! Feche a caixa para iniciar uma nova.`);
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8);

  const embalagemData = {
    caixaId,
    data: dateStr,
    operador: appState.currentUser ? appState.currentUser.login : 'OPERADOR'
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
    playSuccessBeep();

    // Atualiza resumo visual da caixa
    updateEmbalagemBoxSummary();

    const updatedBoxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
    showToast(`Unidade ${unit.serial} (${unit.modelo}) adicionada à caixa ${caixaId}! [${updatedBoxUnits.length}/10]`);

    // FECHAMENTO AUTOMÁTICO: se atingiu 10 unidades na caixa
    if (updatedBoxUnits.length >= 10) {
      setTimeout(async () => {
        await fecharCaixaEmbalagem(caixaId);
      }, 300);
    }
  } catch (err) {
    console.error(err);
    playErrorBeep();
    alert("Erro ao salvar embalagem no servidor!");
  }
}

/* ==========================================================================
   MENU PALLET (SEQUENTIAL PACKAGING)
   ========================================================================== */

async function fetchCurrentPalletBoxCodeFromServer() {
  try {
    const res = await fetch('/api/sequence/caixa_pallet/current');
    if (!res.ok) throw new Error("Erro de resposta");
    const data = await res.json();
    return data.formatted;
  } catch (err) {
    console.error(err);
    return 'C00000001';
  }
}

async function generateNextPalletBoxCodeFromServer() {
  try {
    const res = await fetch('/api/sequence/caixa_pallet/next', { method: 'POST' });
    if (!res.ok) throw new Error("Erro de resposta");
    const data = await res.json();
    return data.formatted;
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar novo código de caixa no servidor!");
    return null;
  }
}

async function initPalletView() {
  const codeField = document.getElementById('pallet-caixa-id');
  if (codeField) {
    codeField.placeholder = "Carregando...";
    const code = await fetchCurrentPalletBoxCodeFromServer();
    codeField.value = code;
    updatePalletBoxSummary();
  }
}

async function generateNewPalletBoxCode() {
  const codeField = document.getElementById('pallet-caixa-id');
  if (!codeField) return;

  const currentCaixaId = codeField.value.trim().toUpperCase();
  const currentBoxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === currentCaixaId);

  // BLOQUEIO: Não permitir gerar nova caixa de pallet se a atual estiver sem nenhuma unidade
  if (currentCaixaId && currentBoxUnits.length === 0) {
    playErrorBeep();
    alert(`A caixa/pallet atual [${currentCaixaId}] não possui nenhuma unidade registrada!\n\nVocê só pode gerar uma nova caixa após registrar pelo menos 1 unidade.`);
    return;
  }

  codeField.placeholder = "Carregando...";
  const code = await generateNextPalletBoxCodeFromServer();
  if (code) {
    codeField.value = code;
    updatePalletBoxSummary();
    showToast(`Novo lote/caixa sequencial ${code} gerado no servidor!`);
  }
}

function updatePalletBoxSummary() {
  const caixaId = document.getElementById('pallet-caixa-id').value.trim().toUpperCase();
  document.getElementById('pallet-box-code').innerText = caixaId || 'C00000001';

  const boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
  document.getElementById('pallet-box-count').innerText = boxUnits.length;

  const modeloRefEl = document.getElementById('pallet-box-modelo');
  const localidadeRefEl = document.getElementById('pallet-box-localidade');
  const unitsContainer = document.getElementById('pallet-box-units');

  if (boxUnits.length > 0) {
    const refUnit = boxUnits[0];
    modeloRefEl.innerText = refUnit.modelo;
    localidadeRefEl.innerText = refUnit.localidade;

    unitsContainer.innerHTML = '';
    boxUnits.forEach(u => {
      unitsContainer.innerHTML += `
        <div class="box-unit-chip">
          <span>${u.serial}</span>
          <span class="badge badge-success">${u.modelo}</span>
          <small class="text-muted" style="margin-left:8px;">${u.localidade}</small>
        </div>
      `;
    });
  } else {
    modeloRefEl.innerText = '-';
    localidadeRefEl.innerText = '-';
    unitsContainer.innerHTML = '<p class="text-muted text-center">Nenhuma unidade embalada nesta caixa ainda.</p>';
  }
}

async function processPalletUnidade(e) {
  e.preventDefault();
  const caixaId = document.getElementById('pallet-caixa-id').value.trim().toUpperCase();
  const serial = document.getElementById('pallet-serial').value.trim().toUpperCase();

  const unit = appState.units.find(u => u.serial === serial || u.gpon === serial || u.mac === serial);

  if (!unit) {
    alert("Erro: Registro de recebimento não executado! A unidade precisa estar recebida no sistema.");
    return;
  }

  // 1. Check all required steps
  // Required:
  // - Registro de recebimento (implicitly checked as unit exists)
  // - Teste funcional ou reparo finalizado.
  // - Apontamento cosmético.
  // We need to show which steps are missing if any.
  const missingSteps = [];
  
  // Teste funcional ou reparo
  const hasFuncional = !!unit.funcional;
  const hasReparo = !!unit.reparo_eletronico;
  if (!hasFuncional && !hasReparo) {
    missingSteps.push("Teste Funcional ou Reparo Eletrônico");
  }

  // Apontamento cosmético
  const hasCosmetico = !!unit.cosmetico;
  if (!hasCosmetico) {
    missingSteps.push("Apontamento Cosmético");
  }

  if (missingSteps.length > 0) {
    alert(`Não é possível realizar a embalagem. Etapa(s) faltante(s): \n- ${missingSteps.join('\n- ')}`);
    return;
  }

  // Check if unit is rejected
  if (unit.status.includes('NOK')) {
    alert("Unidade com apontamento REPROVADO não pode ser embalada!");
    return;
  }

  // 2. Validate same model and same location (referencing the receiving step: unit.modelo & unit.localidade)
  const boxUnits = appState.units.filter(u => u.embalagem && u.embalagem.caixaId === caixaId);
  if (boxUnits.length > 0) {
    const firstUnit = boxUnits[0];
    if (unit.modelo !== firstUnit.modelo) {
      alert(`Erro: A caixa só aceita unidades do mesmo modelo (${firstUnit.modelo}). Esta unidade é do modelo ${unit.modelo}.`);
      return;
    }
    if (unit.localidade !== firstUnit.localidade) {
      alert(`Erro: A caixa só aceita unidades da mesma localidade (${firstUnit.localidade}). Esta unidade é da localidade ${unit.localidade}.`);
      return;
    }
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

    document.getElementById('pallet-serial').value = '';

    updatePalletBoxSummary();
    showToast(`Unidade ${unit.serial} embalada no Pallet com sucesso!`);
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
          <p class="small">Apontado por: <b>${u.cosmetico.operador}</b>. Defeitos: ${[...u.cosmetico.defeitos, u.cosmetico.defeitoConstatado].filter(Boolean).join(', ') || 'Nenhum'}</p>
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

      <!-- REPARO ELETRÔNICO -->
      ${u.reparo_eletronico ? `
      <div class="timeline-item timeline-warning">
        <div class="timeline-dot bg-warning"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="text-warning"><i class="fa-solid fa-screwdriver-wrench"></i> REPARO ELETRÔNICO</span>
            <small class="text-muted">${u.reparo_eletronico.data}</small>
          </div>
          <p class="small"><b>Defeito:</b> ${u.reparo_eletronico.defeito} | <b>Local:</b> ${u.reparo_eletronico.local} | <b>Causa:</b> ${u.reparo_eletronico.causa} | <b>Serviço:</b> ${u.reparo_eletronico.servico} | <b>Designator:</b> ${u.reparo_eletronico.designator} | <b>Técnico:</b> ${u.reparo_eletronico.tecnico} | <b>Reparadora:</b> ${u.reparo_eletronico.reparadora} (Operador: <b>${u.reparo_eletronico.operador}</b>)</p>
        </div>
      </div>` : ''}

      <!-- SUCATA -->
      ${u.sucata ? `
      <div class="timeline-item timeline-danger">
        <div class="timeline-dot bg-danger"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="text-danger"><i class="fa-solid fa-trash-can"></i> SUCATEADO</span>
            <small class="text-muted">${u.sucata.data}</small>
          </div>
          <p class="small">Apontado como sucata por: <b>${u.sucata.operador}</b>. Motivo: <b>${u.sucata.motivo}</b>. Obs: ${u.sucata.obs || 'Nenhuma'}</p>
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
function getReportFilteredUnits() {
  const subType = appState.currentReportSubmenu || 'recebimento';
  const dataInicioEl = document.getElementById('rel-data-inicio');
  const dataFimEl = document.getElementById('rel-data-fim');
  const fabEl = document.getElementById('rel-fabricante');
  const modEl = document.getElementById('rel-modelo');

  const dataInicio = dataInicioEl ? dataInicioEl.value : '';
  const dataFim = dataFimEl ? dataFimEl.value : '';
  const fab = fabEl ? fabEl.value : '';
  const mod = modEl ? modEl.value : '';

  const unitsList = Array.isArray(appState.units) ? appState.units : [];

  return unitsList.filter(u => {
    if (!u) return false;
    if (fab && u.fabricante !== fab) return false;
    if (mod && u.modelo !== mod) return false;

    let targetDate = u.dataRecebimento ? String(u.dataRecebimento).slice(0, 10) : '';
    if (subType === 'cosmetico' && u.cosmetico && u.cosmetico.data) targetDate = String(u.cosmetico.data).slice(0, 10);
    if (subType === 'funcional' && u.funcional && u.funcional.data) targetDate = String(u.funcional.data).slice(0, 10);
    if (subType === 'embalagem' && u.embalagem && u.embalagem.data) targetDate = String(u.embalagem.data).slice(0, 10);
    if (subType === 'expedicao' && u.expedicao && u.expedicao.data) targetDate = String(u.expedicao.data).slice(0, 10);

    if (dataInicio && targetDate < dataInicio) return false;
    if (dataFim && targetDate > dataFim) return false;

    if (subType === 'cosmetico') return u.cosmetico != null && typeof u.cosmetico === 'object';
    if (subType === 'funcional') return u.funcional != null && typeof u.funcional === 'object';
    if (subType === 'embalagem') return u.embalagem != null && typeof u.embalagem === 'object';
    if (subType === 'expedicao') return u.expedicao != null && typeof u.expedicao === 'object';

    return true;
  });
}

function renderRelatorioTable() {
  try {
    const subType = appState.currentReportSubmenu || 'recebimento';
    const filteredUnits = getReportFilteredUnits();

    const thead = document.getElementById('relatorio-thead');
    const tbody = document.getElementById('relatorio-tbody');
    if (!thead || !tbody) return;

    let theadHtml = '';
    let rowsHtml = '';

    if (subType === 'recebimento') {
      theadHtml = `
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
      rowsHtml = filteredUnits.map(u => `
        <tr>
          <td>${u.dataRecebimento || '-'}</td>
          <td>${u.fabricante || '-'}</td>
          <td>${u.modelo || '-'}</td>
          <td><code>${u.serial || '-'}</code></td>
          <td><code>${u.gpon || '-'}</code></td>
          <td><code>${u.mac || '-'}</code></td>
          <td>${u.localidade || '-'}</td>
          <td>${u.operador || '-'}</td>
          <td><span class="badge ${getStatusBadgeClass(u.status)}">${u.status || '-'}</span></td>
        </tr>
      `).join('');
    } else if (subType === 'cosmetico') {
      theadHtml = `
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
      rowsHtml = filteredUnits.map(u => {
        if (!u.cosmetico) return '';
        return `
          <tr>
            <td>${u.cosmetico.data || '-'}</td>
            <td><code>${u.serial || '-'}</code></td>
            <td>${u.fabricante || '-'}</td>
            <td>${u.modelo || '-'}</td>
            <td><span class="badge ${u.cosmetico.resultado === 'APROVADO' ? 'badge-success' : 'badge-danger'}">${u.cosmetico.resultado || '-'}</span></td>
            <td>${[...(u.cosmetico.defeitos || []), u.cosmetico.defeitoConstatado].filter(Boolean).join(', ') || '-'}</td>
            <td>${u.cosmetico.obs || '-'}</td>
            <td>${u.cosmetico.operador || '-'}</td>
          </tr>
        `;
      }).join('');
    } else if (subType === 'funcional') {
      theadHtml = `
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
      rowsHtml = filteredUnits.map(u => {
        if (!u.funcional) return '';
        return `
          <tr>
            <td>${u.funcional.data || '-'}</td>
            <td><code>${u.serial || '-'}</code></td>
            <td>${u.fabricante || '-'}</td>
            <td>${u.modelo || '-'}</td>
            <td><span class="badge ${u.funcional.resultado === 'APROVADO' ? 'badge-success' : 'badge-danger'}">${u.funcional.resultado || '-'}</span></td>
            <td>${(u.funcional.testes || []).join(', ')}</td>
            <td>${u.funcional.obs || '-'}</td>
            <td>${u.funcional.operador || '-'}</td>
          </tr>
        `;
      }).join('');
    } else if (subType === 'embalagem') {
      theadHtml = `
        <tr>
          <th>Data/Hora</th>
          <th>Código da Caixa</th>
          <th>Serial</th>
          <th>Fabricante</th>
          <th>Modelo</th>
          <th>Operador</th>
        </tr>
      `;
      rowsHtml = filteredUnits.map(u => {
        if (!u.embalagem) return '';
        return `
          <tr>
            <td>${u.embalagem.data || '-'}</td>
            <td><strong>${u.embalagem.caixaId || '-'}</strong></td>
            <td><code>${u.serial || '-'}</code></td>
            <td>${u.fabricante || '-'}</td>
            <td>${u.modelo || '-'}</td>
            <td>${u.embalagem.operador || '-'}</td>
          </tr>
        `;
      }).join('');
    } else if (subType === 'expedicao') {
      theadHtml = `
        <tr>
          <th>Data/Hora</th>
          <th>Ordem Expedição</th>
          <th>Destino</th>
          <th>Serial</th>
          <th>Fabricante / Modelo</th>
          <th>Operador</th>
        </tr>
      `;
      rowsHtml = filteredUnits.map(u => {
        if (!u.expedicao) return '';
        return `
          <tr>
            <td>${u.expedicao.data || '-'}</td>
            <td><strong>${u.expedicao.ordem || '-'}</strong></td>
            <td>${u.expedicao.destino || '-'}</td>
            <td><code>${u.serial || '-'}</code></td>
            <td>${u.fabricante || '-'} ${u.modelo || '-'}</td>
            <td>${u.expedicao.operador || '-'}</td>
          </tr>
        `;
      }).join('');
    }

    thead.innerHTML = theadHtml;
    tbody.innerHTML = rowsHtml;
  } catch (err) {
    console.error("Erro ao renderizar tabela de relatório:", err);
  }
}

function exportCurrentReportToExcel() {
  try {
    const subType = appState.currentReportSubmenu || 'recebimento';
    const filteredUnits = getReportFilteredUnits();

    if (!filteredUnits || filteredUnits.length === 0) {
      alert("Nenhum dado disponível para exportar no período selecionado!");
      return;
    }

    const dataRows = [];

    if (subType === 'recebimento') {
      filteredUnits.forEach(u => {
        dataRows.push({
          'Data Recebimento': u.dataRecebimento || '-',
          'Fabricante': u.fabricante || '-',
          'Modelo': u.modelo || '-',
          'Serial': u.serial || '-',
          'GPON': u.gpon || '-',
          'MAC': u.mac || '-',
          'Localidade': u.localidade || '-',
          'Operador': u.operador || '-',
          'Status': u.status || '-'
        });
      });
    } else if (subType === 'cosmetico') {
      filteredUnits.forEach(u => {
        if (!u.cosmetico) return;
        dataRows.push({
          'Data Apontamento': u.cosmetico.data || '-',
          'Serial': u.serial || '-',
          'Fabricante': u.fabricante || '-',
          'Modelo': u.modelo || '-',
          'Resultado Cosmético': u.cosmetico.resultado || '-',
          'Defeitos': [...(u.cosmetico.defeitos || []), u.cosmetico.defeitoConstatado].filter(Boolean).join(', ') || '-',
          'Observações': u.cosmetico.obs || '-',
          'Operador': u.cosmetico.operador || '-'
        });
      });
    } else if (subType === 'funcional') {
      filteredUnits.forEach(u => {
        if (!u.funcional) return;
        dataRows.push({
          'Data Apontamento': u.funcional.data || '-',
          'Serial': u.serial || '-',
          'Fabricante': u.fabricante || '-',
          'Modelo': u.modelo || '-',
          'Resultado Funcional': u.funcional.resultado || '-',
          'Testes Executados': (u.funcional.testes || []).join(', ') || '-',
          'Observações': u.funcional.obs || '-',
          'Operador': u.funcional.operador || '-'
        });
      });
    } else if (subType === 'embalagem') {
      filteredUnits.forEach(u => {
        if (!u.embalagem) return;
        dataRows.push({
          'Data Embalagem': u.embalagem.data || '-',
          'Código Caixa': u.embalagem.caixaId || '-',
          'Serial': u.serial || '-',
          'Fabricante': u.fabricante || '-',
          'Modelo': u.modelo || '-',
          'Operador': u.embalagem.operador || '-'
        });
      });
    } else if (subType === 'expedicao') {
      filteredUnits.forEach(u => {
        if (!u.expedicao) return;
        dataRows.push({
          'Data Expedição': u.expedicao.data || '-',
          'Ordem Expedição': u.expedicao.ordem || '-',
          'Destino': u.expedicao.destino || '-',
          'Serial': u.serial || '-',
          'Fabricante / Modelo': `${u.fabricante || ''} ${u.modelo || ''}`.trim() || '-',
          'Operador': u.expedicao.operador || '-'
        });
      });
    }

    generateExcelFile(dataRows, `Relatorio_${subType.toUpperCase()}`, `Relatório ${subType}`);
  } catch (err) {
    console.error("Erro ao exportar relatório para excel:", err);
    alert("Erro ao exportar relatório: " + err.message);
  }
}

/* ==========================================================================
   CADASTRO DE CÓDIGO DE DEFEITO - LOGIC AND EXCEL IMPORT
   ========================================================================== */

function setupCadastroDefeitoView(category) {
  const catTitle = category.replace('_', ' ').toUpperCase();
  document.getElementById('defect-table-title').innerHTML = `<i class="fa-solid fa-list"></i> Códigos Cadastrados (${catTitle})`;
  
  document.getElementById('defect-search').value = '';
  document.getElementById('defeito-excel-file').value = '';
  document.getElementById('form-cadastro-defeito').reset();

  renderDefectTableFiltered();
}

function renderDefectTableFiltered() {
  const tbody = document.getElementById('table-defeitos-body');
  tbody.innerHTML = '';

  const currentCat = appState.currentDefectCategory;
  const filtered = appState.defectCodes.filter(d => d.categoria === currentCat);
  const searchVal = document.getElementById('defect-search').value.toLowerCase().trim();

  filtered.forEach(d => {
    if (searchVal && !d.codigo.toLowerCase().includes(searchVal) && !(d.descricao || '').toLowerCase().includes(searchVal)) {
      return;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.codigo}</strong></td>
      <td>${d.descricao || '-'}</td>
      <td>
        <div style="display: flex; gap: 4px;">
          <button class="btn btn-warning btn-sm" onclick="editDefectCode(${d.id})">
            <i class="fa-solid fa-pen-to-square"></i> Editar
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteDefectCode(${d.id})">
            <i class="fa-solid fa-trash"></i> Excluir
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterDefectTable() {
  renderDefectTableFiltered();
}

async function saveDefectManual(e) {
  e.preventDefault();
  const codigo = document.getElementById('def-codigo').value.trim().toUpperCase();
  const descricao = document.getElementById('def-descricao').value.trim();
  const categoria = appState.currentDefectCategory;

  if (!codigo) return;

  try {
    if (appState.editingDefectId) {
      // UPDATE existing defect code
      const res = await fetch(`/api/defect-codes/${appState.editingDefectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, descricao })
      });
      if (!res.ok) throw new Error("Erro de resposta");
      alert("Código atualizado com sucesso!");
    } else {
      // CREATE new defect code
      const newDefect = { categoria, codigo, descricao };
      const res = await fetch('/api/defect-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefect)
      });
      if (!res.ok) throw new Error("Erro de resposta");
      alert("Código cadastrado com sucesso!");
    }

    // Refresh state from server
    const defectsRes = await fetch('/api/defect-codes');
    if (defectsRes.ok) {
      appState.defectCodes = await defectsRes.json();
    }

    cancelDefectEdit();
    renderDefectTableFiltered();
    populateSelectDropdowns();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar código de defeito no servidor!");
  }
}

function editDefectCode(id) {
  const defect = appState.defectCodes.find(d => d.id === id);
  if (!defect) return;

  appState.editingDefectId = id;
  document.getElementById('def-codigo').value = defect.codigo;
  document.getElementById('def-descricao').value = defect.descricao || '';
  
  const submitBtn = document.querySelector('#form-cadastro-defeito button[type="submit"]');
  submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
  submitBtn.className = "btn btn-warning btn-block";
  
  let cancelBtn = document.getElementById('btn-cancel-edit-defect');
  if (!cancelBtn) {
    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'btn-cancel-edit-defect';
    cancelBtn.className = 'btn btn-secondary btn-block';
    cancelBtn.style.marginTop = '8px';
    cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Cancelar Edição';
    cancelBtn.onclick = cancelDefectEdit;
    submitBtn.parentNode.appendChild(cancelBtn);
  }
  
  document.getElementById('form-cadastro-defeito').scrollIntoView({ behavior: 'smooth' });
}

function cancelDefectEdit() {
  appState.editingDefectId = null;
  document.getElementById('form-cadastro-defeito').reset();
  
  const submitBtn = document.querySelector('#form-cadastro-defeito button[type="submit"]');
  submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cadastrar Código';
  submitBtn.className = "btn btn-primary btn-block";
  
  const cancelBtn = document.getElementById('btn-cancel-edit-defect');
  if (cancelBtn) {
    cancelBtn.remove();
  }
}

async function deleteDefectCode(id) {
  if (confirm("Excluir este código de defeito?")) {
    try {
      const res = await fetch(`/api/defect-codes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro de resposta");

      appState.defectCodes = appState.defectCodes.filter(d => d.id !== id);
      renderDefectTableFiltered();
      populateSelectDropdowns();
      if (appState.editingDefectId === id) {
        cancelDefectEdit();
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao remover código de defeito do servidor!");
    }
  }
}

function importDefectsFromExcel() {
  const fileInput = document.getElementById('defeito-excel-file');
  const file = fileInput.files[0];
  if (!file) {
    alert("Por favor, selecione um arquivo Excel primeiro.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (rows.length === 0) {
        alert("A planilha está vazia!");
        return;
      }

      const category = appState.currentDefectCategory;
      const defectsToImport = [];

      let startIdx = 0;
      const firstRowVal = String(rows[0][0] || '').toLowerCase();
      if (firstRowVal.includes('cod') || firstRowVal.includes('nome') || firstRowVal.includes('key')) {
        startIdx = 1;
      }

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const codigo = String(row[0] || '').trim().toUpperCase();
        const descricao = String(row[1] || '').trim();

        if (codigo) {
          defectsToImport.push({
            categoria: category,
            codigo,
            descricao
          });
        }
      }

      if (defectsToImport.length === 0) {
        alert("Nenhum código válido encontrado na planilha.");
        return;
      }

      const res = await fetch('/api/defect-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defectsToImport)
      });

      if (!res.ok) throw new Error("Erro ao importar lote");

      const defectsRes = await fetch('/api/defect-codes');
      if (defectsRes.ok) {
        appState.defectCodes = await defectsRes.json();
      }

      renderDefectTableFiltered();
      populateSelectDropdowns();
      fileInput.value = '';
      alert(`${defectsToImport.length} códigos importados com sucesso!`);
    } catch (err) {
      console.error(err);
      alert("Erro ao ler ou processar planilha Excel: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}
