
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_jPOZqD37Efy_vlE-t-rpo5sf8Zuv-A0",
  authDomain: "checklist-3c94f.firebaseapp.com",
  databaseURL: "https://checklist-3c94f-default-rtdb.firebaseio.com",
  projectId: "checklist-3c94f",
  storageBucket: "checklist-3c94f.firebasestorage.app",
  messagingSenderId: "263286954300",
  appId: "1:263286954300:web:e1f3c22499a65f8c0c2639",
  measurementId: "G-LB7T6YWEG1"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser = null;
let currentInspectionData = null;
let currentLogoUrl = null;
let currentFilter = 'all';
let currentOrder = null;

// Initialize Admin
async function initializeAdmin() {
  const adminRef = database.ref('users/admin');
  const snapshot = await adminRef.once('value');

  if (!snapshot.exists()) {
    await adminRef.set({
      username: 'admin',
      password: 'admin123',
      nome: 'Administrador',
      cnpj: '00.000.000/0000-00',
      tipo: 'admin'
    });
  }
}

// Toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Modal
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.body.style.overflow = '';
}

// Logo Management
async function loadLogo() {
  const logoRef = database.ref('settings/logo');
  const snapshot = await logoRef.once('value');
  const logoData = snapshot.val();

  if (logoData && logoData.url) {
    currentLogoUrl = logoData.url;
    updateLogoDisplay(logoData.url);
  }
}

function updateLogoDisplay(url) {
  document.getElementById('loginLogoImg').src = url;
  document.getElementById('loginLogoImg').style.display = 'block';
  document.getElementById('loginLogoText').style.display = 'none';

  document.getElementById('sidebarLogoImg').src = url;
  document.getElementById('sidebarLogoImg').style.display = 'block';
  document.getElementById('sidebarLogoText').style.display = 'none';

  document.getElementById('logoPreviewImg').src = url;
  document.getElementById('logoPreviewImg').style.display = 'block';
  document.getElementById('logoPreviewText').style.display = 'none';

  document.getElementById('removeLogo').style.display = 'block';
}

function clearLogoDisplay() {
  document.getElementById('loginLogoImg').style.display = 'none';
  document.getElementById('loginLogoText').style.display = 'flex';

  document.getElementById('sidebarLogoImg').style.display = 'none';
  document.getElementById('sidebarLogoText').style.display = 'flex';

  document.getElementById('logoPreviewImg').style.display = 'none';
  document.getElementById('logoPreviewText').style.display = 'flex';

  document.getElementById('removeLogo').style.display = 'none';
}

document.getElementById('logoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Arquivo muito grande (máx. 2MB)', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    const logoUrl = event.target.result;
    currentLogoUrl = logoUrl;

    await database.ref('settings/logo').set({
      url: logoUrl,
      uploadDate: new Date().toISOString(),
      uploadedBy: currentUser.nome
    });

    updateLogoDisplay(logoUrl);
    showToast('Logo atualizada com sucesso!');
  };
  reader.readAsDataURL(file);
});

document.getElementById('removeLogo').addEventListener('click', async () => {
  if (confirm('Tem certeza que deseja remover a logo?')) {
    await database.ref('settings/logo').remove();
    currentLogoUrl = null;
    clearLogoDisplay();
    showToast('Logo removida com sucesso!');
  }
});

// Auto Login
async function autoLogin() {
  const savedUserId = localStorage.getItem('currentUserId');
  if (savedUserId) {
    const snapshot = await database.ref(`users/${savedUserId}`).once('value');
    if (snapshot.exists()) {
      const userData = { id: savedUserId, ...snapshot.val() };
      loginUser(userData);
    } else {
      localStorage.removeItem('currentUserId');
    }
  }
}

// Login
function loginUser(userData) {
  currentUser = userData;
  localStorage.setItem('currentUserId', userData.id);

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';

  // Update user info
  const initial = userData.nome.charAt(0).toUpperCase();
  document.getElementById('userAvatarMobile').textContent = initial;
  document.getElementById('userNameMobile').textContent = userData.nome;
  document.getElementById('userRoleMobile').textContent = userData.tipo === 'admin' ? 'Administrador' : 'Técnico';

  document.getElementById('userAvatarDesktop').textContent = initial;
  document.getElementById('userNameDesktop').textContent = userData.nome;
  document.getElementById('userRoleDesktop').textContent = userData.tipo === 'admin' ? 'Administrador' : 'Técnico';

  // Show desktop sidebar on desktop
  if (window.innerWidth >= 1024) {
    document.getElementById('sidebarDesktop').style.display = 'flex';
  }

  loadDashboard();
  loadLogo();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  const usersRef = database.ref('users');
  const snapshot = await usersRef.once('value');
  const users = snapshot.val();

  let authenticated = false;
  let userData = null;

  for (let key in users) {
    if (users[key].username === username && users[key].password === password) {
      authenticated = true;
      userData = { id: key, ...users[key] };
      break;
    }
  }

  if (authenticated) {
    loginUser(userData);
    showToast('Login realizado com sucesso!');
  } else {
    showToast('Usuário ou senha incorretos', 'error');
  }
});

// Logout
document.getElementById('logoutBtnMobile').addEventListener('click', logout);
document.getElementById('logoutBtnDesktop').addEventListener('click', logout);

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUserId');

  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginForm').reset();
  showToast('Logout realizado com sucesso!');
}

// Navigation - Mobile
document.querySelectorAll('.nav-item-mobile').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    navigateToSection(section);

    document.querySelectorAll('.nav-item-mobile').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
  });
});

// Navigation - Desktop
document.querySelectorAll('.nav-item-desktop').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    navigateToSection(section);

    document.querySelectorAll('.nav-item-desktop').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
  });
});

function navigateToSection(section) {
  
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

  const el = document.getElementById(section + 'Section');
  if (el) {
    el.classList.add('active');
  }

  if (section === 'overview') loadDashboard();
  else if (section === 'companies') loadCompanies();
  else if (section === 'inspections') loadInspections();
  else if (section === 'orders') loadOrders();
  else if (section === 'calendar') initCalendar();
  else if (section === 'config') loadConfig();
}


// Load Dashboard
async function loadDashboard() {
  const companiesSnapshot = await database.ref('companies').once('value');
  const buildingsSnapshot = await database.ref('buildings').once('value');
  const inspectionsSnapshot = await database.ref('inspections').once('value');

  const companies = companiesSnapshot.val() || {};
  const buildings = buildingsSnapshot.val() || {};
  const inspections = inspectionsSnapshot.val() || {};

  const totalCompanies = Object.keys(companies).length;
  const totalBuildings = Object.keys(buildings).length;
  const totalInspections = Object.keys(inspections).length;
  const pendingInspections = Object.values(inspections).filter(i => !i.completed).length;

  document.getElementById('totalCompanies').textContent = totalCompanies + totalBuildings;
  document.getElementById('totalInspections').textContent = totalInspections;
  document.getElementById('pendingInspections').textContent = pendingInspections;
}


/* ==========================================================
   FUNÇÃO PRINCIPAL PARA CARREGAR EMPRESAS E PRÉDIOS
========================================================== */
// Variáveis de paginação
let currentCompanyPage = 1;
let currentBuildingPage = 1;
const itemsPerPage = 10;

// Variáveis de controle de expansão
let companiesExpanded = true;
let buildingsExpanded = true;

async function loadCompanies() {
  const list = document.getElementById('companiesList');

  const [companiesSnapshot, buildingsSnapshot] = await Promise.all([
    database.ref('companies').once('value'),
    database.ref('buildings').once('value')
  ]);

  const companies = companiesSnapshot.val() || {};
  const buildings = buildingsSnapshot.val() || {};

  // Limpa a lista para reconstruir toda vez
  list.innerHTML = '';

  const totalItems =
    Object.keys(companies).length + Object.keys(buildings).length;

  if (totalItems === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-building"></i>
        <p>Nenhuma empresa ou prédio cadastrado</p>
      </div>
    `;
    return;
  }

  // ================= EMPRESAS =================
  if (Object.keys(companies).length > 0) {
    const totalCompanies = Object.keys(companies).length;
    
    const empresasSeparator = document.createElement('div');
    empresasSeparator.style.cssText = `
      display: flex;
      align-items: center;
      margin: 30px 0;
      position: relative;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    empresasSeparator.onclick = () => toggleCompanies();

    empresasSeparator.innerHTML = `
      <div style="flex: 1; height: 2px; background: linear-gradient(to right, transparent, #D4C29A); box-shadow: 0 0 6px rgba(212, 194, 154, 0.35);"></div>
      <div style="position: relative; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); border-radius: 40px; padding: 14px 36px; margin: 0 20px; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55), inset 0 2px 4px rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(212, 194, 154, 0.25); display: flex; align-items: center; gap: 12px; overflow: hidden;">
        <div style="position: relative; z-index: 2; background: linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(212, 194, 154, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.25);">
          <i class="fas fa-briefcase" style="color: #0d0d0d; font-size: 18px;"></i>
        </div>
        <div style="position: relative; z-index: 2; display: flex; align-items: center; gap: 12px;">
          <div style="color: #D4C29A; font-size: 18px; font-weight: 900; letter-spacing: 1.2px; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);">EMPRESAS</div>
          <div style="background: rgba(212, 194, 154, 0.2); padding: 4px 12px; border-radius: 20px; color: #D4C29A; font-size: 14px; font-weight: bold;">${totalCompanies}</div>
        </div>
        <div style="position: relative; z-index: 2; margin-left: 8px;">
          <i class="fas fa-chevron-${companiesExpanded ? 'up' : 'down'}" style="color: #D4C29A; font-size: 16px;"></i>
        </div>
      </div>
      <div style="flex: 1; height: 2px; background: linear-gradient(to left, transparent, #D4C29A); box-shadow: 0 0 6px rgba(212, 194, 154, 0.35);"></div>
    `;
    list.appendChild(empresasSeparator);

    // Container para as empresas
    const companiesContainer = document.createElement('div');
    companiesContainer.id = 'companiesContainer';
    companiesContainer.style.display = companiesExpanded ? 'block' : 'none';
    companiesContainer.style.transition = 'all 0.3s ease';

    if (companiesExpanded) {
      // Paginação de empresas
      const companiesArray = Object.entries(companies);
      const totalCompanyPages = Math.ceil(companiesArray.length / itemsPerPage);
      const startIndex = (currentCompanyPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedCompanies = companiesArray.slice(startIndex, endIndex);

      for (let [key, company] of paginatedCompanies) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
          <div class="list-item-header">
            <div style="flex: 1; min-width: 0; overflow: hidden;">
              <div class="list-item-title" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto; line-height: 1.3;">${company.razao_social}</div>
              <div class="list-item-subtitle">${company.cnpj}</div>
            </div>
          </div>
          <div class="list-item-info">
            <div class="list-item-info-row">
              <span class="list-item-info-label">Telefone:</span>
              <span class="list-item-info-value">${company.telefone || '-'}</span>
            </div>
            <div class="list-item-info-row">
              <span class="list-item-info-label">Número da Empresa:</span>
              <span class="list-item-info-value">${company.numero_empresa || '-'}</span>
            </div>
            <div class="list-item-info-row">
              <span class="list-item-info-label">Responsável:</span>
              <span class="list-item-info-value" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto;">${company.responsavel || '-'}</span>
            </div>
            <div class="list-item-info-row">
              <span class="list-item-info-label">Endereço:</span>
              <span class="list-item-info-value" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto; line-height: 1.4;">${company.endereco || '-'}</span>
            </div>
          </div>
          <div class="list-item-actions">
            <button class="btn-small btn-primary" onclick="startInspection('${key}')">
              <i class="fas fa-clipboard-check"></i> Nova Inspeção
            </button>
            <button
              class="btn-small btn-danger"
              style="background-color:#D4C29A; border-color:#D4C29A; color:#000;"
              onclick="deleteCompany('${key}')">
              <i class="fas fa-trash"></i> Excluir
            </button>
          </div>
        `;
        companiesContainer.appendChild(item);
      }

      // Controles de paginação de empresas
      if (totalCompanyPages > 1) {
        const paginationControls = document.createElement('div');
        paginationControls.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin: 25px 0;
          padding: 20px;
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          flex-wrap: wrap;
        `;

        paginationControls.innerHTML = `
          <button 
            onclick="changeCompanyPage(${currentCompanyPage - 1})"
            ${currentCompanyPage === 1 ? 'disabled' : ''}
            style="
              padding: 10px 20px;
              background: ${currentCompanyPage === 1 ? '#444' : 'linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%)'};
              color: ${currentCompanyPage === 1 ? '#888' : '#0d0d0d'};
              border: none;
              border-radius: 8px;
              cursor: ${currentCompanyPage === 1 ? 'not-allowed' : 'pointer'};
              font-weight: bold;
              box-shadow: ${currentCompanyPage === 1 ? 'none' : '0 3px 10px rgba(212, 194, 154, 0.35)'};
              transition: all 0.3s;
            ">
            <i class="fas fa-chevron-left"></i> Anterior
          </button>
          
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #D4C29A; font-weight: bold; font-size: 14px;">Página</span>
            <input 
              type="number"
              id="companyPageInput"
              min="1"
              max="${totalCompanyPages}"
              value="${currentCompanyPage}"
              onkeypress="if(event.key === 'Enter') { const val = parseInt(this.value); if(val >= 1 && val <= ${totalCompanyPages}) changeCompanyPage(val); }"
              style="
                width: 70px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
                color: #D4C29A;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                outline: none;
                box-shadow: 0 3px 10px rgba(212, 194, 154, 0.2);
              ">
            <span style="color: #D4C29A; font-weight: bold; font-size: 14px;">de ${totalCompanyPages}</span>
            <button 
              onclick="const val = parseInt(document.getElementById('companyPageInput').value); if(val >= 1 && val <= ${totalCompanyPages}) changeCompanyPage(val);"
              style="
                padding: 8px 16px;
                background: linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%);
                color: #0d0d0d;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 3px 10px rgba(212, 194, 154, 0.35);
                transition: all 0.3s;
              ">
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>
          
          <button 
            onclick="changeCompanyPage(${currentCompanyPage + 1})"
            ${currentCompanyPage === totalCompanyPages ? 'disabled' : ''}
            style="
              padding: 10px 20px;
              background: ${currentCompanyPage === totalCompanyPages ? '#444' : 'linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%)'};
              color: ${currentCompanyPage === totalCompanyPages ? '#888' : '#0d0d0d'};
              border: none;
              border-radius: 8px;
              cursor: ${currentCompanyPage === totalCompanyPages ? 'not-allowed' : 'pointer'};
              font-weight: bold;
              box-shadow: ${currentCompanyPage === totalCompanyPages ? 'none' : '0 3px 10px rgba(212, 194, 154, 0.35)'};
              transition: all 0.3s;
            ">
            Próxima <i class="fas fa-chevron-right"></i>
          </button>
        `;
        companiesContainer.appendChild(paginationControls);
      }
    }
    
    list.appendChild(companiesContainer);
  }

  // ================= PRÉDIOS =================
  if (Object.keys(buildings).length > 0) {
    const totalBuildings = Object.keys(buildings).length;
    
    const prediosSeparator = document.createElement('div');
    prediosSeparator.style.cssText = `
      display: flex;
      align-items: center;
      margin: 50px 0 30px 0;
      position: relative;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    prediosSeparator.onclick = () => toggleBuildings();

    prediosSeparator.innerHTML = `
      <div style="flex: 1; height: 2px; background: linear-gradient(to right, transparent, #2ecc71); box-shadow: 0 0 6px rgba(46, 204, 113, 0.35);"></div>
      <div style="position: relative; background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); border-radius: 40px; padding: 14px 36px; margin: 0 20px; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55), inset 0 2px 4px rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(46, 204, 113, 0.25); display: flex; align-items: center; gap: 12px; overflow: hidden;">
        <div style="position: relative; z-index: 2; background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(46, 204, 113, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.25);">
          <i class="fas fa-building" style="color: #0d0d0d; font-size: 18px;"></i>
        </div>
        <div style="position: relative; z-index: 2; display: flex; align-items: center; gap: 12px;">
          <div style="color: #2ecc71; font-size: 18px; font-weight: 900; letter-spacing: 1.2px; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);">PRÉDIOS</div>
          <div style="background: rgba(46, 204, 113, 0.2); padding: 4px 12px; border-radius: 20px; color: #2ecc71; font-size: 14px; font-weight: bold;">${totalBuildings}</div>
        </div>
        <div style="position: relative; z-index: 2; margin-left: 8px;">
          <i class="fas fa-chevron-${buildingsExpanded ? 'up' : 'down'}" style="color: #2ecc71; font-size: 16px;"></i>
        </div>
      </div>
      <div style="flex: 1; height: 2px; background: linear-gradient(to left, transparent, #2ecc71); box-shadow: 0 0 6px rgba(46, 204, 113, 0.35);"></div>
    `;
    list.appendChild(prediosSeparator);

    // Container para os prédios
    const buildingsContainer = document.createElement('div');
    buildingsContainer.id = 'buildingsContainer';
    buildingsContainer.style.display = buildingsExpanded ? 'block' : 'none';
    buildingsContainer.style.transition = 'all 0.3s ease';

    if (buildingsExpanded) {
      // Paginação de prédios
      const buildingsArray = Object.entries(buildings);
      const totalBuildingPages = Math.ceil(buildingsArray.length / itemsPerPage);
      const startIndex = (currentBuildingPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedBuildings = buildingsArray.slice(startIndex, endIndex);

      for (let [key, building] of paginatedBuildings) {
        const item = document.createElement('div');
        item.className = 'list-item list-item-building';
        item.innerHTML = `
          <div class="list-item-header">
            <div style="flex: 1; min-width: 0; overflow: hidden;">
              <div class="list-item-title" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto; line-height: 1.3;">${building.razao_social_predio}</div>
              <div class="list-item-subtitle">${building.cnpj_predio}</div>
            </div>
          </div>
          <div class="list-item-info">
            <div class="list-item-info-row">
              <span class="list-item-info-label">Telefone:</span>
              <span class="list-item-info-value">${building.telefone_predio || '-'}</span>
            </div>
            <div class="list-item-info-row">
              <span class="list-item-info-label">Número do Prédio:</span>
              <span class="list-item-info-value">${building.numero_predio || '-'}</span>
            </div>
            <div class="list-item-info-row">
              <span class="list-item-info-label">Endereço:</span>
              <span class="list-item-info-value" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto; line-height: 1.4;">${building.endereco_predio || '-'}</span>
            </div>
            <div class="list-item-info-row">
              <span class="list-item-info-label">Responsável:</span>
              <span class="list-item-info-value" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto;">${building.responsavel_predio || '-'}</span>
            </div>
          </div>
          <div class="list-item-actions">
            <button class="btn-small btn-primary" onclick="startInspectionBuilding('${key}')">
              <i class="fas fa-clipboard-check"></i> Nova Inspeção
            </button>
            <button
              class="btn-small btn-danger"
              style="background-color:#D4C29A; border-color:#D4C29A; color:#000;"
              onclick="deleteBuilding('${key}')">
              <i class="fas fa-trash"></i> Excluir
            </button>
          </div>
        `;
        buildingsContainer.appendChild(item);
      }

      // Controles de paginação de prédios
      if (totalBuildingPages > 1) {
        const paginationControls = document.createElement('div');
        paginationControls.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin: 25px 0;
          padding: 20px;
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          flex-wrap: wrap;
        `;

        paginationControls.innerHTML = `
          <button 
            onclick="changeBuildingPage(${currentBuildingPage - 1})"
            ${currentBuildingPage === 1 ? 'disabled' : ''}
            style="
              padding: 10px 20px;
              background: ${currentBuildingPage === 1 ? '#444' : 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'};
              color: ${currentBuildingPage === 1 ? '#888' : '#0d0d0d'};
              border: none;
              border-radius: 8px;
              cursor: ${currentBuildingPage === 1 ? 'not-allowed' : 'pointer'};
              font-weight: bold;
              box-shadow: ${currentBuildingPage === 1 ? 'none' : '0 3px 10px rgba(46, 204, 113, 0.35)'};
              transition: all 0.3s;
            ">
            <i class="fas fa-chevron-left"></i> Anterior
          </button>
          
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #2ecc71; font-weight: bold; font-size: 14px;">Página</span>
            <input 
              type="number"
              id="buildingPageInput"
              min="1"
              max="${totalBuildingPages}"
              value="${currentBuildingPage}"
              onkeypress="if(event.key === 'Enter') { const val = parseInt(this.value); if(val >= 1 && val <= ${totalBuildingPages}) changeBuildingPage(val); }"
              style="
                width: 70px;
                padding: 8px 12px;
                background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
                color: #2ecc71;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                outline: none;
                box-shadow: 0 3px 10px rgba(46, 204, 113, 0.2);
              ">
            <span style="color: #2ecc71; font-weight: bold; font-size: 14px;">de ${totalBuildingPages}</span>
            <button 
              onclick="const val = parseInt(document.getElementById('buildingPageInput').value); if(val >= 1 && val <= ${totalBuildingPages}) changeBuildingPage(val);"
              style="
                padding: 8px 16px;
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                color: #0d0d0d;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 3px 10px rgba(46, 204, 113, 0.35);
                transition: all 0.3s;
              ">
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>
          
          <button 
            onclick="changeBuildingPage(${currentBuildingPage + 1})"
            ${currentBuildingPage === totalBuildingPages ? 'disabled' : ''}
            style="
              padding: 10px 20px;
              background: ${currentBuildingPage === totalBuildingPages ? '#444' : 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'};
              color: ${currentBuildingPage === totalBuildingPages ? '#888' : '#0d0d0d'};
              border: none;
              border-radius: 8px;
              cursor: ${currentBuildingPage === totalBuildingPages ? 'not-allowed' : 'pointer'};
              font-weight: bold;
              box-shadow: ${currentBuildingPage === totalBuildingPages ? 'none' : '0 3px 10px rgba(46, 204, 113, 0.35)'};
              transition: all 0.3s;
            ">
            Próxima <i class="fas fa-chevron-right"></i>
          </button>
        `;
        buildingsContainer.appendChild(paginationControls);
      }
    }
    
    list.appendChild(buildingsContainer);
  }
}

// Funções de toggle (colapsar/expandir)
function toggleCompanies() {
  companiesExpanded = !companiesExpanded;
  loadCompanies();
}

function toggleBuildings() {
  buildingsExpanded = !buildingsExpanded;
  loadCompanies();
}

// Funções de mudança de página
function changeCompanyPage(newPage) {
  currentCompanyPage = newPage;
  loadCompanies();
  // Scroll suave para o topo da seção de empresas
  const container = document.getElementById('companiesContainer');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function changeBuildingPage(newPage) {
  currentBuildingPage = newPage;
  loadCompanies();
  // Scroll suave para o topo da seção de prédios
  const container = document.getElementById('buildingsContainer');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Função auxiliar para criar e mostrar o modal de confirmação personalizado
function confirmModal(titulo, mensagem, callback) {
  // Remove modal anterior se existir
  const existingModal = document.getElementById('customConfirmModal');
  if (existingModal) existingModal.remove();

  const modalHtml = `
        <div id="customConfirmModal" style="display: flex; align-items: center; justify-content: center; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px);">
            <div style="background: #1a1a1a; border: 1px solid #D4C29A; padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="color: #D4C29A; font-size: 40px; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: #D4C29A; margin-bottom: 15px; font-family: 'Playfair Display', serif;">${titulo}</h3>
                <p style="color: #ccc; margin-bottom: 25px; line-height: 1.5;">${mensagem}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="btnCancel" style="padding: 12px 20px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; flex: 1;">Cancelar</button>
                    <button id="btnConfirm" style="padding: 12px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; flex: 1;">Excluir</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('customConfirmModal');

  document.getElementById('btnCancel').onclick = () => {
    modal.remove();
  };

  document.getElementById('btnConfirm').onclick = async () => {
    const btn = document.getElementById('btnConfirm');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
    btn.style.pointerEvents = 'none';

    await callback();
    modal.remove();
  };
}

// Função para deletar Empresa (deleta a empresa e seus prédios)
async function deleteCompany(id) {
  confirmModal(
    'Excluir Empresa',
    'Isso excluirá permanentemente a empresa e TODOS os prédios vinculados a ela. Deseja continuar?',
    async () => {
      try {
        // 1. Remove a empresa
        await database.ref('companies/' + id).remove();

        // 2. Busca e remove prédios vinculados
        const buildingsSnapshot = await database.ref('buildings').once('value');
        const buildings = buildingsSnapshot.val();

        if (buildings) {
          const updates = {};
          Object.entries(buildings).forEach(([bid, bData]) => {
            // Verifica se o prédio pertence a esta empresa (ajuste o nome do campo se necessário)
            if (bData.companyId === id || bData.empresaId === id) {
              updates[`/buildings/${bid}`] = null;
            }
          });
          await database.ref().update(updates);
        }

        showToast('Empresa e dependências excluídas!');

        // Se não estiver usando .on('value'), recarregue a lista:
        if (typeof loadCompanies === 'function') loadCompanies();
        if (typeof loadDashboard === 'function') loadDashboard();

      } catch (error) {
        showToast('Erro técnico ao excluir empresa');
      }
    }
  );
}

// Função para deletar apenas o Prédio
async function deleteBuilding(id) {
  confirmModal(
    'Excluir Prédio',
    'Deseja realmente remover este prédio do sistema?',
    async () => {
      try {
        await database.ref('buildings/' + id).remove();
        showToast('Prédio excluído com sucesso!');

        if (typeof loadCompanies === 'function') loadCompanies();
        if (typeof loadDashboard === 'function') loadDashboard();
      } catch (error) {
        showToast('Erro ao excluir prédio');
      }
    }
  );
}
// Função auxiliar para criar e mostrar o modal de confirmação personalizado
function confirmModal(titulo, mensagem, callback) {
  // Remove modal anterior se existir
  const existingModal = document.getElementById('customConfirmModal');
  if (existingModal) existingModal.remove();

  const modalHtml = `
        <div id="customConfirmModal" style="display: flex; align-items: center; justify-content: center; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px);">
            <div style="background: #1a1a1a; border: 1px solid #D4C29A; padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="color: #D4C29A; font-size: 40px; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: #D4C29A; margin-bottom: 15px; font-family: 'Playfair Display', serif;">${titulo}</h3>
                <p style="color: #ccc; margin-bottom: 25px; line-height: 1.5;">${mensagem}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="btnCancel" style="padding: 12px 20px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; flex: 1;">Cancelar</button>
                    <button id="btnConfirm" style="padding: 12px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; flex: 1;">Excluir</button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('customConfirmModal');

  document.getElementById('btnCancel').onclick = () => {
    modal.remove();
  };

  document.getElementById('btnConfirm').onclick = async () => {
    const btn = document.getElementById('btnConfirm');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
    btn.style.pointerEvents = 'none';

    await callback();
    modal.remove();
  };
}

// Função para deletar Empresa (deleta a empresa e seus prédios)
async function deleteCompany(id) {
  confirmModal(
    'Excluir Empresa',
    'Isso excluirá permanentemente a empresa e TODOS os prédios vinculados a ela. Deseja continuar?',
    async () => {
      try {
        // 1. Remove a empresa
        await database.ref('companies/' + id).remove();

        // 2. Busca e remove prédios vinculados
        const buildingsSnapshot = await database.ref('buildings').once('value');
        const buildings = buildingsSnapshot.val();

        if (buildings) {
          const updates = {};
          Object.entries(buildings).forEach(([bid, bData]) => {
            // Verifica se o prédio pertence a esta empresa (ajuste o nome do campo se necessário)
            if (bData.companyId === id || bData.empresaId === id) {
              updates[`/buildings/${bid}`] = null;
            }
          });
          await database.ref().update(updates);
        }

        showToast('Empresa e dependências excluídas!');

        // Se não estiver usando .on('value'), recarregue a lista:
        if (typeof loadCompanies === 'function') loadCompanies();
        if (typeof loadDashboard === 'function') loadDashboard();

      } catch (error) {
        showToast('Erro técnico ao excluir empresa');
      }
    }
  );
}

// Função para deletar apenas o Prédio
async function deleteBuilding(id) {
  confirmModal(
    'Excluir Prédio',
    'Deseja realmente remover este prédio do sistema?',
    async () => {
      try {
        await database.ref('buildings/' + id).remove();
        showToast('Prédio excluído com sucesso!');

        if (typeof loadCompanies === 'function') loadCompanies();
        if (typeof loadDashboard === 'function') loadDashboard();
      } catch (error) {
        showToast('Erro ao excluir prédio');
      }
    }
  );
}








// Add Company
document.getElementById('addCompanyBtn').addEventListener('click', () => {
  openModal('addCompanyModal');
});

// Manual Inspection
document.getElementById('manualInspectionBtn').addEventListener('click', () => {
  openModal('inspectionFormModal');
  // Clear form for manual entry
  document.getElementById('inspectionForm').reset();
});

document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const companyData = Object.fromEntries(formData);

  await database.ref('companies').push(companyData);

  showToast('Empresa cadastrada com sucesso!');
  closeModal('addCompanyModal');
  e.target.reset();
  loadCompanies();
  loadDashboard();
});

// Start Inspection
async function startInspection(companyId) {
  const snapshot = await database.ref(`companies/${companyId}`).once('value');
  const company = snapshot.val();

  openModal('inspectionFormModal');

  setTimeout(() => {
    // Preenche dados da empresa
    document.querySelector('input[name="razao_social"]').value = company.razao_social;
    document.querySelector('input[name="cnpj"]').value = company.cnpj;
    document.querySelector('input[name="telefone"]').value = company.telefone || '';
    document.querySelector('input[name="cep"]').value = company.cep || '';
    document.querySelector('input[name="endereco"]').value = company.endereco || '';
    document.querySelector('input[name="responsavel"]').value = company.responsavel || '';

    // EXIBE o número da empresa e OCULTA o do prédio
    const rowEmpresa = document.getElementById('rowNumeroEmpresa');
    const rowPredio = document.getElementById('rowNumeroPredio');

    if (rowEmpresa) rowEmpresa.style.display = 'flex';
    if (rowPredio) rowPredio.style.display = 'none';

    // Garante que o valor apareça no input
    document.querySelector('input[name="numero_empresa"]').value = company.numero_empresa || '';
    // Limpa o campo do prédio para não misturar
    const inputPredio = document.querySelector('input[name="numero_predio"]');
    if (inputPredio) inputPredio.value = '';

    // Define o tipo explicitamente
    window.currentInspectionType = 'empresa';
  }, 200);
}



// Add Building Form Submit
document.getElementById('addBuildingForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const buildingData = Object.fromEntries(formData);

  // Salva no Firebase
  await database.ref('buildings').push(buildingData);

  showToast('Prédio cadastrado com sucesso!');
  closeModal('addCompanyModal');
  e.target.reset();

  // ALTERAÇÃO AQUI:
  // Use loadCompanies() pois ela é a responsável por renderizar a lista no DOM
  loadCompanies();
  loadDashboard();
});

// Start Inspection for Building
async function startInspectionBuilding(buildingId) {
  const snapshot = await database.ref(`buildings/${buildingId}`).once('value');
  const building = snapshot.val();

  openModal('inspectionFormModal');

  setTimeout(() => {
    document.querySelector('input[name="razao_social"]').value = building.razao_social_predio;
    document.querySelector('input[name="cnpj"]').value = building.cnpj_predio;
    document.querySelector('input[name="telefone"]').value = building.telefone_predio || '';
    document.querySelector('input[name="cep"]').value = building.cep_predio || '';
    document.querySelector('input[name="endereco"]').value = building.endereco_predio || '';
    document.querySelector('input[name="responsavel"]').value = building.responsavel_predio || '';

    // OCULTA o número da empresa e EXIBE o do prédio
    const rowEmpresa = document.getElementById('rowNumeroEmpresa');
    const rowPredio = document.getElementById('rowNumeroPredio');

    if (rowEmpresa) rowEmpresa.style.display = 'none';
    if (rowPredio) rowPredio.style.display = 'flex';

    document.querySelector('input[name="numero_predio"]').value = building.numero_predio || '';
    // Limpa o campo da empresa
    const inputEmpresa = document.querySelector('input[name="numero_empresa"]');
    if (inputEmpresa) inputEmpresa.value = '';

    window.currentInspectionType = 'predio';
  }, 200);
}



// Inspection Tabs
document.querySelectorAll('.inspection-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const section = tab.dataset.section;

    document.querySelectorAll('.inspection-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.inspection-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
  });
});

// Conditional Sections
document.getElementById('hasBombas').addEventListener('change', (e) => {
  document.getElementById('bombasSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasBombaJockey').addEventListener('change', (e) => {
  document.getElementById('bombaJockeySection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasHidrantes').addEventListener('change', (e) => {
  document.getElementById('hidrantesSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasAlarme').addEventListener('change', (e) => {
  document.getElementById('alarmeSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasExtintores').addEventListener('change', (e) => {
  document.getElementById('extintoresSection').classList.toggle('visible', e.target.checked);
});

document.getElementById('hasSinalizacao').addEventListener('change', (e) => {
  document.getElementById('sinalizacaoSection').classList.toggle('visible', e.target.checked);
});


// PDF GENERATORS - Um para cada tipo de inspeção

// 1. PDF COMPLETO
function generateCompletePDF(data) {
  const isMobile = window.innerWidth <= 768;
  let html = '';

  if (isMobile) {
    // ============================================
    // MODO MOBILE - UMA INSPEÇÃO POR PÁGINA
    // ============================================

    // -------------------------------------
    // Página 1 - Cliente e Certificado
    // -------------------------------------
    html += `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
    html += generateClientSection(data);

    if (data.cert_tipo) {
      html += generateCertificateSection(data);
    }

    html += generatePDFFooter();
    html += `</div>`;


    // -------------------------------------
    // Página 2 - Bombas (se existir)
    // -------------------------------------
    if (data.has_bombas) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateBombasSection(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página 3 - Hidrantes (se existir)
    // -------------------------------------
    if (data.has_hidrantes) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateHidrantesSection(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página 4 - Alarme (se existir)
    // -------------------------------------
    if (data.has_alarme) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateAlarmeSection(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Extintores (se existir) - SEM wrapper, pois a função já controla a paginação
    // -------------------------------------
    if (data.has_extintores) {
      html += generateExtintoresSection(data);
    }


    // -------------------------------------
    // Página 6 e 7 - Sinalização (somente se existir)
    // -------------------------------------
    if (data.has_sinalizacao) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateSinalizacaoSection_Parte1(data);
      html += generatePDFFooter();
      html += `</div>`;

      // -------------------------------------
      // Página 7 - Sinalização PARTE 2
      // -------------------------------------
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateSinalizacaoSection_Parte2(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página Final - Conformidade + Assinatura
    // -------------------------------------
    html += `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
    html += generateConformidadeSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;

  } else {
    // ============================================
    // MODO DESKTOP - INSPEÇÕES AGRUPADAS
    // ============================================

    // -------------------------------------
    // Página 1 - Cliente e Certificado
    // -------------------------------------
    html += `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
    html += generateClientSection(data);

    if (data.cert_tipo) {
      html += generateCertificateSection(data);
    }

    html += generatePDFFooter();
    html += `</div>`;


    // -------------------------------------
    // Página 2 - Bombas e Hidrantes (somente se existir)
    // -------------------------------------
    if (data.has_bombas || data.has_hidrantes) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');

      if (data.has_bombas) {
        html += generateBombasSection(data);
      }

      if (data.has_hidrantes) {
        html += generateHidrantesSection(data);
      }

      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página 3 - Alarme (somente se existir)
    // -------------------------------------
    if (data.has_alarme) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateAlarmeSection(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Extintores (somente se existir) - SEM wrapper, pois a função já controla a paginação
    // -------------------------------------
    if (data.has_extintores) {
      html += generateExtintoresSection(data);
    }


    // -------------------------------------
    // Página 4 - Sinalização (somente se existir)
    // -------------------------------------
    if (data.has_sinalizacao) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateSinalizacaoSection(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página Final - Conformidade + Assinatura
    // -------------------------------------
    html += `<div class="pdf-page">`;
    html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
    html += generateConformidadeSection(data);
    html += generateSignaturesSection(data);
    html += generatePDFFooter();
    html += `</div>`;
  }

  return html;
}





// PARTE 1 - Rota de Fuga
function generateSinalizacaoSection_Parte1(data) {
  let html = `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-sign"></i> Sinalização - Parte 1
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Placas Fotoluminescentes:</div>
            <div class="pdf-field-value">${data.placas_fotoluminescentes === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
      `;

  // Rota de Fuga - só mostra se tiver quantidade
  if (data.sinal_saida && parseInt(data.sinal_saida) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Saída:</div><div class="pdf-field-value">${data.sinal_saida}</div></div>`;
  }
  if (data.sinal_cam_direita && parseInt(data.sinal_cam_direita) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Direita:</div><div class="pdf-field-value">${data.sinal_cam_direita}</div></div>`;
  }
  if (data.sinal_cam_esquerda && parseInt(data.sinal_cam_esquerda) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Esquerda:</div><div class="pdf-field-value">${data.sinal_cam_esquerda}</div></div>`;
  }
  if (data.sinal_esc_up_direita && parseInt(data.sinal_esc_up_direita) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Direita:</div><div class="pdf-field-value">${data.sinal_esc_up_direita}</div></div>`;
  }
  if (data.sinal_esc_up_esquerda && parseInt(data.sinal_esc_up_esquerda) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_up_esquerda}</div></div>`;
  }
  if (data.sinal_esc_down_direita && parseInt(data.sinal_esc_down_direita) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Direita:</div><div class="pdf-field-value">${data.sinal_esc_down_direita}</div></div>`;
  }
  if (data.sinal_esc_down_esquerda && parseInt(data.sinal_esc_down_esquerda) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_down_esquerda}</div></div>`;
  }

  html += `</div>`;
  return html;
}

// PARTE 2 - Hidrantes, Acionadores e Placas Específicas
function generateSinalizacaoSection_Parte2(data) {
  let html = `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-sign"></i> Sinalização - Parte 2
          </div>
      `;

  // Sinalização de Hidrantes
  if (data.sinal_hidrante && parseInt(data.sinal_hidrante) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.sinal_hidrante}</div></div>`;
  }

  // Sinalização de Acionadores
  if (data.sinal_acion_bomba && parseInt(data.sinal_acion_bomba) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Bomba:</div><div class="pdf-field-value">${data.sinal_acion_bomba}</div></div>`;
  }
  if (data.sinal_acion_alarme && parseInt(data.sinal_acion_alarme) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Alarme:</div><div class="pdf-field-value">${data.sinal_acion_alarme}</div></div>`;
  }
  if (data.sinal_central_alarme && parseInt(data.sinal_central_alarme) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Central de Alarme:</div><div class="pdf-field-value">${data.sinal_central_alarme}</div></div>`;
  }
  if (data.sinal_bomba_incendio && parseInt(data.sinal_bomba_incendio) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Bomba de Incêndio:</div><div class="pdf-field-value">${data.sinal_bomba_incendio}</div></div>`;
  }

  // Placas Específicas
  if (data.placa_lotacao && parseInt(data.placa_lotacao) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Placa de Lotação (Nº Pessoas):</div><div class="pdf-field-value">${data.placa_lotacao}</div></div>`;
  }
  if (data.placa_m1 && parseInt(data.placa_m1) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Placa M1:</div><div class="pdf-field-value">${data.placa_m1}</div></div>`;
  }
  if (data.placa_extintor && parseInt(data.placa_extintor) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Extintor:</div><div class="pdf-field-value">${data.placa_extintor}</div></div>`;
  }
  if (data.placa_ilum_emerg && parseInt(data.placa_ilum_emerg) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Iluminação de Emergência:</div><div class="pdf-field-value">${data.placa_ilum_emerg}</div></div>`;
  }
  if (data.placa_sinal_emerg && parseInt(data.placa_sinal_emerg) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Sinalização de Emergência:</div><div class="pdf-field-value">${data.placa_sinal_emerg}</div></div>`;
  }
  if (data.placa_alarme && parseInt(data.placa_alarme) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Alarme de Incêndio:</div><div class="pdf-field-value">${data.placa_alarme}</div></div>`;
  }
  if (data.placa_hidrante_espec && parseInt(data.placa_hidrante_espec) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.placa_hidrante_espec}</div></div>`;
  }

  html += `</div>`;
  return html;
}
// 2. PDF BOMBAS
function generateBombasPDF(data) {
  let html = `<div class="pdf-page">`;
  html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - SISTEMA DE BOMBAS');
  html += generateClientSection(data);
  html += generateBombasSection(data);
  html += generateSignaturesSection(data);
  html += generatePDFFooter();
  html += `</div>`;
  return html;
}

// 3. PDF HIDRANTES
function generateHidrantesPDF(data) {
  let html = `<div class="pdf-page">`;
  html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - REDE DE HIDRANTES');
  html += generateClientSection(data);
  html += generateHidrantesSection(data);
  html += generateSignaturesSection(data);
  html += generatePDFFooter();
  html += `</div>`;
  return html;
}

// 4. PDF ALARME
function generateAlarmePDF(data) {
  let html = `<div class="pdf-page">`;
  html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - SISTEMA DE ALARME');
  html += generateClientSection(data);
  html += generateAlarmeSection(data);
  html += generateSignaturesSection(data);
  html += generatePDFFooter();
  html += `</div>`;
  return html;
}

// 5. PDF EXTINTORES
function generateExtintoresPDF(data) {
  let html = `<div class="pdf-page">`;
  html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - EXTINTORES');
  html += generateClientSection(data);
  html += generateExtintoresSection(data);
  html += generateSignaturesSection(data);
  html += generatePDFFooter();
  html += `</div>`;
  return html;
}

// 6. PDF SINALIZAÇÃO
function generateSinalizacaoPDF(data) {
  let html = `<div class="pdf-page">`;
  html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - SINALIZAÇÃO');
  html += generateClientSection(data);
  html += generateSinalizacaoSection(data);
  html += generateSignaturesSection(data);
  html += generatePDFFooter();
  html += `</div>`;
  return html;
}

// FUNÇÕES AUXILIARES PARA GERAR SEÇÕES

function generatePDFHeader(title) {
  return `
    <div class="pdf-header">
      <div class="pdf-logo">
        ${currentLogoUrl ? `<img src="${currentLogoUrl}" alt="">` : '<div class="pdf-logo-text">EXTINMAIS</div>'}
      </div>
      <div class="pdf-title-section">
        <div class="pdf-main-title">${title}</div>
        <div class="pdf-subtitle">Sistema de Prevenção e Combate a Incêndio</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px; font-weight: normal;">CNPJ: 52.026.476/001-3</div>
                <div style="font-size: 10px; color: #666; margin-top: 4px; font-weight: normal;">Tel: 15 99137-1232</div>

      </div>
    </div>
  `;
}

function generateClientSection(data) {
  // Verifica se é prédio ou empresa
  const isPredio = data.tipo === 'predio' || !!data.razao_social_predio;

  // Define os valores com fallback
  const razaoSocial = isPredio
    ? (data.razao_social_predio || data.razao_social || '-')
    : (data.razao_social || '-');
  const cnpj = isPredio
    ? (data.cnpj_predio || data.cnpj || '-')
    : (data.cnpj || '-');
  const telefone = isPredio
    ? (data.telefone_predio || data.telefone || '-')
    : (data.telefone || '-');
  const cep = isPredio
    ? (data.cep_predio || data.cep || '-')
    : (data.cep || '-');
  const endereco = isPredio
    ? (data.endereco_predio || data.endereco || '-')
    : (data.endereco || '-');
  const responsavel = isPredio
    ? (data.responsavel_predio || data.responsavel || '-')
    : (data.responsavel || '-');
  const numeroPredio = data.numero_predio || '';
  const numeroEmpresa = data.numero_empresa || '';

  const labelRazao = isPredio ? 'Nome do Prédio' : 'Razão Social';
  const icone = isPredio ? 'fa-building' : 'fa-briefcase';

  return `
    <div class="pdf-section">
      <div class="pdf-section-title">
        <i class="fas ${icone}"></i> Dados do Cliente
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">${labelRazao}:</div>
        <div class="pdf-field-value">${razaoSocial}</div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">CNPJ:</div>
        <div class="pdf-field-value">${cnpj}</div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Telefone:</div>
        <div class="pdf-field-value">${telefone}</div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">CEP:</div>
        <div class="pdf-field-value">${cep}</div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Endereço:</div>
        <div class="pdf-field-value">${endereco}</div>
      </div>

      ${isPredio && numeroPredio ? `
        <div class="pdf-field">
          <div class="pdf-field-label">Número do Prédio:</div>
          <div class="pdf-field-value">${numeroPredio}</div>
        </div>
      ` : ''}

      ${!isPredio && numeroEmpresa ? `
        <div class="pdf-field">
          <div class="pdf-field-label">Número da Empresa:</div>
          <div class="pdf-field-value">${numeroEmpresa}</div>
        </div>
      ` : ''}

      <div class="pdf-field">
        <div class="pdf-field-label">Responsável:</div>
        <div class="pdf-field-value">${responsavel}</div>
      </div>
    </div>
  `;
}





function generateCertificateSection(data) {
  return `
    <div class="pdf-section">
      <div class="pdf-section-title">
        <i class="fas fa-certificate"></i> Certificado AVCB/CLCB
      </div>
      <div class="pdf-field">
        <div class="pdf-field-label">Tipo:</div>
        <div class="pdf-field-value">${data.cert_tipo || '-'}</div>
      </div>
      <div class="pdf-field">
        <div class="pdf-field-label">Número:</div>
        <div class="pdf-field-value">${data.cert_numero || '-'}</div>
      </div>
      <div class="pdf-field">
        <div class="pdf-field-label">Data de Início da Validade:</div>
        <div class="pdf-field-value">${data.cert_inicio_validade ? new Date(data.cert_inicio_validade).toLocaleDateString('pt-BR') : '-'}</div>
      </div>
      <div class="pdf-field">
        <div class="pdf-field-label">Validade:</div>
        <div class="pdf-field-value">${data.cert_validade ? new Date(data.cert_validade).toLocaleDateString('pt-BR') : '-'}</div>
      </div>
    </div>
  `;
}



function generateBombasSection(data) {
  let html = `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-water"></i> Sistema de Bombas
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Reservatório (L):</div>
            <div class="pdf-field-value">${data.reservatorio_tamanho || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Bomba Principal - Potência:</div>
            <div class="pdf-field-value">${data.bomba_principal_potencia || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Teste de Partida:</div>
            <div class="pdf-field-value">${data.bomba_principal_teste === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Estado Geral:</div>
            <div class="pdf-field-value">${data.bomba_principal_estado || '-'}</div>
          </div>
      `;

  if (data.has_bomba_jockey) {
    html += `
          <div class="pdf-field">
            <div class="pdf-field-label">Bomba Jockey - Potência:</div>
            <div class="pdf-field-value">${data.jockey_potencia || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Partida Automática:</div>
            <div class="pdf-field-value">${data.jockey_partida === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Pressostato Ajustado:</div>
            <div class="pdf-field-value">${data.jockey_pressostato === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Sem Ruídos:</div>
            <div class="pdf-field-value">${data.jockey_ruidos === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
        `;
  }

  html += `</div>`;
  return html;
}

function generateHidrantesSection(data) {
  return `
    <div class="pdf-section">
      <div class="pdf-section-title">
        <i class="fas fa-truck-droplet"></i> Rede de Hidrantes
      </div>

      <div class="pdf-columns">
        <div class="pdf-column">
          <div class="pdf-field">
            <div class="pdf-field-label">Diâmetro da Tubulação:</div>
            <div class="pdf-field-value">${data.hidrantes_diametro || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Quantidade de Pontos:</div>
            <div class="pdf-field-value">${data.hidrantes_quantidade || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Suportes Firmes:</div>
            <div class="pdf-field-value">${data.hidrantes_suportes === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Sem Vazamentos:</div>
            <div class="pdf-field-value">${data.hidrantes_vazamentos === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Identificação Conforme Norma:</div>
            <div class="pdf-field-value">${data.hidrantes_identificacao === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Adaptador Storz:</div>
            <div class="pdf-field-value">${data.adaptador_storz || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Material do Adaptador:</div>
            <div class="pdf-field-value">${data.adaptador_material || '-'}</div>
          </div>
        </div>

        <div class="pdf-column">
          <div class="pdf-field">
            <div class="pdf-field-label">Esguicho:</div>
            <div class="pdf-field-value">${data.esguicho_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Material do Esguicho:</div>
            <div class="pdf-field-value">${data.esguicho_material || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Chave Storz:</div>
            <div class="pdf-field-value">${data.chave_storz || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Material da Chave:</div>
            <div class="pdf-field-value">${data.chave_material || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Tipo de Mangueira:</div>
            <div class="pdf-field-value">${data.mangueira_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Diâmetro da Mangueira:</div>
            <div class="pdf-field-value">${data.mangueira_diametro || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Comprimento da Mangueira:</div>
            <div class="pdf-field-value">${data.mangueira_comprimento ? data.mangueira_comprimento + ' metros' : '-'}</div>
          </div>
        </div>
      </div>

      <div class="pdf-columns">
        <div class="pdf-column">
          <div class="pdf-field">
            <div class="pdf-field-label">Possui Hidrante RR:</div>
            <div class="pdf-field-value">${data.hidrante_rr_possui || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Possui Adaptador:</div>
            <div class="pdf-field-value">${data.hidrante_rr_adaptador || '-'}</div>
          </div>
        </div>
        <div class="pdf-column">
          <div class="pdf-field">
            <div class="pdf-field-label">Medida do Adaptador:</div>
            <div class="pdf-field-value">${data.hidrante_rr_medida || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Observações:</div>
            <div class="pdf-field-value">${data.hidrante_rr_observacoes || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}



function generateAlarmeSection(data) {
  return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-bell"></i> Sistema de Alarme
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Quantidade de Pontos:</div>
            <div class="pdf-field-value">${data.alarme_pontos || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Tipo de Central:</div>
            <div class="pdf-field-value">${data.alarme_central_tipo || '-'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Central Liga:</div>
            <div class="pdf-field-value">${data.central_liga ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Sem Falhas:</div>
            <div class="pdf-field-value">${data.central_sem_falhas ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Baterias Testadas:</div>
            <div class="pdf-field-value">${data.central_baterias_testadas ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Detectores (Qtd):</div>
            <div class="pdf-field-value">${data.detectores_quantidade || '-'}</div>
          </div>
        </div>
      `;
}

// ========================================
// FUNÇÃO AUXILIAR - COLETAR TODOS OS EXTINTORES
// ========================================
function getAllExtintores(data) {
  const extintores = [];

  Object.keys(data).forEach(key => {
    const match = key.match(/^extintores_tipo_(\d+)$/);
    if (!match) return;

    const i = match[1];
    extintores.push({
      index: parseInt(i),
      tipo: data[`extintores_tipo_${i}`],
      quantidade: data[`extintores_quantidade_${i}`] ?? data.extintores_quantidade,
      peso: data[`extintores_peso_${i}`] ?? data.extintores_peso,
      validade: data[`extintores_validade_${i}`] ?? data.extintores_validade,
      lacres: data[`extintores_lacres_${i}`],
      manometro: data[`extintores_manometro_${i}`],
      fixacao: data[`extintores_fixacao_${i}`]
    });
  });

  extintores.sort((a, b) => a.index - b.index);

  if (extintores.length === 0 && data.extintores_tipo) {
    extintores.push({
      index: 0,
      tipo: data.extintores_tipo,
      quantidade: data.extintores_quantidade,
      peso: data.extintores_peso,
      validade: data.extintores_validade,
      lacres: data.extintores_lacres,
      manometro: data.extintores_manometro,
      fixacao: data.extintores_fixacao
    });
  }

  return extintores;
}

// ========================================
// GERA CARD DE 1 EXTINTOR (MOBILE)
// ========================================
function generateExtintorCard(ext, numeroGlobal) {
  return `
    <div class="pdf-section">
      <div class="pdf-section-title">
        <i class="fas fa-fire-extinguisher"></i> Extintor ${numeroGlobal} — ${ext.tipo || '-'}
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Quantidade:</div>
        <div class="pdf-field-value">${ext.quantidade || '-'}</div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Peso:</div>
        <div class="pdf-field-value">${ext.peso || '-'}</div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Validade:</div>
        <div class="pdf-field-value">
          ${ext.validade ? new Date(ext.validade).toLocaleDateString('pt-BR') : '-'}
        </div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Lacres Intactos:</div>
        <div class="pdf-field-value">
          ${ext.lacres === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}
        </div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Manômetro OK:</div>
        <div class="pdf-field-value">
          ${ext.manometro === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}
        </div>
      </div>

      <div class="pdf-field">
        <div class="pdf-field-label">Fixação Adequada:</div>
        <div class="pdf-field-value">
          ${ext.fixacao === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}
        </div>
      </div>
    </div>
  `;
}

// ========================================
// GERA GRID DE ATÉ 2 EXTINTORES (DESKTOP)
// ========================================
function generateExtintoresGrid(extintores, startIndex) {
  if (extintores.length === 0) {
    return `
      <div class="pdf-section">
        <div class="pdf-section-title">
          <i class="fas fa-fire-extinguisher"></i> Extintores de Incêndio
        </div>
        <div class="pdf-field-value">Nenhum extintor informado</div>
      </div>
    `;
  }

  return `
    <div class="pdf-section">
      <div class="pdf-section-title">
        <i class="fas fa-fire-extinguisher"></i> Extintores de Incêndio
      </div>

      <div class="pdf-extintores-grid">
        ${extintores.map((ext, idx) => `
          <div class="pdf-extintor-card">
            <div class="pdf-extintor-title">
              Extintor ${startIndex + idx + 1} — ${ext.tipo || '-'}
            </div>

            <div class="pdf-field">
              <div class="pdf-field-label">Quantidade:</div>
              <div class="pdf-field-value">${ext.quantidade || '-'}</div>
            </div>

            <div class="pdf-field">
              <div class="pdf-field-label">Peso:</div>
              <div class="pdf-field-value">${ext.peso || '-'}</div>
            </div>

            <div class="pdf-field">
              <div class="pdf-field-label">Validade:</div>
              <div class="pdf-field-value">
                ${ext.validade ? new Date(ext.validade).toLocaleDateString('pt-BR') : '-'}
              </div>
            </div>

            <div class="pdf-field">
              <div class="pdf-field-label">Lacres Intactos:</div>
              <div class="pdf-field-value">
                ${ext.lacres === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}
              </div>
            </div>

            <div class="pdf-field">
              <div class="pdf-field-label">Manômetro OK:</div>
              <div class="pdf-field-value">
                ${ext.manometro === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}
              </div>
            </div>

            <div class="pdf-field">
              <div class="pdf-field-label">Fixação Adequada:</div>
              <div class="pdf-field-value">
                ${ext.fixacao === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ========================================
// MANTÉM COMPATIBILIDADE COM CÓDIGO ANTIGO
// ========================================
function generateExtintoresSection(data) {
  const isMobile = window.innerWidth <= 768;
  const todosExtintores = getAllExtintores(data);
  let html = '';

  if (todosExtintores.length === 0) {
    return `
      <div class="pdf-section">
        <div class="pdf-section-title">
          <i class="fas fa-fire-extinguisher"></i> Extintores de Incêndio
        </div>
        <div class="pdf-field-value">Nenhum extintor informado</div>
      </div>
    `;
  }

  if (isMobile) {
    // MOBILE: 1 extintor por página
    todosExtintores.forEach((ext, index) => {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateExtintorCard(ext, index + 1);
      html += generatePDFFooter();
      html += `</div>`;
    });
  } else {
    // DESKTOP: 2 extintores por página
    const extintoresPorPagina = 2;
    const totalPaginas = Math.ceil(todosExtintores.length / extintoresPorPagina);

    for (let p = 0; p < totalPaginas; p++) {
      const start = p * extintoresPorPagina;
      const extintoresDessaPagina = todosExtintores.slice(start, start + extintoresPorPagina);

      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
      html += generateExtintoresGrid(extintoresDessaPagina, start);
      html += generatePDFFooter();
      html += `</div>`;
    }
  }

  return html;
}



function generateExtintoresPDF(data) {
  const isMobile = window.innerWidth <= 768;
  const todosExtintores = getAllExtintores(data);
  let html = '';

  if (isMobile) {
    // MOBILE: 1 extintor por página
    todosExtintores.forEach((ext, index) => {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - EXTINTORES');
      if (index === 0) {
        html += generateClientSection(data);
      }
      html += generateExtintorCard(ext, index + 1);
      if (index === todosExtintores.length - 1) {
        html += generateSignaturesSection(data);
      }
      html += generatePDFFooter();
      html += `</div>`;
    });
  } else {
    // DESKTOP: 2 extintores por página
    const extintoresPorPagina = 2;
    const totalPaginas = Math.ceil(todosExtintores.length / extintoresPorPagina);

    for (let p = 0; p < totalPaginas; p++) {
      const start = p * extintoresPorPagina;
      const extintoresDessaPagina = todosExtintores.slice(start, start + extintoresPorPagina);

      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO DE INSPEÇÃO - EXTINTORES');

      if (p === 0) {
        html += generateClientSection(data);
      }

      html += generateExtintoresGrid(extintoresDessaPagina, start);

      if (p === totalPaginas - 1) {
        html += generateSignaturesSection(data);
      }

      html += generatePDFFooter();
      html += `</div>`;
    }
  }

  return html;
}




// Função para DESKTOP - Sinalização completa em uma página
function generateSinalizacaoSection(data) {
  let html = `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-sign"></i> Sinalização
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Placas Fotoluminescentes:</div>
            <div class="pdf-field-value">${data.placas_fotoluminescentes === 'Sim' ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
      `;

  // Rota de Fuga
  if (data.sinal_saida && parseInt(data.sinal_saida) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Saída:</div><div class="pdf-field-value">${data.sinal_saida}</div></div>`;
  }
  if (data.sinal_cam_direita && parseInt(data.sinal_cam_direita) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Direita:</div><div class="pdf-field-value">${data.sinal_cam_direita}</div></div>`;
  }
  if (data.sinal_cam_esquerda && parseInt(data.sinal_cam_esquerda) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Caminhamento → Esquerda:</div><div class="pdf-field-value">${data.sinal_cam_esquerda}</div></div>`;
  }
  if (data.sinal_esc_up_direita && parseInt(data.sinal_esc_up_direita) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Direita:</div><div class="pdf-field-value">${data.sinal_esc_up_direita}</div></div>`;
  }
  if (data.sinal_esc_up_esquerda && parseInt(data.sinal_esc_up_esquerda) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↑ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_up_esquerda}</div></div>`;
  }
  if (data.sinal_esc_down_direita && parseInt(data.sinal_esc_down_direita) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Direita:</div><div class="pdf-field-value">${data.sinal_esc_down_direita}</div></div>`;
  }
  if (data.sinal_esc_down_esquerda && parseInt(data.sinal_esc_down_esquerda) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Escada ↓ Esquerda:</div><div class="pdf-field-value">${data.sinal_esc_down_esquerda}</div></div>`;
  }

  // Sinalização de Hidrantes
  if (data.sinal_hidrante && parseInt(data.sinal_hidrante) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.sinal_hidrante}</div></div>`;
  }

  // Sinalização de Acionadores
  if (data.sinal_acion_bomba && parseInt(data.sinal_acion_bomba) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Bomba:</div><div class="pdf-field-value">${data.sinal_acion_bomba}</div></div>`;
  }
  if (data.sinal_acion_alarme && parseInt(data.sinal_acion_alarme) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Acionamento de Alarme:</div><div class="pdf-field-value">${data.sinal_acion_alarme}</div></div>`;
  }
  if (data.sinal_central_alarme && parseInt(data.sinal_central_alarme) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Central de Alarme:</div><div class="pdf-field-value">${data.sinal_central_alarme}</div></div>`;
  }
  if (data.sinal_bomba_incendio && parseInt(data.sinal_bomba_incendio) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Bomba de Incêndio:</div><div class="pdf-field-value">${data.sinal_bomba_incendio}</div></div>`;
  }

  // Placas Específicas
  if (data.placa_lotacao && parseInt(data.placa_lotacao) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Placa de Lotação (Nº Pessoas):</div><div class="pdf-field-value">${data.placa_lotacao}</div></div>`;
  }
  if (data.placa_m1 && parseInt(data.placa_m1) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Placa M1:</div><div class="pdf-field-value">${data.placa_m1}</div></div>`;
  }
  if (data.placa_extintor && parseInt(data.placa_extintor) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Extintor:</div><div class="pdf-field-value">${data.placa_extintor}</div></div>`;
  }
  if (data.placa_ilum_emerg && parseInt(data.placa_ilum_emerg) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Iluminação de Emergência:</div><div class="pdf-field-value">${data.placa_ilum_emerg}</div></div>`;
  }
  if (data.placa_sinal_emerg && parseInt(data.placa_sinal_emerg) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Sinalização de Emergência:</div><div class="pdf-field-value">${data.placa_sinal_emerg}</div></div>`;
  }
  if (data.placa_alarme && parseInt(data.placa_alarme) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Alarme de Incêndio:</div><div class="pdf-field-value">${data.placa_alarme}</div></div>`;
  }
  if (data.placa_hidrante_espec && parseInt(data.placa_hidrante_espec) > 0) {
    html += `<div class="pdf-field"><div class="pdf-field-label">Hidrante:</div><div class="pdf-field-value">${data.placa_hidrante_espec}</div></div>`;
  }

  html += `</div>`;
  return html;
}





function generateConformidadeSection(data) {
  return `
        <div class="pdf-section">
          <div class="pdf-section-title">
            <i class="fas fa-check-circle"></i> Conformidade Geral
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Rotas Desobstruídas:</div>
            <div class="pdf-field-value">${data.conf_rotas_desobstruidas ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Equipamentos Acessíveis:</div>
            <div class="pdf-field-value">${data.conf_equipamentos_acessiveis ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Limpeza e Organização:</div>
            <div class="pdf-field-value">${data.conf_limpeza ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Conforme Projeto:</div>
            <div class="pdf-field-value">${data.conf_projeto_aprovado ? '<span class="checkmark">✓</span>' : '<span class="crossmark">✗</span>'}</div>
          </div>
          <div class="pdf-field">
            <div class="pdf-field-label">Nº do Projeto:</div>
            <div class="pdf-field-value">${data.numero_projeto || '-'}</div>
          </div>
        </div>
      `;
}

function generateSignaturesSection(data) {
  return `
        <div class="pdf-section" style="margin-top: 40px; page-break-inside: avoid;">
          <div class="pdf-section-title">
            <i class="fas fa-signature"></i> Assinaturas
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
            <div style="text-align: center;">
              <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 60px;">
                <strong style="color: #333;">Assinatura do Técnico</strong>
                <p style="color: #666; font-size: 12px; margin-top: 5px;">${currentUser ? currentUser.nome : 'Técnico Responsável'}</p>
                <p style="color: #666; font-size: 11px;">CNPJ: ${currentUser ? currentUser.cnpj : '__.___.___/____-__'}</p>
              </div>
            </div>
            <div style="text-align: center;">
              <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 60px;">
                <strong style="color: #333;">Assinatura do Cliente</strong>
                <p style="color: #666; font-size: 12px; margin-top: 5px;">${data.responsavel || 'Responsável pela Empresa'}</p>
<p style="color: #666; font-size: 11px;">Endereço: ${data.endereco || 'Endereço não informado'}</p>
              </div>
            </div>
          </div>
        </div>
      `;
}

function generatePDFFooter() {
  return `
        <div class="pdf-footer">
          <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          <p>EXTINMAIS - Sistema de Inspeção de Incêndio</p>
         <p>extinmaiss@outlook.com</p>
        </div>
      `;
}


// Generate Report Button - Show Selection Modal
document.getElementById('generateReportBtn').addEventListener('click', () => {
  const form = document.getElementById('inspectionForm');
  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    if (form.elements[key].type === 'checkbox') {
      data[key] = form.elements[key].checked;
    } else {
      data[key] = value;
    }
  }

  // Adiciona o tipo e os campos específicos de prédio/empresa
  data.tipo = window.ultimaEmpresaCadastrada?.tipo || 'empresa';

  // Se for prédio, adiciona os campos _predio
  if (data.tipo === 'predio' && window.ultimaEmpresaCadastrada) {
    data.razao_social_predio = data.razao_social || window.ultimaEmpresaCadastrada.razao_social_predio;
    data.cnpj_predio = data.cnpj || window.ultimaEmpresaCadastrada.cnpj_predio;
    data.telefone_predio = data.telefone || window.ultimaEmpresaCadastrada.telefone_predio;
    data.responsavel_predio = data.responsavel || window.ultimaEmpresaCadastrada.responsavel_predio;
    data.cep_predio = data.cep || window.ultimaEmpresaCadastrada.cep_predio;
    data.endereco_predio = data.endereco || window.ultimaEmpresaCadastrada.endereco_predio;
    data.numero_predio = data.numero_predio || window.ultimaEmpresaCadastrada.numero_predio;
  }

  currentInspectionData = data;

  // Build PDF selection options
  const grid = document.getElementById('pdfSelectionGrid');
  grid.innerHTML = '';

  const options = [
    { id: 'complete', icon: 'fa-file-alt', title: 'Relatório Completo', desc: 'Todos os sistemas inspecionados' },
  ];

  if (data.has_bombas) {
    options.push({ id: 'bombas', icon: 'fa-water', title: 'Sistema de Bombas', desc: 'Apenas bombas e reservatório' });
  }
  if (data.has_hidrantes) {
    options.push({ id: 'hidrantes', icon: 'fa-truck-droplet', title: 'Rede de Hidrantes', desc: 'Apenas hidrantes e acessórios' });
  }
  if (data.has_alarme) {
    options.push({ id: 'alarme', icon: 'fa-bell', title: 'Sistema de Alarme', desc: 'Apenas alarme e detectores' });
  }
  if (data.has_extintores) {
    options.push({ id: 'extintores', icon: 'fa-fire-extinguisher', title: 'Extintores', desc: 'Apenas extintores' });
  }
  if (data.has_sinalizacao) {
    options.push({ id: 'sinalizacao', icon: 'fa-sign', title: 'Sinalização', desc: 'Apenas placas e sinalização' });
  }

  options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'pdf-option';
    div.innerHTML = `
          <i class="fas ${opt.icon}"></i>
          <div class="pdf-option-content">
            <div class="pdf-option-title">${opt.title}</div>
            <div class="pdf-option-desc">${opt.desc}</div>
          </div>
        `;
    div.onclick = () => generateSelectedPDF(opt.id);
    grid.appendChild(div);
  });

  closeModal('inspectionFormModal');
  openModal('pdfSelectionModal');
});



// Generate Selected PDF
function generateSelectedPDF(type) {
  const data = currentInspectionData;
  let html = '';

  switch (type) {
    case 'complete':
      html = generateCompletePDF(data);
      break;
    case 'bombas':
      html = generateBombasPDF(data);
      break;
    case 'hidrantes':
      html = generateHidrantesPDF(data);
      break;
    case 'alarme':
      html = generateAlarmePDF(data);
      break;
    case 'extintores':
      html = generateExtintoresPDF(data);
      break;
    case 'sinalizacao':
      html = generateSinalizacaoPDF(data);
      break;
  }

  document.getElementById('pdfPreview').innerHTML = html;

  closeModal('pdfSelectionModal');

  document.querySelectorAll('.nav-item-mobile').forEach(nav => nav.classList.remove('active'));
  document.querySelectorAll('.nav-item-desktop').forEach(nav => nav.classList.remove('active'));

  document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById('pdfPreviewSection').classList.add('active');
}

// Finish Inspection
// Finish Inspection
document.getElementById('finishInspectionBtn').addEventListener('click', async () => {
  const button = document.getElementById('finishInspectionBtn');
  button.disabled = true;
  button.innerHTML = '<span class="loading"></span> Finalizando...';

  try {
    const form = document.getElementById('inspectionForm');
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      if (form.elements[key].type === 'checkbox') {
        data[key] = form.elements[key].checked;
      } else {
        data[key] = value;
      }
    }

    // Prepara os dados da inspeção
    const inspectionData = {
      ...data,
      tecnico_id: currentUser.id,
      tecnico_nome: currentUser.nome,
      data: new Date().toISOString(),
      completed: true,
      tipo: window.ultimaEmpresaCadastrada?.tipo || 'empresa'
    };

    // Se for prédio, salva os campos com sufixo _predio
    if (window.ultimaEmpresaCadastrada?.tipo === 'predio') {
      // Copia os dados do formulário para os campos _predio
      inspectionData.razao_social_predio = data.razao_social || window.ultimaEmpresaCadastrada.razao_social_predio;
      inspectionData.cnpj_predio = data.cnpj || window.ultimaEmpresaCadastrada.cnpj_predio;
      inspectionData.telefone_predio = data.telefone || window.ultimaEmpresaCadastrada.telefone_predio;
      inspectionData.responsavel_predio = data.responsavel || window.ultimaEmpresaCadastrada.responsavel_predio;
      inspectionData.cep_predio = data.cep || window.ultimaEmpresaCadastrada.cep_predio;
      inspectionData.endereco_predio = data.endereco || window.ultimaEmpresaCadastrada.endereco_predio;
      inspectionData.numero_predio = data.numero_predio || window.ultimaEmpresaCadastrada.numero_predio;
    }

    await database.ref('inspections').push(inspectionData);

    showToast('Inspeção finalizada com sucesso!');

    closeModal('inspectionFormModal');
    form.reset();
    document.querySelectorAll('.conditional-section').forEach(sec => sec.classList.remove('visible'));

    // Limpa os dados temporários
    window.ultimaEmpresaCadastrada = null;

    setTimeout(() => {
      navigateToSection('inspections');
      document.querySelectorAll('.nav-item-mobile').forEach(nav => {
        if (nav.dataset.section === 'inspections') nav.classList.add('active');
        else nav.classList.remove('active');
      });
      document.querySelectorAll('.nav-item-desktop').forEach(nav => {
        if (nav.dataset.section === 'inspections') nav.classList.add('active');
        else nav.classList.remove('active');
      });
    }, 1000);
  } catch (error) {
    console.error('Error finishing inspection:', error);
    showToast('Erro ao finalizar inspeção', 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-check-circle"></i> Finalizar Inspeção';
  }
});






// Back to Form
document.getElementById('backToFormBtn').addEventListener('click', () => {
  openModal('inspectionFormModal');
  navigateToSection('inspections');
});

// Download PDF
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
  const button = document.getElementById('downloadPdfBtn');
  button.disabled = true;
  button.innerHTML = '<span class="loading"></span> Gerando...';

  try {
    const { jsPDF } = window.jspdf;
    const pages = document.querySelectorAll('#pdfPreview .pdf-page');
    const pdf = new jsPDF('p', 'mm', 'a4');

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      if (i > 0) {
        pdf.addPage();
      }

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    }

    // Usa o nome correto dependendo se é empresa ou prédio
    const nomeCliente = currentInspectionData.tipo === 'predio'
      ? (currentInspectionData.razao_social_predio || currentInspectionData.razao_social || 'Cliente')
      : (currentInspectionData.razao_social || 'Cliente');

    const fileName = `Inspecao_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    showToast('PDF baixado com sucesso!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    showToast('Erro ao gerar PDF', 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-download"></i> Baixar PDF';
  }
});

// Save Inspection
document.getElementById('saveInspectionBtn').addEventListener('click', async () => {
  const button = document.getElementById('saveInspectionBtn');
  button.disabled = true;
  button.innerHTML = '<span class="loading"></span> Salvando...';

  try {
    const inspectionData = {
      ...currentInspectionData,
      tecnico_id: currentUser.id,
      tecnico_nome: currentUser.nome,
      data: new Date().toISOString(),
      completed: false,
      tipo: window.ultimaEmpresaCadastrada?.tipo || currentInspectionData.tipo || 'empresa'
    };

    // Se for prédio, garante que os campos _predio estão salvos
    if (inspectionData.tipo === 'predio' && window.ultimaEmpresaCadastrada) {
      inspectionData.razao_social_predio = currentInspectionData.razao_social || window.ultimaEmpresaCadastrada.razao_social_predio;
      inspectionData.cnpj_predio = currentInspectionData.cnpj || window.ultimaEmpresaCadastrada.cnpj_predio;
      inspectionData.telefone_predio = currentInspectionData.telefone || window.ultimaEmpresaCadastrada.telefone_predio;
      inspectionData.responsavel_predio = currentInspectionData.responsavel || window.ultimaEmpresaCadastrada.responsavel_predio;
      inspectionData.cep_predio = currentInspectionData.cep || window.ultimaEmpresaCadastrada.cep_predio;
      inspectionData.endereco_predio = currentInspectionData.endereco || window.ultimaEmpresaCadastrada.endereco_predio;
      inspectionData.numero_predio = currentInspectionData.numero_predio || window.ultimaEmpresaCadastrada.numero_predio;
    }

    await database.ref('inspections').push(inspectionData);

    showToast('Inspeção salva com sucesso!');

    setTimeout(() => {
      navigateToSection('inspections');
      document.querySelectorAll('.nav-item-mobile').forEach(nav => {
        if (nav.dataset.section === 'inspections') nav.classList.add('active');
        else nav.classList.remove('active');
      });
      document.querySelectorAll('.nav-item-desktop').forEach(nav => {
        if (nav.dataset.section === 'inspections') nav.classList.add('active');
        else nav.classList.remove('active');
      });
    }, 1000);
  } catch (error) {
    console.error('Error saving inspection:', error);
    showToast('Erro ao salvar inspeção', 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fas fa-save"></i> Salvar';
  }
});

// Variável de paginação para inspeções
let currentInspectionPage = 1;
const inspectionsPerPage = 7;

async function loadInspections() {
  const snapshot = await database.ref('inspections').once('value');
  const inspections = snapshot.val() || {};
  const list = document.getElementById('inspectionsList');
  list.innerHTML = '';

  const inspectionsArray = Object.entries(inspections).map(([key, value]) => ({
    id: key,
    ...value
  }));

  // Filtro
  const filtered = inspectionsArray.filter(insp => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'completed') return insp.completed;
    if (currentFilter === 'pending') return !insp.completed;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-check"></i>
        <p>Nenhuma inspeção encontrada</p>
      </div>
    `;
    return;
  }

  // Paginação
  const totalInspectionPages = Math.ceil(filtered.length / inspectionsPerPage);
  const startIndex = (currentInspectionPage - 1) * inspectionsPerPage;
  const endIndex = startIndex + inspectionsPerPage;
  const paginatedInspections = filtered.slice(startIndex, endIndex);

  paginatedInspections.forEach(insp => {
    const statusBadge = insp.completed
      ? '<span class="badge badge-completed">Concluída</span>'
      : '<span class="badge badge-pending">Pendente</span>';

    const sistemas = [];
    if (insp.has_bombas) sistemas.push('Bombas');
    if (insp.has_hidrantes) sistemas.push('Hidrantes');
    if (insp.has_alarme) sistemas.push('Alarme');
    if (insp.has_extintores) sistemas.push('Extintores');
    if (insp.has_sinalizacao) sistemas.push('Sinalização');

    // Define o nome correto baseado no tipo
    const isPredio = insp.tipo === 'predio';
    const nomeCliente = isPredio
      ? (insp.razao_social_predio || insp.razao_social || 'N/A')
      : (insp.razao_social || 'N/A');
    const cnpjCliente = isPredio
      ? (insp.cnpj_predio || insp.cnpj || '-')
      : (insp.cnpj || '-');
    const enderecoCliente = isPredio
      ? (insp.endereco_predio || insp.endereco || '-')
      : (insp.endereco || '-');
    const numeroCliente = isPredio
      ? (insp.numero_predio || '-')
      : (insp.numero_empresa || '-');
    const telefoneCliente = isPredio
      ? (insp.telefone_predio || insp.telefone || '-')
      : (insp.telefone || '-');

    const item = document.createElement('div');
    item.className = 'list-item';

    item.innerHTML = `
      <div class="list-item-header">
        <div>
          <div class="list-item-title">
            ${isPredio ? '<i class="fas fa-building"></i>' : '<i class="fas fa-briefcase"></i>'} 
            ${nomeCliente}
          </div>
          <div class="list-item-subtitle">${new Date(insp.data).toLocaleDateString('pt-BR')}</div>
        </div>
        ${statusBadge}
      </div>

      <div class="list-item-info">
        <div class="list-item-info-row">
          <span class="list-item-info-label">CNPJ:</span>
          <span class="list-item-info-value">${cnpjCliente}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Telefone:</span>
          <span class="list-item-info-value">${telefoneCliente}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">${isPredio ? 'Número do Prédio:' : 'Número da Empresa:'}</span>
          <span class="list-item-info-value">${numeroCliente}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Endereço:</span>
          <span class="list-item-info-value">${enderecoCliente}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Técnico:</span>
          <span class="list-item-info-value">${insp.tecnico_nome || '-'}</span>
        </div>

        <div class="list-item-info-row">
          <span class="list-item-info-label">Sistemas:</span>
          <span class="list-item-info-value">${sistemas.join(', ') || '-'}</span>
        </div>
      </div>

      <div class="list-item-actions">
        ${!insp.completed ? `<button class="btn-small btn-success" onclick="markAsCompleted('${insp.id}')">
          <i class="fas fa-check-circle"></i> Finalizar
        </button>` : ''}
        <button class="btn-small btn-info" onclick="viewInspection('${insp.id}')">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button class="btn-small btn-primary" onclick="showPDFOptionsForInspection('${insp.id}')">
          <i class="fas fa-download"></i> PDF
        </button>
      </div>
    `;

    list.appendChild(item);
  });

  // Controles de paginação
  if (totalInspectionPages > 1) {
    const paginationControls = document.createElement('div');
    paginationControls.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin: 25px 0;
      padding: 20px;
      background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      flex-wrap: wrap;
    `;

    paginationControls.innerHTML = `
      <button 
        onclick="changeInspectionPage(${currentInspectionPage - 1})"
        ${currentInspectionPage === 1 ? 'disabled' : ''}
        style="
          padding: 10px 20px;
          background: ${currentInspectionPage === 1 ? '#444' : '#D4C29A'};
          color: ${currentInspectionPage === 1 ? '#888' : '#0d0d0d'};
          border: none;
          border-radius: 8px;
          cursor: ${currentInspectionPage === 1 ? 'not-allowed' : 'pointer'};
          font-weight: bold;
          box-shadow: ${currentInspectionPage === 1 ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.2)'};
          transition: all 0.3s;
        ">
        <i class="fas fa-chevron-left"></i> Anterior
      </button>
      
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #D4C29A; font-weight: bold; font-size: 14px;">Página</span>
        <input 
          type="number"
          id="inspectionPageInput"
          min="1"
          max="${totalInspectionPages}"
          value="${currentInspectionPage}"
          onkeypress="if(event.key === 'Enter') { const val = parseInt(this.value); if(val >= 1 && val <= ${totalInspectionPages}) changeInspectionPage(val); }"
          style="
            width: 70px;
            padding: 8px 12px;
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
            color: #D4C29A;
            border: 2px solid #D4C29A;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            outline: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          ">
        <span style="color: #D4C29A; font-weight: bold; font-size: 14px;">de ${totalInspectionPages}</span>
        <button 
          onclick="const val = parseInt(document.getElementById('inspectionPageInput').value); if(val >= 1 && val <= ${totalInspectionPages}) changeInspectionPage(val);"
          style="
            padding: 8px 16px;
            background: #D4C29A;
            color: #0d0d0d;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            transition: all 0.3s;
          ">
          <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      
      <button 
        onclick="changeInspectionPage(${currentInspectionPage + 1})"
        ${currentInspectionPage === totalInspectionPages ? 'disabled' : ''}
        style="
          padding: 10px 20px;
          background: ${currentInspectionPage === totalInspectionPages ? '#444' : '#D4C29A'};
          color: ${currentInspectionPage === totalInspectionPages ? '#888' : '#0d0d0d'};
          border: none;
          border-radius: 8px;
          cursor: ${currentInspectionPage === totalInspectionPages ? 'not-allowed' : 'pointer'};
          font-weight: bold;
          box-shadow: ${currentInspectionPage === totalInspectionPages ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.2)'};
          transition: all 0.3s;
        ">
        Próxima <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    list.appendChild(paginationControls);
  }
}

// Função de mudança de página de inspeções
function changeInspectionPage(newPage) {
  currentInspectionPage = newPage;
  loadInspections();
  // Scroll suave para o topo da lista
  const container = document.getElementById('inspectionsList');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}









// Filter Inspections
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    loadInspections();
  });
});

// Search Inspections
document.getElementById('inspectionSearch').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const items = document.querySelectorAll('#inspectionsList .list-item');

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchTerm) ? '' : 'none';
  });
});

// Mark as Completed
async function markAsCompleted(inspectionId) {
  if (confirm('Tem certeza que deseja marcar esta inspeção como concluída?')) {
    try {
      await database.ref(`inspections/${inspectionId}`).update({
        completed: true,
        completedDate: new Date().toISOString()
      });
      showToast('Inspeção finalizada com sucesso!');
      loadInspections();
      loadDashboard();
    } catch (error) {
      console.error('Error completing inspection:', error);
      showToast('Erro ao finalizar inspeção', 'error');
    }
  }
}

// View Inspection
async function viewInspection(inspectionId) {
  const snapshot = await database.ref(`inspections/${inspectionId}`).once('value');
  const inspection = snapshot.val();

  // Garante que todos os dados estão presentes, incluindo tipo e campos _predio
  currentInspectionData = {
    ...inspection,
    tipo: inspection.tipo || 'empresa'
  };

  // Show PDF selection
  const grid = document.getElementById('pdfSelectionGrid');
  grid.innerHTML = '';

  const options = [
    { id: 'complete', icon: 'fa-file-alt', title: 'Relatório Completo', desc: 'Todos os sistemas inspecionados' },
  ];

  if (inspection.has_bombas) {
    options.push({ id: 'bombas', icon: 'fa-water', title: 'Sistema de Bombas', desc: 'Apenas bombas e reservatório' });
  }
  if (inspection.has_hidrantes) {
    options.push({ id: 'hidrantes', icon: 'fa-truck-droplet', title: 'Rede de Hidrantes', desc: 'Apenas hidrantes e acessórios' });
  }
  if (inspection.has_alarme) {
    options.push({ id: 'alarme', icon: 'fa-bell', title: 'Sistema de Alarme', desc: 'Apenas alarme e detectores' });
  }
  if (inspection.has_extintores) {
    options.push({ id: 'extintores', icon: 'fa-fire-extinguisher', title: 'Extintores', desc: 'Apenas extintores' });
  }
  if (inspection.has_sinalizacao) {
    options.push({ id: 'sinalizacao', icon: 'fa-sign', title: 'Sinalização', desc: 'Apenas placas e sinalização' });
  }

  options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'pdf-option';
    div.innerHTML = `
          <i class="fas ${opt.icon}"></i>
          <div class="pdf-option-content">
            <div class="pdf-option-title">${opt.title}</div>
            <div class="pdf-option-desc">${opt.desc}</div>
          </div>
        `;
    div.onclick = () => generateSelectedPDF(opt.id);
    grid.appendChild(div);
  });

  openModal('pdfSelectionModal');
}



// Show PDF Options for Inspection
async function showPDFOptionsForInspection(inspectionId) {
  const snapshot = await database.ref(`inspections/${inspectionId}`).once('value');
  const inspection = snapshot.val();

  currentInspectionData = inspection;

  // Show PDF selection
  const grid = document.getElementById('pdfSelectionGrid');
  grid.innerHTML = '';

  const options = [
    { id: 'complete', icon: 'fa-file-alt', title: 'Relatório Completo', desc: 'Todos os sistemas inspecionados' },
  ];

  if (inspection.has_bombas) {
    options.push({ id: 'bombas', icon: 'fa-water', title: 'Sistema de Bombas', desc: 'Apenas bombas e reservatório' });
  }
  if (inspection.has_hidrantes) {
    options.push({ id: 'hidrantes', icon: 'fa-truck-droplet', title: 'Rede de Hidrantes', desc: 'Apenas hidrantes e acessórios' });
  }
  if (inspection.has_alarme) {
    options.push({ id: 'alarme', icon: 'fa-bell', title: 'Sistema de Alarme', desc: 'Apenas alarme e detectores' });
  }
  if (inspection.has_extintores) {
    options.push({ id: 'extintores', icon: 'fa-fire-extinguisher', title: 'Extintores', desc: 'Apenas extintores' });
  }
  if (inspection.has_sinalizacao) {
    options.push({ id: 'sinalizacao', icon: 'fa-sign', title: 'Sinalização', desc: 'Apenas placas e sinalização' });
  }

  options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'pdf-option';
    div.innerHTML = `
          <i class="fas ${opt.icon}"></i>
          <div class="pdf-option-content">
            <div class="pdf-option-title">${opt.title}</div>
            <div class="pdf-option-desc">${opt.desc}</div>
          </div>
        `;
    div.onclick = () => {
      generateSelectedPDF(opt.id);
      // Auto download after generation
      setTimeout(() => {
        document.getElementById('downloadPdfBtn').click();
      }, 500);
    };
    grid.appendChild(div);
  });

  openModal('pdfSelectionModal');
}

// Load Config
function loadConfig() {
  document.getElementById('profileName').value = currentUser.nome;
  document.getElementById('profileCNPJ').value = currentUser.cnpj;
  document.getElementById('profileUsername').value = currentUser.username;
  loadLogo();
}

// Profile Form
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('profileName').value;
  const cnpj = document.getElementById('profileCNPJ').value;
  await database.ref(`users/${currentUser.id}`).update({ nome });
  await database.ref(`users/${currentUser.id}`).update({ cnpj });

  currentUser.nome = nome;

  const initial = nome.charAt(0).toUpperCase();
  document.getElementById('userAvatarMobile').textContent = initial;
  document.getElementById('userNameMobile').textContent = nome;
  document.getElementById('userAvatarDesktop').textContent = initial;
  document.getElementById('userNameDesktop').textContent = nome;

  showToast('Perfil atualizado com sucesso!');
});

// Password Form
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const currentPassword = formData.get('current_password');
  const newPassword = formData.get('new_password');
  const confirmPassword = formData.get('confirm_password');

  if (currentPassword !== currentUser.password) {
    showToast('Senha atual incorreta', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('As senhas não coincidem', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('A senha deve ter no mínimo 6 caracteres', 'error');
    return;
  }

  await database.ref(`users/${currentUser.id}`).update({ password: newPassword });

  currentUser.password = newPassword;

  showToast('Senha alterada com sucesso!');
  e.target.reset();
});
/* ============================================================
   ARQUIVAR MÊS (Apenas Inspeções e Ordens)
   ============================================================ */
document.getElementById('archiveMonthBtn')?.addEventListener('click', async () => {
    const button = document.getElementById('archiveMonthBtn');
    if (!confirm('Deseja arquivar as inspeções e ordens? Isso limpará os registros atuais após o download do backup.')) return;

    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Arquivando...';

    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Buscamos apenas o que será arquivado
        const [inspectionsSnap, ordersSnap] = await Promise.all([
            database.ref('inspections').once('value'),
            database.ref('orders').once('value')
        ]);

        const backup = {
            version: '1.3', // Versão atualizada
            type: 'inspections_orders_only',
            exportDate: now.toISOString(),
            month,
            year,
            user: { nome: currentUser?.nome || '', cnpj: currentUser?.cnpj || '' },
            inspections: inspectionsSnap.val() || {},
            orders: ordersSnap.val() || {}
        };

        // Verifica se há algo para arquivar
        if (!inspectionsSnap.exists() && !ordersSnap.exists()) {
            showToast('Não há inspeções ou ordens para arquivar.', 'warning');
            return;
        }

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `arquivamento_${year}_${String(month).padStart(2, '0')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // ZERAR APENAS AS TABELAS DE MOVIMENTAÇÃO
        await Promise.all([
            database.ref('inspections').set(null),
            database.ref('orders').set(null)
        ]);

        showToast('Sucesso! Inspeções e Ordens arquivadas e limpas.');
        
        // Atualiza as listas
        loadDashboard();
        loadInspections();
        if (typeof loadOrders === 'function') loadOrders();

    } catch (err) {
        console.error('Erro ao arquivar:', err);
        showToast('Erro ao criar arquivamento', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-download"></i> Arquivar';
    }
});

/* ============================================================
   RESTAURAR (Apenas Inspeções e Ordens)
   ============================================================ */
document.getElementById('restoreFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Deseja restaurar este backup? As inspeções e ordens contidas no arquivo serão adicionadas ao sistema.')) {
        e.target.value = '';
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);

                const updates = {};
                let countInsp = 0;
                let countOrders = 0;

                // 1. Restaurar Inspeções (se houver no arquivo)
                if (backup.inspections) {
                    for (let key in backup.inspections) {
                        updates[`inspections/${key}`] = backup.inspections[key];
                        countInsp++;
                    }
                }

                // 2. Restaurar Ordens (se houver no arquivo)
                if (backup.orders) {
                    for (let key in backup.orders) {
                        updates[`orders/${key}`] = backup.orders[key];
                        countOrders++;
                    }
                }

                if (countInsp === 0 && countOrders === 0) {
                    showToast('Nenhum dado encontrado no arquivo.', 'warning');
                    return;
                }

                // Executa a restauração
                await database.ref().update(updates);

                showToast(`Restaurado: ${countInsp} Inspeções e ${countOrders} Ordens.`);

                // Atualizar interface
                loadDashboard();
                loadInspections();
                if (typeof loadOrders === 'function') loadOrders();

            } catch (parseError) {
                console.error('Erro no Parse:', parseError);
                showToast('Arquivo de backup inválido ou corrompido.', 'error');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        showToast('Erro ao restaurar dados', 'error');
    } finally {
        e.target.value = '';
    }
});

// Initialize
window.addEventListener('load', () => {
  initializeAdmin();
  autoLogin();
});

// Responsive
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024 && currentUser) {
    document.getElementById('sidebarDesktop').style.display = 'flex';
  } else {
    document.getElementById('sidebarDesktop').style.display = 'none';
  }
});
// ===== ORDENS DE SERVIÇO - Código Unificado e Corrigido =====

// ===== ORDENS DE SERVIÇO - Código Unificado e Corrigido =====

let allOrders = []; // cache local

// Carrega ordens do Firebase e atualiza render
async function loadOrders() {
  try {
    const snapshot = await database.ref('orders').once('value');
    const orders = snapshot.val() || {};

    allOrders = Object.entries(orders).map(([id, data]) => {
      const os = data || {};

      // ===== PRODUTOS =====
      const products = Array.isArray(os.products) ? os.products : [];

      // ===== SUBTOTAL =====
      let subtotal = Number(os.subtotal);
      if (!subtotal || isNaN(subtotal)) {
        subtotal = products.reduce((acc, p) => {
          return acc + (Number(p.price) * Number(p.qty));
        }, 0);
      }

      // ===== LUCRO =====
      const profitPercent = Number(os.profitPercent) || 0;
      const profitValue = subtotal * (profitPercent / 100);

      // ===== TOTAL FINAL =====
      let total = Number(os.total);
      if (!total || isNaN(total)) {
        total = subtotal + profitValue;
      }

      return {
        id,
        ...os,

        // 🔥 NORMALIZADO
        products,
        subtotal,
        profitPercent,
        profitValue,
        total,

        // 🔥 COMPATIBILIDADE ANTIGA
        preco: total || Number(os.preco) || 0
      };
    });

    renderFilteredOrders();

  } catch (err) {
    console.error('Erro ao carregar orders:', err);
    showToast('Erro ao carregar ordens', 'error');
  }
}


// ============================= 
// LISTENER FIREBASE - ESCUTA ORDERS
// ============================= 
firebase.database().ref('orders').on('value', (snapshot) => {
  allOrders = [];
  const data = snapshot.val();

  if (data) {
    Object.keys(data).forEach(key => {
      allOrders.push({
        id: key,
        ...data[key]
      });
    });
  }

  // Ordena por data mais recente
  allOrders.sort((a, b) => {
    const dateA = new Date(a.data || 0).getTime();
    const dateB = new Date(b.data || 0).getTime();
    return dateB - dateA;
  });

  renderFilteredOrders();

  // Atualiza dashboard se a função existir
  if (typeof updateDashboard === 'function') {
    updateDashboard();
  }
});

// ============================= 
// FUNÇÃO PARA AGRUPAR PRODUTOS DUPLICADOS
// ============================= 
function agruparProdutos(produtos) {
  const agrupados = {};

  produtos.forEach(p => {
    const key = p.id || p.name;
    if (agrupados[key]) {
      agrupados[key].qty += Number(p.qty) || 0;
    } else {
      agrupados[key] = {
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        qty: Number(p.qty) || 0
      };
    }
  });

  return Object.values(agrupados);
}

// ============================= 
// RENDERIZAR ORDENS FILTRADAS
// ============================= 

function renderFilteredOrders() {
  const list = document.getElementById('ordersList');
  if (!list) return;

  list.innerHTML = '';

  const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
  const activeFilterBtn = document.querySelector('#ordersSection .filter-btn.active');
  const activeFilter = activeFilterBtn?.dataset?.filter || 'all';

  const filtered = allOrders.filter(os => {
    const cliente = (os.cliente || '').toLowerCase();
    const servico = (os.servico || '').toLowerCase();
    const cnpj = (os.cnpj || '').toLowerCase();

    const matchesText =
      cliente.includes(search) ||
      servico.includes(search) ||
      cnpj.includes(search);

    const statusRaw = (os.status || os.estado || os.completed || 'Pendente')
      .toString()
      .toLowerCase();

    let matchesStatus = true;
    if (activeFilter === 'completed') {
      matchesStatus = /conclu|finaliz|true/.test(statusRaw);
    }
    if (activeFilter === 'pending') {
      matchesStatus = !/conclu|finaliz|true/.test(statusRaw);
    }

    return matchesText && matchesStatus;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-clipboard-list"></i>
        <p>Nenhuma ordem de serviço encontrada</p>
      </div>
    `;
    return;
  }

  filtered.forEach((os, index) => {
    const statusText = (os.status || os.estado || (os.completed ? 'Concluída' : 'Pendente')).toString();
    const isFinalizada = /conclu|finaliz/i.test(statusText);

    const statusBadge = isFinalizada
      ? '<span class="badge badge-completed">Finalizada</span>'
      : '<span class="badge badge-pending">Pendente</span>';

    const finalizarBtn = !isFinalizada
      ? `<button class="btn-small btn-success" onclick="finalizarOS('${os.id}')" style="flex: 1 1 calc(50% - 4px); border-radius: 8px; font-weight: 600;">
          <i class="fas fa-check-circle"></i> Finalizar
        </button>`
      : '';

    const dataStr = os.data ? new Date(os.data).toLocaleDateString('pt-BR') : '-';

    // Agrupa produtos duplicados
    const produtosOriginais = Array.isArray(os.products) ? os.products : [];
    const produtos = agruparProdutos(produtosOriginais);
    const qtdProdutos = produtos.reduce((acc, p) => acc + p.qty, 0);

    const formaPagamento = os.payment_method || os.formaPagamento || 'Não informado';
    const statusPagamento = os.payment_status || os.statusPagamento || 'Não Pago';

    // Extrai número da OS do ID
    const ano = new Date().getFullYear();
    const numeroOS = ` ${index + 1} - ${ano}`;

    // Adiciona divisor com número da OS
    const separator = document.createElement('div');
    separator.style.cssText = `
      display: flex;
      align-items: center;
      margin: 50px 0;
      position: relative;
    `;

    separator.innerHTML = `
      <!-- Linha esquerda -->
      <div style="
        flex: 1;
        height: 2px;
        background: linear-gradient(to right, transparent, #D4C29A);
        box-shadow: 0 0 6px rgba(212, 194, 154, 0.35);
      "></div>

      <!-- Badge central -->
      <div style="
        position: relative;
        background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
        border-radius: 40px;
        padding: 14px 36px;
        margin: 0 20px;
        box-shadow: 
          0 6px 24px rgba(0, 0, 0, 0.55),
          inset 0 2px 4px rgba(255, 255, 255, 0.08),
          0 0 0 1px rgba(212, 194, 154, 0.25);
        display: flex;
        align-items: center;
        gap: 12px;
        overflow: hidden;
      ">
        <!-- Ícone -->
        <div style="
          position: relative;
          z-index: 2;
          background: linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 3px 10px rgba(212, 194, 154, 0.35),
            inset 0 2px 4px rgba(255, 255, 255, 0.25);
        ">
          <i class="fas fa-file-invoice" style="
            color: #0d0d0d;
            font-size: 18px;
          "></i>
        </div>

        <!-- Texto -->
        <div style="position: relative; z-index: 2; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; min-width: 0;">
          <div style="
            color: #D4C29A;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.6px;
            opacity: 0.7;
            margin-bottom: 1px;
          ">Ordem de Serviço</div>

          <div style="
            color: #fff;
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
          ">#${numeroOS}</div>
        </div>

        <!-- Decoração -->
        <div style="
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border: 2px solid rgba(212, 194, 154, 0.18);
          border-radius: 50%;
          z-index: 1;
        "></div>

        <div style="
          position: absolute;
          right: 26px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          border: 2px solid rgba(212, 194, 154, 0.12);
          border-radius: 50%;
          z-index: 1;
        "></div>
      </div>

      <!-- Linha direita -->
      <div style="
        flex: 1;
        height: 2px;
        background: linear-gradient(to left, transparent, #D4C29A);
        box-shadow: 0 0 6px rgba(212, 194, 154, 0.35);
      "></div>
    `;

    list.appendChild(separator);

    let produtosListaHTML = '';
    if (produtos.length > 0) {
      produtosListaHTML = produtos.map(p => `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #1a1a1a;
          border: 1px solid #333;
          margin-bottom: 8px;
          border-radius: 8px;
          transition: all 0.3s;
          word-wrap: break-word;
          word-break: break-word;
          overflow-wrap: break-word;
          min-width: 0;
        ">
          <span style="
            color: #fff;
            flex: 1;
            margin-right: 10px;
            font-size: 14px;
            font-weight: 500;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            min-width: 0;
          ">
            <i class="fas fa-box" style="margin-right: 8px; color: #D4C29A; font-size: 12px; flex-shrink: 0;"></i>
            ${escapeHtml(p.name || 'Produto')}
          </span>
          <span style="
            color: #D4C29A;
            font-weight: 700;
            background: #0d0d0d;
            padding: 6px 12px;
            border-radius: 6px;
            white-space: nowrap;
            font-size: 13px;
            border: 1px solid #D4C29A;
            flex-shrink: 0;
          ">
            ${p.qty}x
          </span>
        </div>
      `).join('');
    }

    const div = document.createElement('div');
    div.className = 'list-item';
    div.style.marginBottom = '20px';
    div.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.5)';
    div.style.borderRadius = '12px';
    div.style.overflow = 'hidden';

    div.innerHTML = `
      <div class="list-item-header" style="
        padding: 14px 18px;
        background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
        border-bottom: 2px solid #D4C29A;
      ">
        <div style="flex: 1; min-width: 0; overflow: hidden;">
          <div class="list-item-title" style="
            font-size: 17px;
            margin-bottom: 6px;
            color: #D4C29A;
            font-weight: 700;
            letter-spacing: 0.3px;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            line-height: 1.3;
          ">
            ${escapeHtml(os.cliente || 'Cliente não informado')}
          </div>
          <div class="list-item-subtitle" style="
            font-size: 13px;
            color: #aaa;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <i class="fas fa-calendar-alt" style="font-size: 11px; flex-shrink: 0;"></i>
            ${dataStr}
          </div>
        </div>
        ${statusBadge}
      </div>

      <div class="list-item-info" style="
        padding: 16px;
        gap: 14px;
        background: #0d0d0d;
      ">

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        ">
          <div style="
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            transition: all 0.3s;
            min-width: 0;
            overflow: hidden;
          ">
            <div style="
              font-size: 10px;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <i class="fas fa-tools" style="color: #D4C29A; flex-shrink: 0;"></i>
              Serviço
            </div>
            <div style="
              font-size: 14px;
              color: #fff;
              font-weight: 600;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              line-height: 1.3;
            ">
              ${escapeHtml(os.servico || '-')}
            </div>
          </div>

          <div style="
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            transition: all 0.3s;
            min-width: 0;
            overflow: hidden;
          ">
            <div style="
              font-size: 10px;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <i class="fas fa-user-hard-hat" style="color: #D4C29A; flex-shrink: 0;"></i>
              Técnico
            </div>
            <div style="
              font-size: 14px;
              color: #fff;
              font-weight: 600;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              line-height: 1.3;
            ">
              ${escapeHtml(os.tecnico || '-')}
            </div>
          </div>
        </div>

  <div id="os-details-${os.id}" class="os-details-collapsed" style="
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        ">
   <div style="padding-top: 14px;">
    <div style="
              background: #1a1a1a;
              border: 1px solid #333;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 14px;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            ">
     <div style="
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 5px;
              "><i class="fas fa-map-marker-alt" style="color: #D4C29A; flex-shrink: 0;"></i> Endereço e CEP
     </div>
     <div style="
                font-size: 14px;
                color: #fff;
                font-weight: 500;
                margin-bottom: 6px;
                word-wrap: break-word;
                word-break: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
                line-height: 1.4;
              ">
      ${escapeHtml(os.endereco || '-')}
     </div>
     <div style="
                font-size: 13px; 
                color: #aaa;
                font-weight: 400;
              ">
      CEP: ${escapeHtml(os.cep || '-')}
     </div>
    </div>
    <div style="
              background: #1a1a1a;
              border: 1px solid #333;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 14px;
            ">
     <div style="
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 5px;
              "><i class="fas fa-circle-check" style="color: ${statusPagamento === 'Pago' ? '#28a745' : '#dc3545'}; flex-shrink: 0;"></i> Status de Pagamento
     </div>
     <div style="
                font-size: 14px;
                color: ${statusPagamento === 'Pago' ? '#28a745' : '#dc3545'};
                font-weight: 700;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
              "><i class="fas fa-${statusPagamento === 'Pago' ? 'check-circle' : 'times-circle'}" style="flex-shrink: 0;"></i> ${escapeHtml(statusPagamento)}
     </div>
     <div style="
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                padding-top: 12px;
                border-top: 1px solid #333;
                display: flex;
                align-items: center;
                gap: 5px;
              "><i class="fas fa-credit-card" style="color: #D4C29A; flex-shrink: 0;"></i> Forma de Pagamento
     </div>
     <div style="
                font-size: 14px;
                color: #fff;
                font-weight: 600;
                word-wrap: break-word;
                word-break: break-word;
                overflow-wrap: break-word;
              ">
      ${escapeHtml(formaPagamento)}
     </div>
    </div> ${produtosListaHTML ? ` 
    <div style="margin-top: 14px; margin-bottom: 14px;">
     <div style="
                  color: #D4C29A;
                  font-size: 12px;
                  font-weight: 700;
                  margin-bottom: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  padding-bottom: 8px;
                  border-bottom: 2px solid #D4C29A;
                "><i class="fas fa-boxes" style="margin-right: 8px; font-size: 11px;"></i> Produtos Utilizados (${qtdProdutos} un.)
     </div>
     <div style="max-height: 220px; overflow-y: auto;">
      ${produtosListaHTML}
     </div>
    </div> ` : ` 
    <div style="
                margin: 14px 0;
                padding: 14px;
                background: #1a1a1a;
                border: 2px dashed #333;
                border-radius: 8px;
                color: #888;
                font-size: 13px;
                text-align: center;
              "><i class="fas fa-inbox" style="margin-right: 8px; font-size: 16px; color: #D4C29A;"></i> Nenhum produto cadastrado
    </div> `} <!-- VALOR TOTAL DA OS -->
    <div style="
              background: #1a1a1a;
              border: 1px solid #333;
              border-radius: 8px;
              padding: 12px;
              margin-top: 14px;
            ">
     <div style="
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 5px;
              "><i class="fas fa-dollar-sign" style="color: #D4C29A; flex-shrink: 0;"></i> Valor Total da OS
     </div>
     <div style="
                font-size: 18px;
                color: #4ade80;
                font-weight: 700;
              ">
      ${(Number(os.total) || Number(os.preco) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
     </div>
    </div>
   </div>
  </div>

        <!-- FIM DA SEÇÃO RECOLHÍVEL -->

        <!-- BOTÃO TOGGLE DETALHES -->
        <button class="btn-toggle-details" onclick="toggleOSDetails('${os.id}')" style="
          margin-top: 14px;
          width: 100%;
          background: #2a2a2a;
          border: 2px solid #D4C29A;
          color: #D4C29A;
          padding: 11px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s;
        " onmouseover="this.style.background='#3a3a3a'" onmouseout="this.style.background='#2a2a2a'">
          <span>Ver Detalhes</span>
          <i class="fas fa-chevron-down" id="toggle-icon-${os.id}" style="
            font-size: 12px;
            transition: transform 0.3s;
          "></i>
        </button>

      </div>

      <div style="
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
        background: #000;
        border-top: 2px solid #D4C29A;
      ">
        <button class="btn-small" onclick="viewOrder('${os.id}')" style="
          flex: 1 1 calc(50% - 4px); 
          font-size: 12px; 
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
          background: #1a1a1a;
          color: #3b82f6;
          border: 2px solid #3b82f6;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='#3b82f6';this.style.color='#fff'" onmouseout="this.style.background='#1a1a1a';this.style.color='#3b82f6'">
          <i class="fas fa-eye"></i> <span>Ver</span>
        </button>
        
        <button class="btn-small" onclick="abrirModalPagamento('${os.id}')" style="
          flex: 1 1 calc(50% - 4px); 
          font-size: 12px; 
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
          background: #1a1a1a;
          color: #10b981;
          border: 2px solid #10b981;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='#10b981';this.style.color='#fff'" onmouseout="this.style.background='#1a1a1a';this.style.color='#10b981'">
          <i class="fas fa-credit-card"></i> <span>Pagamento</span>
        </button>
        
        <button class="btn-small" onclick="mostrarOpcoesPDF('${os.id}')" style="
          flex: 1 1 calc(50% - 4px); 
          font-size: 12px; 
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
          background: #1a1a1a;
          color: #f43f5e;
          border: 2px solid #f43f5e;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='#f43f5e';this.style.color='#fff'" onmouseout="this.style.background='#1a1a1a';this.style.color='#f43f5e'">
          <i class="fas fa-file-pdf"></i> <span>PDF</span>
        </button>
        
        <button class="btn-small" onclick="editarOS('${os.id}')" style="
          flex: 1 1 calc(50% - 4px); 
          font-size: 12px; 
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
          background: #1a1a1a;
          color: #D4C29A;
          border: 2px solid #D4C29A;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='#D4C29A';this.style.color='#0d0d0d'" onmouseout="this.style.background='#1a1a1a';this.style.color='#D4C29A'">
          <i class="fas fa-edit"></i> <span>Editar</span>
        </button>
        
        ${finalizarBtn}
        
        <button class="btn-small" onclick="excluirOS('${os.id}')" style="
          flex: 1 1 calc(50% - 4px); 
          font-size: 12px; 
          padding: 10px 12px;
          border-radius: 8px;
          font-weight: 600;
          background: #1a1a1a;
          color: #dc2626;
          border: 2px solid #dc2626;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='#dc2626';this.style.color='#fff'" onmouseout="this.style.background='#1a1a1a';this.style.color='#dc2626'">
          <i class="fas fa-trash"></i> <span>Excluir</span>
        </button>
      </div>
    `;

    list.appendChild(div);
  });
}

// Função para mostrar opções de PDF
function mostrarOpcoesPDF(osId) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
      border-radius: 16px;
      padding: 28px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
      border: 2px solid #D4C29A;
      animation: slideUp 0.3s ease;
    ">
      <div style="
        text-align: center;
        margin-bottom: 24px;
      ">
        <div style="
          background: linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 4px 12px rgba(212, 194, 154, 0.4);
        ">
          <i class="fas fa-file-pdf" style="
            color: #0d0d0d;
            font-size: 28px;
          "></i>
        </div>
        
        <h3 style="
          color: #D4C29A;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        ">Gerar PDF</h3>
        
        <p style="
          color: #aaa;
          font-size: 14px;
          line-height: 1.5;
        ">Escolha o tipo de PDF que deseja gerar</p>
      </div>

      <div style="
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
      ">
        <button onclick="gerarPDFOrdem('${osId}', true); document.body.removeChild(this.closest('div').parentElement)" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b93a 0%, #059669 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">
          <i class="fas fa-dollar-sign" style="font-size: 18px;"></i>
          <span>PDF com Valores</span>
        </button>

        <button onclick="gerarPDFOrdem('${osId}', false); document.body.removeChild(this.closest('div').parentElement)" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #f63b3b 0%, #eb2525 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          <i class="fas fa-file-alt" style="font-size: 18px;"></i>
          <span>PDF sem Valores</span>
        </button>
      </div>

      <button onclick="document.body.removeChild(this.closest('div').parentElement)" style="
        width: 100%;
        padding: 12px;
        background: transparent;
        color: #999;
        border: 2px solid #333;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      " onmouseover="this.style.borderColor='#D4C29A';this.style.color='#D4C29A'" onmouseout="this.style.borderColor='#333';this.style.color='#999'">
        Cancelar
      </button>
    </div>

    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  `;

  document.body.appendChild(modal);
}







// Cache para melhor performance
const toggleCache = new Map();

// FUNÇÃO GLOBAL DO TOGGLE
window.toggleOSDetails = function (osId) {
  const detailsDiv = document.getElementById(`os-details-${osId}`);
  const icon = document.getElementById(`toggle-icon-${osId}`);

  if (!detailsDiv || !icon) return;

  const isCollapsed = detailsDiv.classList.contains('os-details-collapsed');

  if (isCollapsed) {
    // Abrir detalhes
    if (!toggleCache.has(osId)) {
      toggleCache.set(osId, detailsDiv.scrollHeight);
    }
    detailsDiv.style.maxHeight = toggleCache.get(osId) + 'px';
    detailsDiv.classList.remove('os-details-collapsed');
    icon.style.transform = 'rotate(180deg)';
  } else {
    // Fechar detalhes
    detailsDiv.style.maxHeight = '0';
    detailsDiv.classList.add('os-details-collapsed');
    icon.style.transform = 'rotate(0deg)';
  }
}

window.clearToggleCache = function () {
  toggleCache.clear();
}


// ============================= 
// MODAL DE PAGAMENTO
// ============================= 

function abrirModalPagamento(orderId) {
  const ordem = allOrders.find(o => o.id === orderId);
  if (!ordem) {
    showToast('Ordem não encontrada', 'error');
    return;
  }

  const formaPagamento = ordem.payment_method || ordem.formaPagamento || 'Não informado';
  const statusPagamento = ordem.payment_status || ordem.statusPagamento || 'Não Pago';
  const totalFinal = Number(ordem.total) || Number(ordem.preco) || 0;
  const precoFmt = totalFinal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const overlay = document.createElement('div');
  overlay.id = 'modalPagamentoOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: #1a1a1a;
    border: 2px solid #D4C29A;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
    animation: slideUp 0.3s ease;
    max-height: 90vh;
    overflow-y: auto;
  `;

  modal.innerHTML = `
    <div style="
      padding: 20px 24px;
      border-bottom: 2px solid #D4C29A;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <h3 style="
        color: #D4C29A;
        margin: 0;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <i class="fas fa-credit-card"></i>
        Informações de Pagamento
      </h3>
      <button onclick="fecharModalPagamento()" style="
        background: none;
        border: none;
        color: #999;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      "
      onmouseover="this.style.background='#2a2a2a'; this.style.color='#D4C29A'"
      onmouseout="this.style.background='none'; this.style.color='#999'"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div style="padding: 24px;">
      
      <div style="margin-bottom: 20px;">
        <div style="color: #999; font-size: 12px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          Cliente
        </div>
        <div style="color: #D4C29A; font-size: 16px; font-weight: 600;">
          ${escapeHtml(ordem.cliente || 'Não informado')}
        </div>
      </div>

      <div style="
        background: #2a2a2a;
        border: 1px solid #D4C29A;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      ">
        <div style="color: #999; font-size: 13px; margin-bottom: 8px;">
          Valor Total da Ordem
        </div>
        <div style="color: #D4C29A; font-size: 28px; font-weight: 700;">
          ${precoFmt}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Status de Pagamento Atual
        </div>
        <div style="
          background: #2a2a2a;
          border: 1px solid ${statusPagamento === 'Pago' ? '#28a745' : '#dc3545'};
          border-radius: 6px;
          padding: 12px 16px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <i class="fas fa-${statusPagamento === 'Pago' ? 'check-circle' : 'times-circle'}" style="color: ${statusPagamento === 'Pago' ? '#28a745' : '#dc3545'};"></i>
          ${escapeHtml(statusPagamento)}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Forma de Pagamento Atual
        </div>
        <div style="
          background: #2a2a2a;
          border: 1px solid #D4C29A;
          border-radius: 6px;
          padding: 12px 16px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <i class="fas fa-wallet" style="color: #D4C29A;"></i>
          ${escapeHtml(formaPagamento)}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Alterar Status de Pagamento
        </div>
        <select id="novoStatusPagamento" style="
          width: 100%;
          padding: 12px 16px;
          background: #2a2a2a;
          border: 1px solid #D4C29A;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          <option value="">Selecione uma opção</option>
          <option value="Pago">✓ Pago</option>
          <option value="Não Pago">✗ Não Pago</option>
        </select>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Alterar Forma de Pagamento
        </div>
        <select id="novaFormaPagamento" style="
          width: 100%;
          padding: 12px 16px;
          background: #2a2a2a;
          border: 1px solid #D4C29A;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          <option value="">Selecione uma opção</option>
          <option value="Dinheiro">Dinheiro</option>
          <option value="Pix">Pix</option>
          <option value="Cartão de Crédito">Cartão de Crédito</option>
          <option value="Cartão de Débito">Cartão de Débito</option>
           <option value="Cheque Especial">Cheque Especial</option>
          <option value="Boleto">Boleto</option>
          <option value="Transferência">Transferência</option>
          <option value="A Prazo">A Prazo</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button onclick="fecharModalPagamento()" class="btn-secondary" style="
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        ">
          <i class="fas fa-times" style="margin-right: 6px;"></i>
          Cancelar
        </button>
        <button onclick="salvarFormaPagamento('${ordem.id}')" class="btn-primary" style="
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        ">
          <i class="fas fa-save" style="margin-right: 6px;"></i>
          Salvar
        </button>
      </div>

    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      fecharModalPagamento();
    }
  };
}

function fecharModalPagamento() {
  const overlay = document.getElementById('modalPagamentoOverlay');
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }, 200);
  }
}

async function salvarFormaPagamento(orderId) {
  const selectForma = document.getElementById('novaFormaPagamento');
  const selectStatus = document.getElementById('novoStatusPagamento');

  const novaForma = selectForma?.value;
  const novoStatus = selectStatus?.value;

  if (!novaForma && !novoStatus) {
    showToast('Selecione pelo menos uma opção para atualizar', 'error');
    return;
  }

  try {
    showToast('Salvando informações de pagamento...', 'info');

    const ordemRef = firebase.database().ref('orders/' + orderId);
    const updates = {};

    if (novaForma) {
      updates.payment_method = novaForma;
      updates.formaPagamento = novaForma;
    }

    if (novoStatus) {
      updates.payment_status = novoStatus;
      updates.statusPagamento = novoStatus;
    }

    await ordemRef.update(updates);

    showToast('Informações de pagamento atualizadas!', 'success');
    fecharModalPagamento();

    // Recarregar dados para atualizar a interface
    if (typeof loadOrders === 'function') {
      await loadOrders();
    }
  } catch (error) {
    console.error('Erro ao salvar pagamento:', error);
    showToast('Erro ao salvar: ' + error.message, 'error');
  }
}


// ============================= 
// FUNÇÃO GERAR PDF COM JSPDF
// ============================= 


async function gerarPDFOrdem(orderId, comValores = true) {

  const ordem = allOrders.find(o => o.id === orderId);
  if (!ordem) {
    showToast('Ordem não encontrada', 'error');
    return;
  }

  try {
    showToast(`Gerando PDF ${comValores ? 'com' : 'sem'} valores...`, 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // =============================
    // DADOS BASE
    // =============================
    const produtosOriginais = Array.isArray(ordem.products) ? ordem.products : [];
    const produtos = agruparProdutos(produtosOriginais);

    const dataStr = ordem.data
      ? new Date(ordem.data).toLocaleDateString('pt-BR')
      : '-';

    const formaPagamento =
      ordem.payment_method ||
      ordem.formaPagamento ||
      'Não informado';

    const statusPagamento =
      ordem.payment_status ||
      ordem.statusPagamento ||
      'Não Pago';

    const totalFinal =
      Number(ordem.total) ||
      Number(ordem.preco) ||
      0;

    const statusText = (
      ordem.status ||
      ordem.estado ||
      (ordem.completed ? 'Concluída' : 'Pendente')
    ).toString();

    // =============================
    // HEADER
    // =============================
    doc.setFillColor(248, 249, 250);
    doc.rect(0, 0, 210, 38, 'F');

    // Barra lateral vermelha
    doc.setFillColor(179, 33, 23);
    doc.rect(0, 0, 5, 38, 'F');

    // Logo
    if (window.currentLogoUrl) {
      try {
        doc.addImage(
          window.currentLogoUrl,
          'PNG',
          10,
          7,
          28,
          14,
          undefined,
          'FAST'
        );
      } catch (e) {
        console.warn('Erro ao inserir logo', e);
      }
    } else {
      doc.setTextColor(179, 33, 23);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('EXTINMAIS', 12, 15);
    }

    // Informações da empresa
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('CNPJ: 52.026.476/0001-03', 12, 24);
    doc.text('Tel: (15) 99137-1232', 12, 28);
    doc.text('extinmaiss@outlook.com', 12, 32);

    // Título
    doc.setTextColor(179, 33, 23);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA DE SERVIÇO', 200, 13, { align: 'right' });

    // Número da OS
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `N° ${ordem.id?.slice(0, 8) || '-'}`,
      200,
      19,
      { align: 'right' }
    );

    // Número do Prédio ou Empresa - pegando do BD com camelCase
    let numeroLabel = 'Prédio/N°:';
    let numero = ordem.numeroPredio || '-';
    
    if (ordem.clienteTipo === 'empresa') {
      numeroLabel = 'Empresa/N°:';
      numero = ordem.numeroEmpresa || '-';
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${numeroLabel} ${numero}`,
      200,
      24,
      { align: 'right' }
    );

    // Status
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Status: ${statusText}`,
      200,
      29,
      { align: 'right' }
    );

    // =============================
    // DADOS DO CLIENTE
    // =============================
    let yPos = 46;

    // Card com sombra sutil
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, yPos, 180, 37, 2, 2);

    // Barra superior colorida
    doc.setFillColor(179, 33, 23);
    doc.roundedRect(15, yPos, 180, 7, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, yPos + 5);

    // Conteúdo
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);

    // Nome do Cliente
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 20, yPos + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(ordem.cliente || '-', 38, yPos + 13);

    // Data
    doc.setFont('helvetica', 'bold');
    doc.text('Data:', 130, yPos + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(dataStr, 143, yPos + 13);

    // CNPJ/CPF
    doc.setFont('helvetica', 'bold');
    doc.text('CNPJ/CPF:', 20, yPos + 19);
    doc.setFont('helvetica', 'normal');
    if (ordem.cnpj) {
      doc.text(ordem.cnpj, 43, yPos + 19);
    } else {
      doc.text('____________________', 43, yPos + 19);
    }

    // Telefone - campo para preencher
    doc.setFont('helvetica', 'bold');
    doc.text('Telefone:', 130, yPos + 19);
    doc.setFont('helvetica', 'normal');
    if (ordem.telefone || ordem.contato) {
      doc.text(ordem.telefone || ordem.contato, 153, yPos + 19);
    } else {
      doc.text('____________________', 153, yPos + 19);
    }

    // Email - campo para preencher
    doc.setFont('helvetica', 'bold');
    doc.text('E-mail:', 130, yPos + 25);
    doc.setFont('helvetica', 'normal');

    if (ordem.email) {
      doc.text(ordem.email, 153, yPos + 25);
    } else {
      doc.text('____________________', 153, yPos + 25);
    }

    // Endereço
    doc.setFont('helvetica', 'bold');
    doc.text('Endereço:', 20, yPos + 25);
    doc.setFont('helvetica', 'normal');

    const enderecoText = ordem.endereco || '-';
    const enderecoLines = doc.splitTextToSize(enderecoText, 85);
    doc.text(enderecoLines, 42, yPos + 25);

    // Calcula espaço extra se o endereço quebrar linha (cada linha extra soma aprox. 3.5mm)
    const alturaExtra = (enderecoLines.length - 1) * 3.5;

    // --- NOVO CAMPO: CEP (com posição ajustada pela alturaExtra) ---
    doc.setFont('helvetica', 'bold');
    doc.text('CEP:', 20, yPos + 31 + alturaExtra);
    doc.setFont('helvetica', 'normal');
    if (ordem.cep) {
      doc.text(ordem.cep, 33, yPos + 31 + alturaExtra);
    } else {
      doc.text('____________________', 33, yPos + 31 + alturaExtra);
    }

    // =============================
    // DETALHES DO SERVIÇO
    // =============================
    yPos += 42;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, yPos, 180, 22, 2, 2);

    doc.setFillColor(179, 33, 23);
    doc.roundedRect(15, yPos, 180, 7, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO DO SERVIÇO', 20, yPos + 5);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Serviço:', 20, yPos + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(ordem.servico || '-', 38, yPos + 13);

    doc.setFont('helvetica', 'bold');
    doc.text('Técnico:', 20, yPos + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(ordem.tecnico || '-', 40, yPos + 18);

    doc.setFont('helvetica', 'bold');
    doc.text('Data Execução:', 115, yPos + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(dataStr, 150, yPos + 18);

    // =============================
    // PRODUTOS/MATERIAIS UTILIZADOS
    // =============================
    if (produtos.length) {
      yPos += 28;

      doc.setTextColor(179, 33, 23);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('MATERIAIS E PRODUTOS', 15, yPos);

      doc.setDrawColor(179, 33, 23);
      doc.setLineWidth(0.4);
      doc.line(15, yPos + 1.5, 195, yPos + 1.5);
      yPos += 5;

      // Cabeçalho da tabela
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(15, yPos, 180, 6, 1, 1, 'F');

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIÇÃO', 20, yPos + 4.5);
      doc.text('QTD', 165, yPos + 4.5);

      yPos += 6;

      produtos.forEach(p => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 25;
        }

        // Linha alternada
        doc.setFillColor(250, 250, 250);
        doc.rect(15, yPos, 180, 7, 'F');

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.rect(15, yPos, 180, 7);

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');

        const produtoNome = doc.splitTextToSize(p.name || '-', 125);
        doc.text(produtoNome[0] || '-', 20, yPos + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.text(`${p.qty}x`, 165, yPos + 4.5);

        yPos += 7;
      });
    }

    // =============================
    // RESUMO FINANCEIRO (SOMENTE SE comValores = true)
    // =============================
    if (comValores) {
      yPos += 8;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, yPos, 180, 34, 2, 2);

      doc.setFillColor(179, 33, 23);
      doc.roundedRect(15, yPos, 180, 7, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO FINANCEIRO', 20, yPos + 5);

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8.5);

      // Quantidade de Produtos
      const qtdTotal = produtos.reduce((acc, p) => acc + p.qty, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Total de Itens:', 20, yPos + 14);
      doc.setFont('helvetica', 'normal');
      doc.text(`${qtdTotal} ${qtdTotal === 1 ? 'un' : 'uns'}`, 50, yPos + 14);

      // Forma de Pagamento
      doc.setFont('helvetica', 'bold');
      doc.text('Pagamento:', 20, yPos + 19);
      doc.setFont('helvetica', 'normal');
      doc.text(formaPagamento, 48, yPos + 19);

      // Status de Pagamento
      const statusPago = statusPagamento === 'Pago';
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 110, yPos + 19);

      doc.setFillColor(statusPago ? 220 : 255, statusPago ? 252 : 243, statusPago ? 231 : 224);
      doc.roundedRect(128, yPos + 16, 30, 5, 1, 1, 'F');

      doc.setTextColor(statusPago ? 22 : 220, statusPago ? 163 : 53, statusPago ? 74 : 69);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(statusPagamento.toUpperCase(), 143, yPos + 19.5, { align: 'center' });

      // Linha divisória
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(20, yPos + 24, 190, yPos + 24);

      // Valor Total Destacado
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('VALOR TOTAL', 20, yPos + 29);

      doc.setTextColor(179, 33, 23);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(
        totalFinal.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        190,
        yPos + 29,
        { align: 'right' }
      );

      yPos += 40;
    } else {
      // Espaçamento adicional quando não há resumo financeiro
      yPos += 8;
    }

    // =============================
    // OBSERVAÇÕES / NOTAS
    // =============================
    if (ordem.observacoes || ordem.notas || ordem.descricao) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 25;
      }

      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, yPos, 180, 22, 2, 2);

      doc.setFillColor(255, 251, 235);
      doc.roundedRect(15, yPos, 180, 7, 2, 2, 'F');

      doc.setTextColor(180, 83, 9);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES', 20, yPos + 5);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const observacao = ordem.observacoes || ordem.notas || ordem.descricao;
      const obsLines = doc.splitTextToSize(observacao, 170);
      doc.text(obsLines.slice(0, 2), 20, yPos + 12);

      yPos += 26;
    }

    // =============================
    // TERMOS E CONDIÇÕES
    // =============================
    if (yPos > 210) {
      doc.addPage();
      yPos = 25;
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, yPos, 180, 24, 2, 2);

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, 180, 7, 2, 2, 'F');

    doc.setTextColor(179, 33, 23);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDIÇÕES GERAIS', 20, yPos + 5);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');

    const termos = [
      '• Garantia de 90 dias para serviços e peças instaladas.',
      '• Garantia não cobre mau uso ou danos por terceiros.',
      '• Validade do orçamento: 30 dias.',
    ];

    let termosY = yPos + 11;
    termos.forEach(termo => {
      doc.text(termo, 20, termosY);
      termosY += 4;
    });

    // =============================
    // ASSINATURAS
    // =============================
    yPos += 30;

    if (yPos > 230) {
      doc.addPage();
      yPos = 25;
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, yPos, 180, 38, 2, 2);

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, 180, 7, 2, 2, 'F');

    doc.setTextColor(179, 33, 23);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSINATURAS', 105, yPos + 5, { align: 'center' });

    // Campo Técnico
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(25, yPos + 18, 95, yPos + 18);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Técnico Responsável', 60, yPos + 22, { align: 'center' });

    // Dados do Técnico
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Nome: ${ordem.tecnico || '_____________________'}`, 25, yPos + 27);
    doc.text('Tel: (15) 99137-1232', 25, yPos + 31);
    doc.text('Email: extinmaiss@outlook.com', 25, yPos + 35);

    // Campo Cliente
    doc.setDrawColor(150, 150, 150);
    doc.line(115, yPos + 18, 185, yPos + 18);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 150, yPos + 22, { align: 'center' });

    // Dados do Cliente
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Nome: ${ordem.cliente || '_____________________'}`, 115, yPos + 27);
    doc.text(`CPF/CNPJ: ${ordem.cnpj || '_____________________'}`, 115, yPos + 31);
    doc.text(`End: ${ordem.endereco ? ordem.endereco.substring(0, 35) : '_____________________'}`, 115, yPos + 35);

 
    // =============================
    // RODAPÉ
    // =============================
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(15, 282, 195, 282);
      doc.setTextColor(179, 33, 23);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('EXTINMAIS', 105, 286, { align: 'center' });

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text('CNPJ: 52.026.476/0001-03 | Tel: (15) 99137-1232 | extinmaiss@outlook.com', 105, 289.5, { align: 'center' });
      doc.setFontSize(6.5);
      doc.text(
        `Gerado em ${new Date().toLocaleString('pt-BR')} | Pág ${i}/${pages}`,
        105,
        293,
        { align: 'center' }
      );
    }

    // Nome do arquivo diferente dependendo da opção
    const sufixo = comValores ? 'com_valores' : 'sem_valores';
    doc.save(
      `Nota_Servico_${ordem.cliente || 'cliente'}_${sufixo}_${ordem.id?.slice(0, 8) || Date.now()}.pdf`
    );
    
    showToast(`Nota de Serviço ${comValores ? 'com valores' : 'sem valores'} gerada com sucesso!`, 'success');
  } catch (error) {
    console.error(error);
    showToast('Erro ao gerar PDF: ' + error.message, 'error');
  }
}





// ============================= 
// FUNÇÃO EDITAR OS
// ============================= 
let editingOSId = null;

async function editarOS(orderId) {
  try {
    const snapshot = await database.ref(`orders/${orderId}`).once('value');
    const ordem = snapshot.val();

    if (!ordem) {
      showToast('Ordem não encontrada no banco', 'error');
      return;
    }

    editingOSId = orderId;

    document.getElementById('editCliente').value = ordem.cliente || '';
    document.getElementById('editCNPJ').value = ordem.cnpj || '';
    document.getElementById('editEndereco').value = ordem.endereco || '';
    document.getElementById('editServico').value = ordem.servico || '';
    document.getElementById('editTecnico').value = ordem.tecnico || '';
    document.getElementById('editPagamento').value =
      ordem.payment_method || ordem.formaPagamento || '';

    if (ordem.data) {
      document.getElementById('editData').value =
        new Date(ordem.data).toISOString().split('T')[0];
    }

    document.getElementById('editOSModal').style.display = 'flex';

    showToast('Editando ordem de serviço', 'info');
  } catch (err) {
    console.error(err);
    showToast('Erro ao carregar OS', 'error');
  }
}

async function salvarEdicaoOS() {
  if (!editingOSId) return;

  try {
    const dadosAtualizados = {
      cliente: document.getElementById('editCliente').value,
      cnpj: document.getElementById('editCNPJ').value,
      endereco: document.getElementById('editEndereco').value,
      servico: document.getElementById('editServico').value,
      tecnico: document.getElementById('editTecnico').value,
      payment_method: document.getElementById('editPagamento').value,
      formaPagamento: document.getElementById('editPagamento').value,
      data: document.getElementById('editData').value
        ? new Date(document.getElementById('editData').value).toISOString()
        : null
    };

    await database.ref(`orders/${editingOSId}`).update(dadosAtualizados);

    closeEditOSModal();
    showToast('Ordem atualizada com sucesso!', 'success');

    if (typeof loadOrders === 'function') {
      loadOrders();
    }

  } catch (err) {
    console.error(err);
    showToast('Erro ao salvar edição', 'error');
  }
}

function closeEditOSModal() {
  document.getElementById('editOSModal').style.display = 'none';
}

// ============================= 
// FUNÇÃO EXCLUIR OS
// ============================= 
async function excluirOS(orderId) {
  const ordem = allOrders.find(o => o.id === orderId);
  if (!ordem) {
    showToast('Ordem não encontrada', 'error');
    return;
  }

  const confirmed = await showConfirmDialog(
    'Confirmar Exclusão',
    `Tem certeza que deseja excluir a ordem de <strong>${escapeHtml(ordem.cliente || 'este cliente')}</strong>?<br><br><span style="color: #999;">Esta ação não pode ser desfeita.</span>`
  );

  if (!confirmed) return;

  try {
    showToast('Excluindo ordem...', 'info');

    const ordemRef = firebase.database().ref('orders/' + orderId);
    await ordemRef.remove();

    showToast('Ordem excluída com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao excluir ordem:', error);
    showToast('Erro ao excluir: ' + error.message, 'error');
  }
}

// ============================= 
// DIALOG DE CONFIRMAÇÃO
// ============================= 
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #D4C29A;
      border-radius: 12px;
      padding: 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
      animation: slideUp 0.3s ease;
    `;

    dialog.innerHTML = `
      <h3 style="color: #D4C29A; margin: 0 0 12px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 22px;"></i>
        ${title}
      </h3>
      <p style="color: #fff; margin: 0 0 24px 0; font-size: 14px; line-height: 1.6;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
        <button id="cancelBtn" class="btn-secondary" style="
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          flex: 1;
          min-width: 100px;
        ">
          <i class="fas fa-times" style="margin-right: 6px;"></i>
          Cancelar
        </button>
        <button id="confirmBtn" class="btn-danger" style="
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          flex: 1;
          min-width: 100px;
        ">
          <i class="fas fa-trash" style="margin-right: 6px;"></i>
          Excluir
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('confirmBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    document.getElementById('cancelBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };
  });
}

// ============================= 
// ANIMAÇÕES CSS
// ============================= 
if (!document.getElementById('modalAnimations')) {
  const style = document.createElement('style');
  style.id = 'modalAnimations';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}



// Finalizar OS



async function finalizarOS(orderId) {
  if (!confirm('Deseja finalizar esta Ordem de Serviço?')) return;
  try {
    await database.ref(`orders/${orderId}`).update({
      status: 'finalizada',
      dataFinalizacao: new Date().toISOString()
    });
    showToast('Ordem de Serviço finalizada!');
    await loadOrders();
  } catch (err) {
    console.error('Erro finalizando OS:', err);
    showToast('Erro ao finalizar OS', 'error');
  }
}


// Criar nova OS (handler seguro)
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;

  try {
    // Pegar o tipo do cliente (empresa ou prédio)
    const clienteTipo = document.getElementById('clienteTipoHidden').value;
    const clienteNome = document.getElementById('clienteNomeHidden').value;
    const clienteSelect = document.getElementById('clienteSelect');

    // Pegar CNPJ (sempre visível)
    const cnpj = document.getElementById('cnpjInput').value;

    // Pegar dados específicos dependendo do tipo
    let telefone, email, responsavel, cep, endereco, numeroPredio, numeroEmpresa;

    if (clienteTipo === 'predio') {
      // Dados do prédio
      telefone = document.getElementById('telefonePredioInput')?.value || '';
      email = document.getElementById('emailPredioInput')?.value || '';
      responsavel = document.getElementById('responsavelPredioInput')?.value || '';
      cep = document.getElementById('cepPredioInput')?.value || '';
      endereco = document.getElementById('enderecoPredioInput')?.value || '';
      numeroPredio = document.getElementById('numeroPredioInput')?.value || '';
      numeroEmpresa = '';
    } else {
      // Dados da empresa
      telefone = document.getElementById('telefoneEmpresaInput')?.value || '';
      email = document.getElementById('emailEmpresaInput')?.value || '';
      responsavel = document.getElementById('responsavelEmpresaInput')?.value || '';
      cep = document.getElementById('cepEmpresaInput')?.value || '';
      endereco = document.getElementById('enderecoEmpresaInput')?.value || '';
      numeroEmpresa = document.getElementById('numeroEmpresaInput')?.value || '';
      numeroPredio = '';
    }

    const servico = document.getElementById('servico').value;
    const tecnico = document.getElementById('tecnicoInput').value;
    const status = form.querySelector('[name="status"]').value;

    /* ============================= */
    /* CALCULAR PRODUTOS + LUCRO */
    /* ============================= */

    const subtotal = osSelectedProducts.reduce((acc, p) => {
      return acc + (Number(p.price) * Number(p.qty));
    }, 0);

    const profitPercent = parseFloat(
      document.getElementById('profitPercent')?.value
    ) || 0;

    const profitValue = subtotal * (profitPercent / 100);
    const totalFinal = subtotal + profitValue;

    /* ============================= */
    /* MONTAR OBJETO DA OS */
    /* ============================= */

    const data = {
      cliente: clienteNome,
      clienteId: clienteSelect.value,
      clienteTipo: clienteTipo,
      cnpj: cnpj,
      telefone: telefone,
      email: email,
      responsavel: responsavel,
      cep: cep,
      endereco: endereco,
      numeroPredio: numeroPredio,
      numeroEmpresa: numeroEmpresa,
      servico: servico,
      tecnico: tecnico,

      // PREÇO FINAL DA OS
      preco: totalFinal,
      total: totalFinal,

      // PRODUTOS
      products: osSelectedProducts,
      subtotal: subtotal,
      profitPercent: profitPercent,
      profitValue: profitValue,

      status: status,
      data: new Date().toISOString()
    };


    /* ============================= */
    /* SALVAR NO FIREBASE */
    /* ============================= */

    await database.ref('orders').push(data);

    /* ============================= */
    /* RESET */
    /* ============================= */

    form.reset();
    osSelectedProducts = [];
    renderOSProducts();

    // Esconder campos de empresa e prédio
    const camposEmpresa = document.getElementById('camposEmpresa');
    const camposPredio = document.getElementById('camposPredio');
    if (camposEmpresa) camposEmpresa.style.display = 'none';
    if (camposPredio) camposPredio.style.display = 'none';

    closeModal('orderModal');
    showToast('Ordem de Serviço criada!');
    loadOrders();

  } catch (err) {
    console.error('Erro criando OS:', err);
    showToast('Erro ao criar OS', 'error');
  }
});







// Busca em tempo real (se existir campo)
document.getElementById('orderSearch')?.addEventListener('input', () => {
  renderFilteredOrders();
});

// Filtros (se existir conjunto de botões .filter-btn dentro #ordersSection)
document.querySelectorAll('#ordersSection .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#ordersSection .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderFilteredOrders();
  });
});

// Helper: escapeHtml para evitar injeção simples quando colocamos texto direto no innerHTML


// Inicializa lista ao carregar a página
window.addEventListener('load', () => {
  // delay curto para garantir DB inicializado (se necessário)
  setTimeout(() => {
    loadOrders();
  }, 100);
});

async function viewOrder(orderId) {
  try {
    const snapshot = await database.ref(`orders/${orderId}`).once('value');
    const os = snapshot.val();

    if (!os) {
      showToast('OS não encontrada', 'error');
      return;
    }

    const modalHtml = `
      <div id="viewOrderModal" style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.85);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
        font-family:Arial,sans-serif;
      ">

        <div style="
          background:#1a1a1a;
          border:2px solid #D4C29A;
          border-radius:10px;
          width:92%;
          max-width:380px;
          color:#f5f5f5;
          box-shadow:0 6px 18px rgba(0,0,0,0.6);
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:8px 12px;
            border-bottom:1px solid rgba(212,194,154,0.15);
          ">
            <h3 style="
              margin:0;
              font-size:0.95rem;
              color:#D4C29A;
            ">
              <i class="fas fa-file-invoice"></i> OS
            </h3>

            <button onclick="closeViewOrderModal()" style="
              background:none;
              border:none;
              color:#D4C29A;
              font-size:1rem;
              cursor:pointer;
            ">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div style="
            padding:10px 12px;
            display:grid;
            grid-template-columns:1fr;
            gap:6px;
            font-size:0.82rem;
          ">
            ${compactLine("Cliente", os.cliente)}
            ${compactLine("Serviço", os.servico)}
            ${compactLine("Preço", "R$ " + parseFloat(os.preco || 0).toFixed(2))}
            ${compactLine("Status", os.status)}
            ${compactLine("Data", new Date(os.data).toLocaleDateString('pt-BR'))}
          </div>

          <div style="padding:0 12px 10px;">
            <button onclick="closeViewOrderModal()" style="
              width:100%;
              background:#D4C29A;
              color:#1a1a1a;
              border:none;
              border-radius:8px;
              padding:8px;
              font-size:0.85rem;
              font-weight:bold;
              cursor:pointer;
            ">Fechar</button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

  } catch (err) {
    console.error(err);
    showToast('Erro ao abrir a OS', 'error');
  }
}

function compactLine(label, value) {
  value = value || '-';
  return `
    <div style="
      border:1px solid rgba(212,194,154,0.12);
      border-radius:6px;
      padding:6px 8px;
    ">
      <div style="
        font-size:0.68rem;
        color:#D4C29A;
        margin-bottom:2px;
        text-transform:uppercase;
      ">${label}</div>
      <div style="font-size:0.82rem;">${value}</div>
    </div>
  `;
}

function closeViewOrderModal() {
  const modal = document.getElementById('viewOrderModal');
  if (modal) modal.remove();
}
function preencherTecnicoOS() {
  const tecnicoInput = document.getElementById('tecnicoInput');

  if (tecnicoInput && currentUser?.nome) {
    tecnicoInput.value = currentUser.nome;
  }
}

// sempre que abrir o modal
function openModal(id) {
  document.getElementById(id).classList.add('active');

  if (id === 'orderModal') {
    setTimeout(preencherTecnicoOS, 100);
    loadClientsForOS(); // Carregar empresas para o select
  }
}
// ---------- Helper: preenche campos da nova inspeção -----------
// ---------- Helper: preenche campos da nova inspeção -----------
function preencherDadosInspecaoFromObj(obj) {
  if (!obj) return;

  const isPredio = obj.tipo === 'predio';

  // Mapeia os dados independente da origem (empresa ou prédio)
  const dadosNormalizados = {
    razao_social: isPredio ? (obj.razao_social_predio || obj.razao_social || '') : (obj.razao_social || ''),
    cnpj: isPredio ? (obj.cnpj_predio || obj.cnpj || '') : (obj.cnpj || ''),
    telefone: isPredio ? (obj.telefone_predio || obj.telefone || '') : (obj.telefone || ''),
    responsavel: isPredio ? (obj.responsavel_predio || obj.responsavel || '') : (obj.responsavel || ''),
    cep: isPredio ? (obj.cep_predio || obj.cep || '') : (obj.cep || ''),
    endereco: isPredio ? (obj.endereco_predio || obj.endereco || '') : (obj.endereco || ''),
    numero_predio: isPredio ? (obj.numero_predio || '') : (obj.numero_predio || ''),
    numero_empresa: !isPredio ? (obj.numero_empresa || '') : ''
  };

  // Preenche os campos do formulário com os dados normalizados
  const mapById = {
    'inspecaoRazao': dadosNormalizados.razao_social,
    'inspecaoCnpj': dadosNormalizados.cnpj,
    'inspecaoTelefone': dadosNormalizados.telefone,
    'inspecaoResponsavel': dadosNormalizados.responsavel,
    'inspecaoCep': dadosNormalizados.cep,
    'inspecaoEndereco': dadosNormalizados.endereco,
    'inspecaoNumeroPredio': dadosNormalizados.numero_predio,
    'inspecaoNumeroEmpresa': dadosNormalizados.numero_empresa
  };

  Object.entries(mapById).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  // Também preenche pelos name
  try {
    Object.entries(dadosNormalizados).forEach(([name, val]) => {
      const el = document.querySelector(`#inspectionForm [name="${name}"]`);
      if (el) el.value = val;
    });
  } catch (e) {
    // silencioso
  }
}




// Adicione esta função para alternar entre empresa e prédio
function ajustarFormularioTipo(tipo) {
  const labelRazaoNome = document.getElementById('labelRazaoNome');
  const rowNumeroPredio = document.getElementById('rowNumeroPredio');
  const rowNumeroEmpresa = document.getElementById('rowNumeroEmpresa');

  if (tipo === 'predio') {
    if (labelRazaoNome) labelRazaoNome.textContent = 'Nome do Prédio';
    if (rowNumeroPredio) rowNumeroPredio.style.display = 'flex';
    if (rowNumeroEmpresa) rowNumeroEmpresa.style.display = 'none';
  } else {
    if (labelRazaoNome) labelRazaoNome.textContent = 'Razão Social';
    if (rowNumeroPredio) rowNumeroPredio.style.display = 'none';
    if (rowNumeroEmpresa) rowNumeroEmpresa.style.display = 'flex';
  }
}

// Função que tenta preencher com pequenas tentativas (mais robusto em aparelhos lentos)
function preencherDadosInspecao(obj) {
  if (!obj) return;

  // Ajusta o formulário baseado no tipo
  ajustarFormularioTipo(obj.tipo || 'empresa');

  // tenta algumas vezes, em intervalos curtos, até preencher
  let attempts = 0;
  const maxAttempts = 6;
  const iv = setInterval(() => {
    attempts++;
    preencherDadosInspecaoFromObj(obj);

    // Se já estiver preenchido ao menos o nome, consideramos ok
    const razaoEl = document.querySelector('#inspectionForm [name="razao_social"], #inspecaoRazao');
    if (razaoEl && razaoEl.value && razaoEl.value.trim().length > 0) {
      clearInterval(iv);
      return;
    }

    if (attempts >= maxAttempts) clearInterval(iv);
  }, 100);
}






// ---------- Função alternativa de preenchimento ----------
function preencherDadosInspecaoAlt(data) {
  if (!data) return;

  const set = (name, value) => {
    const el = document.querySelector(`#inspectionFormModal [name="${name}"]`);
    if (el) el.value = value || '';
  };

  set('razao_social', data.razao_social || data.razao_social_predio || '');
  set('cnpj', data.cnpj || data.cnpj_predio || '');
  set('telefone', data.telefone || data.telefone_predio || '');
  set('responsavel', data.responsavel || data.responsavel_predio || '');
  set('cep', data.cep || data.cep_predio || '');
  set('endereco', data.endereco || data.endereco_predio || '');
  set('numero_predio', data.numero_predio || '');
}

// ---------- startInspection para empresa (lista -> iniciar inspeção) ----------
async function startInspection(companyId) {
  try {
    const snapshot = await database.ref(`companies/${companyId}`).once('value');
    const company = snapshot.val();
    if (!company) return showToast('Empresa não encontrada', 'error');

    // guarda para reutilizar
    window.ultimaEmpresaCadastrada = { id: companyId, tipo: 'empresa', ...company };

    // abre modal
    openModal('inspectionFormModal');

    // preenche
    setTimeout(() => preencherDadosInspecao(window.ultimaEmpresaCadastrada), 120);
  } catch (err) {
    console.error('startInspection error:', err);
    showToast('Erro ao iniciar inspeção', 'error');
  }
}


// ---------- startInspectionBuilding para prédio (lista -> iniciar inspeção) ----------
async function startInspectionBuilding(buildingId) {
  try {
    const snapshot = await database.ref(`buildings/${buildingId}`).once('value');
    const building = snapshot.val();
    if (!building) return showToast('Prédio não encontrado', 'error');

    // IMPORTANTE: Garantir que o objeto tenha o 'tipo' e os dados corretos
    window.ultimaEmpresaCadastrada = {
      ...building,
      id: buildingId,
      tipo: 'predio' // Isso identifica que é um prédio para o PDF
    };

    openModal('inspectionFormModal');

    // Delay para garantir que o DOM do modal carregou
    setTimeout(() => preencherDadosInspecao(window.ultimaEmpresaCadastrada), 120);
  } catch (err) {
    console.error('startInspectionBuilding error:', err);
    showToast('Erro ao iniciar inspeção do prédio', 'error');
  }
}

// ---------- Se você abrir o modal manualmente, também preenche se última empresa/prédio existir ----------
if (!window.openModalOriginal) {
  window.openModalOriginal = window.openModal || function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  };

  window.openModal = function (id) {
    // chama original (preserva comportamento antigo)
    window.openModalOriginal(id);

    if (id === 'inspectionFormModal') {
      if (window.ultimaEmpresaCadastrada) {
        // ajusta o formulário baseado no tipo
        ajustarFormularioTipo(window.ultimaEmpresaCadastrada.tipo || 'empresa');
        // espera o modal ficar visível e preenche
        setTimeout(() => preencherDadosInspecao(window.ultimaEmpresaCadastrada), 120);
      } else {
        // se não tiver dados prévios, assume empresa como padrão
        ajustarFormularioTipo('empresa');
      }
    }
  };
}


// ---------- Se você abrir o modal manualmente, também preenche se última empresa/prédio existir ----------
if (!window.openModalOriginal) {
  window.openModalOriginal = window.openModal || function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  };

  window.openModal = function (id) {
    // chama original (preserva comportamento antigo)
    window.openModalOriginal(id);

    if (id === 'inspectionFormModal') {
      if (window.ultimaEmpresaCadastrada) {
        // ajusta o formulário baseado no tipo
        ajustarFormularioTipo(window.ultimaEmpresaCadastrada.tipo || 'empresa');
        // espera o modal ficar visível e preenche
        setTimeout(() => preencherDadosInspecao(window.ultimaEmpresaCadastrada), 120);
      } else {
        // se não tiver dados prévios, assume empresa como padrão
        ajustarFormularioTipo('empresa');
      }
    }
  };
}


// ==========================
// 🔒 CONTROLE GLOBAL INPUTS NUMBER
// ==========================

document.addEventListener('focusin', function (e) {
  const el = e.target;

  if (el.tagName === 'INPUT' && el.type === 'number') {
    // Remove o "0" ao clicar
    if (el.value === '0') {
      el.value = '';
    }
  }
});

document.addEventListener('input', function (e) {
  const el = e.target;

  if (el.tagName === 'INPUT' && el.type === 'number') {
    // Bloqueia valores negativos
    if (el.value.startsWith('-')) {
      el.value = el.value.replace('-', '');
    }
  }
});

// Garante que ao sair do campo vazio ele vire 0 de novo
document.addEventListener('blur', function (e) {
  const el = e.target;

  if (el.tagName === 'INPUT' && el.type === 'number') {
    if (el.value.trim() === '') {
      el.value = '0';
    }
  }
}, true);
// Remove sugestões de todos os inputs, selects e textareas do site
document.addEventListener('DOMContentLoaded', () => {
  const campos = document.querySelectorAll('input, textarea, select');
  campos.forEach(campo => {
    campo.setAttribute('autocomplete', 'off');
    campo.setAttribute('autocorrect', 'off');
    campo.setAttribute('autocapitalize', 'off');
    campo.setAttribute('spellcheck', 'false');
  });
});
// Sub Abas - Ordens de Serviço
document.querySelectorAll('.orders-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.getAttribute('data-tab');

    // Ativa o botão selecionado
    document.querySelectorAll('.orders-tab').forEach(btn => {
      btn.classList.remove('active');
    });
    tab.classList.add('active');

    // Mostra o conteúdo correto
    document.querySelectorAll('.orders-tab-content').forEach(content => {
      content.classList.remove('active');
    });

    const targetContent = document.getElementById(`orders-tab-${targetTab}`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});
/* ============================= */
/* PRODUTOS - BASE GLOBAL */
/* ============================= */

let products = [];
let osSelectedProducts = [];

/* ============================= */
/* SALVAR PRODUTO NO FIREBASE */
/* ============================= */

function saveProduct() {
  const name = document.getElementById('productName').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);



  const productId = Date.now();

  const productData = {
    id: productId,
    name,
    description,
    price,
  };

  firebase.database().ref('products/' + productId).set(productData)
    .then(() => {
      closeProductModal();
      clearProductForm();
    })
    .catch(err => {
      console.error(err);
      alert('Erro ao salvar produto.');
    });
}

/* ============================= */
/* LIMPAR FORM PRODUTO */
/* ============================= */

function clearProductForm() {
  document.getElementById('productName').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productPrice').value = '';
}

/* ============================= */
/* CARREGAR PRODUTOS DO FIREBASE */
/* ============================= */

function loadProducts() {
  firebase.database().ref('products').on('value', snapshot => {
    products = [];

    snapshot.forEach(child => {
      products.push(child.val());
    });

    renderProducts();
    populateOSProductSelect();
  });
}

/* ============================= */
/* RENDERIZAR LISTA DE PRODUTOS */
/* ============================= */
function renderProducts() {
  const list = document.getElementById('productsList');
  if (!list) return;

  list.innerHTML = '';

  if (!products || products.length === 0) {
    list.innerHTML = `
      <p style="color:#777; text-align:center; margin-top:20px;">
        Nenhum produto cadastrado.
      </p>
    `;
    return;
  }

  products.forEach(prod => {
    const item = document.createElement('div');

    item.style.cssText = `
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#1b1b1b;
  border:1px solid #2f2f2f;
  border-radius:12px;
  padding:14px 16px;
  margin-bottom:12px;
  gap:14px;
  transition:background 0.2s, border 0.2s;
`;

    item.onmouseover = () => {
      item.style.background = '#202020';
      item.style.borderColor = '#3a3a3a';
    };
    item.onmouseout = () => {
      item.style.background = '#1b1b1b';
      item.style.borderColor = '#2f2f2f';
    };

    item.innerHTML = `
  <div style="flex:1; min-width:0;">
    
    <div style="
      color:#f1f1f1;
      font-weight:600;
      font-size:15px;
      line-height:1.3;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    ">
      ${escapeHtml(prod.name)}
    </div>

    <div style="
      color:#8b8b8b;
      font-size:13px;
      margin-top:4px;
      line-height:1.4;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    ">
      ${escapeHtml(prod.description || 'Sem descrição')}
    </div>

    <div style="
      margin-top:8px;
      font-size:13px;
      color:#a3a3a3;
      display:flex;
      align-items:center;
      gap:8px;
    ">
      <span style="
        color:#4ade80;
        font-weight:600;
      ">
        R$ ${prod.price.toFixed(2)}
      </span>
    </div>

  </div>

  <button
    onclick="deleteProduct('${prod.id}')"
    title="Excluir produto"
    style="
      background:#1f1f1f;
      border:1px solid #333;
      color:#ef4444;
      border-radius:10px;
      padding:8px 10px;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      transition:background 0.2s, color 0.2s, border 0.2s;
    "
    onmouseover="
      this.style.background='#2a2a2a';
      this.style.color='#ff6b6b';
      this.style.borderColor='#444';
    "
    onmouseout="
      this.style.background='#1f1f1f';
      this.style.color='#ef4444';
      this.style.borderColor='#333';
    "
  >
    <i class="fas fa-trash"></i>
  </button>
`;

    list.appendChild(item);
  });
}
async function deleteProduct(productId) {
  if (!productId) return;

  const confirmDelete = confirm('Deseja realmente excluir este produto?');
  if (!confirmDelete) return;

  try {
    await database.ref('products/' + productId).remove();

    // remove da lista local
    products = products.filter(p => p.id !== productId);

    renderProducts();
    populateOSProductSelect();

    showToast('Produto removido com sucesso!');
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    showToast('Erro ao excluir produto', 'error');
  }
}


/* ============================= */
/* POPULAR SELECT DA OS */
/* ============================= */

function populateOSProductSelect() {
  const select = document.getElementById('osProductSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um produto</option>';

  products.forEach(prod => {
    const opt = document.createElement('option');
    opt.value = prod.id;
    opt.textContent = `${prod.name} - R$ ${prod.price.toFixed(2)}`;
    select.appendChild(opt);
  });
}

/* ============================= */
/* ADICIONAR PRODUTO À OS */
/* ============================= */

document.addEventListener('click', function (e) {
  if (e.target && (e.target.id === 'addProductToOSBtn' || e.target.closest('#addProductToOSBtn'))) {
    abrirModalSelecionarProdutoOS();
  }
});
function abrirModalSelecionarProdutoOS() {
  const modalHtml = `
    <div id="selectProductOSModal" style="
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      backdrop-filter: blur(4px);
    ">
      <div style="
        background: linear-gradient(145deg, #1f1f1f 0%, #1a1a1a 100%);
        border: 2px solid #10b981;
        border-radius: 16px;
        width: 100%;
        max-width: 520px;
        max-height: 85vh;
        color: #f5f5f5;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.1);
        display: flex;
        flex-direction: column;
        animation: slideIn 0.3s ease-out;
      ">
        <style>
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          #productOSModalList::-webkit-scrollbar {
            width: 8px;
          }
          #productOSModalList::-webkit-scrollbar-track {
            background: #0d0d0d;
            border-radius: 10px;
          }
          #productOSModalList::-webkit-scrollbar-thumb {
            background: #10b981;
            border-radius: 10px;
          }
          #productOSModalList::-webkit-scrollbar-thumb:hover {
            background: #0d9668;
          }
        </style>

        <!-- Header -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 22px;
          border-bottom: 2px solid #10b981;
          background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
          border-radius: 14px 14px 0 0;
          flex-shrink: 0;
        ">
          <h3 style="
            margin: 0;
            font-size: 1.25rem;
            color: #10b981;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
            letter-spacing: 0.3px;
          ">
            <i class="fas fa-search" style="font-size: 1.1rem;"></i>
            Selecionar Produto
          </h3>
          <button onclick="fecharModalSelecionarProdutoOS()" style="
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
          " onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='#ef4444'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)'">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Campo de Busca -->
        <div style="padding: 20px 22px; border-bottom: 1px solid #2a2a2a; flex-shrink: 0; background: #1a1a1a;">
          <div style="position: relative;">
            <input type="text" id="searchProductOSInput" placeholder="Digite para buscar produtos..." style="
              width: 100%;
              padding: 14px 16px 14px 46px;
              background: #0d0d0d;
              border: 2px solid #333;
              border-radius: 10px;
              color: #fff;
              font-size: 0.95rem;
              transition: all 0.3s ease;
              box-sizing: border-box;
              font-weight: 500;
            " onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'" onblur="this.style.borderColor='#333'; this.style.boxShadow='none'" oninput="filtrarProdutosOSModal()">
            <i class="fas fa-search" style="
              position: absolute;
              left: 16px;
              top: 50%;
              transform: translateY(-50%);
              color: #10b981;
              font-size: 16px;
            "></i>
          </div>
        </div>

        <!-- Lista de Produtos -->
        <div id="productOSModalList" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px 22px;
          background: #1a1a1a;
        ">
          <!-- Produtos serão inseridos aqui -->
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  renderizarListaProdutosOSModal();
}
function filtrarProdutosOSModal() {
  const input = document.getElementById('searchProductOSInput');
  if (!input) return;
  renderizarListaProdutosOSModal(input.value);
}


function fecharModalSelecionarProdutoOS() {
  const modal = document.getElementById('selectProductOSModal');
  if (modal) modal.remove();
}

function renderizarListaProdutosOSModal(filtro = '') {
  const container = document.getElementById('productOSModalList');
  if (!container) return;

  const filtroLower = filtro.toLowerCase();
  const produtosFiltrados = products.filter(p => 
    p.name.toLowerCase().includes(filtroLower) || 
    (p.description && p.description.toLowerCase().includes(filtroLower))
  );

  if (produtosFiltrados.length === 0) {
    container.innerHTML = `
      <div style="
        padding: 60px 20px;
        text-align: center;
        color: #666;
      ">
        <i class="fas fa-box-open" style="font-size: 4rem; margin-bottom: 16px; color: #10b981; opacity: 0.3;"></i>
        <p style="margin: 0; font-size: 15px; font-weight: 500;">Nenhum produto encontrado</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #555;">Tente buscar com outros termos</p>
      </div>
    `;
    return;
  }

  container.innerHTML = produtosFiltrados.map(prod => `
    <div onclick="selecionarProdutoOSModal(${prod.id})" style="
      background: linear-gradient(135deg, #0d0d0d 0%, #121212 100%);
      border: 2px solid #2a2a2a;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    " onmouseover="this.style.background='linear-gradient(135deg, #1a1a1a 0%, #1f1f1f 100%)'; this.style.borderColor='#10b981'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(16, 185, 129, 0.2)'" onmouseout="this.style.background='linear-gradient(135deg, #0d0d0d 0%, #121212 100%)'; this.style.borderColor='#2a2a2a'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
      
      <div style="
        position: absolute;
        top: 0;
        right: 0;
        width: 60px;
        height: 60px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
        border-radius: 0 0 0 100%;
      "></div>

      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        "></div>
        <div style="
          color: #fff;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: 0.3px;
        ">
          ${escapeHtml(prod.name)}
        </div>
      </div>

      <div style="
        color: #999;
        font-size: 13px;
        margin-bottom: 12px;
        line-height: 1.5;
        padding-left: 18px;
      ">
        ${escapeHtml(prod.description || 'Sem descrição disponível')}
      </div>

      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-left: 18px;
      ">
        <div style="
          color: #4ade80;
          font-weight: 800;
          font-size: 18px;
          text-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
        ">
          R$ ${prod.price.toFixed(2)}
        </div>
        <div style="
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(16, 185, 129, 0.3);
        ">
          <i class="fas fa-plus" style="margin-right: 4px;"></i>
          Adicionar
        </div>
      </div>

    </div>
  `).join('');
}
function selecionarProdutoOSModal(productId) {
  const produto = products.find(p => p.id === productId);
  if (!produto) return;

  const qtdInput = document.getElementById('osProductQty');
  const qty = parseInt(qtdInput?.value) || 1;
  
  if (qty <= 0) {
    showToast('Quantidade inválida', 'error');
    return;
  }
  
  osSelectedProducts.push({ 
    id: produto.id, 
    name: produto.name, 
    qty: qty,
    price: produto.price 
  });
  
  if (qtdInput) qtdInput.value = '1';
  
  renderOSProducts();
  fecharModalSelecionarProdutoOS();
  showToast(`${produto.name} adicionado com sucesso!`, 'success');
}


/* ============================= */
/* RENDER PRODUTOS DA OS */
/* ============================= */

function renderOSProducts() {
  const list = document.getElementById('osProductsList');
  if (!list) return;

  list.innerHTML = '';

  if (osSelectedProducts.length === 0) {
    list.innerHTML = `
      <div style="
        padding: 30px 20px;
        text-align: center;
        color: #666;
      ">
        <i class="fas fa-shopping-basket" style="font-size: 2.5rem; margin-bottom: 10px; color: #10b981; opacity: 0.3;"></i>
        <p style="margin: 0; font-size: 14px;">Nenhum produto adicionado</p>
      </div>
    `;
    updateOSProductTotals();
    return;
  }

  osSelectedProducts.forEach((prod, index) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      background: linear-gradient(135deg, #2a2a2a 0%, #242424 100%);
      border:2px solid #333;
      border-radius:10px;
      padding:14px 16px;
      margin-bottom:10px;
      transition: all 0.3s ease;
    `;

    item.onmouseover = function() {
      this.style.borderColor = '#10b981';
      this.style.transform = 'translateX(4px)';
    };
    item.onmouseout = function() {
      this.style.borderColor = '#333';
      this.style.transform = 'translateX(0)';
    };

    item.innerHTML = `
      <div style="flex: 1;">
        <div style="
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <i class="fas fa-box" style="color: #10b981; font-size: 13px;"></i>
          ${escapeHtml(prod.name)}
        </div>
        <div style="
          display: flex;
          gap: 16px;
          color: #aaa;
          font-size: 13px;
        ">
          <span><strong style="color: #10b981;">Qtd:</strong> ${prod.qty}</span>
          <span><strong style="color: #10b981;">Unit:</strong> R$ ${prod.price.toFixed(2)}</span>
          <span><strong style="color: #4ade80;">Total:</strong> R$ ${(prod.price * prod.qty).toFixed(2)}</span>
        </div>
      </div>
      <button
        data-remove-os-product="${prod.id}"
        style="
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          cursor: pointer;
          font-size: 1rem;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        "
        onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='#ef4444'; this.style.transform='scale(1.1)'"
        onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)'; this.style.transform='scale(1)'"
        title="Remover produto"
      >
        <i class="fas fa-trash-alt"></i>
      </button>
    `;

    list.appendChild(item);
  });

  updateOSProductTotals();
}


/* ============================= */
/* REMOVER PRODUTO DA OS */
/* ============================= */

function removeProductFromOS(id) {
  const produtoRemovido = osSelectedProducts.find(p => p.id === id);
  osSelectedProducts = osSelectedProducts.filter(p => p.id !== id);
  renderOSProducts();
  if (produtoRemovido) {
    showToast(`${produtoRemovido.name} removido com sucesso`, 'success');
  }
}


document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-remove-os-product]');
  if (btn) {
    const productId = parseInt(btn.getAttribute('data-remove-os-product'));
    removeProductFromOS(productId);
  }
});

/* ============================= */
/* CALCULAR TOTAIS + LUCRO */
/* ============================= */

function updateOSProductTotals() {
  const subtotal = osSelectedProducts.reduce((acc, p) => {
    return acc + (Number(p.price) * Number(p.qty));
  }, 0);

  const profitPercent = parseFloat(
    document.getElementById('profitPercent')?.value
  ) || 0;

  const profitValue = subtotal * (profitPercent / 100);
  const totalFinal = subtotal + profitValue;

  const subtotalEl = document.getElementById('productsSubtotal');
  const profitEl = document.getElementById('productsProfitValue');
  const totalEl = document.getElementById('productsTotalWithProfit');

  if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  if (profitEl) profitEl.textContent = `R$ ${profitValue.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `R$ ${totalFinal.toFixed(2)}`;
}



/* ============================= */
/* LISTENER LUCRO (%) */
/* ============================= */

document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'profitPercent') {
    updateOSProductTotals();
  }
});

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


/* ============================= */
/* INICIALIZA PRODUTOS */
/* ============================= */

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});
/* Abrir modal de produto */
function openProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.add('active');
  }
}

/* Fechar modal de produto */
function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    modal.classList.remove('active');
  }
}
document.getElementById('addExtintorBtn')?.addEventListener('click', () => {
  const section = document.getElementById('extintoresSection');
  const items = section.querySelectorAll('.extintor-item');
  const lastIndex = items.length - 1;
  const newIndex = lastIndex + 1;

  const clone = items[0].cloneNode(true);
  clone.dataset.index = newIndex;

  clone.querySelectorAll('input, select').forEach(field => {
    const baseName = field.name.replace(/_\d+$/, '');
    field.name = `${baseName}_${newIndex}`;
    field.value = '';
  });

  section.insertBefore(clone, document.getElementById('addExtintorBtn'));
});
// Função para alternar entre Card e Lista
function toggleView(viewMode) {
  const buttons = document.querySelectorAll('.view-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === viewMode) {
      btn.classList.add('active');
    }
  });

  const ordersList = document.getElementById('ordersList');
  if (viewMode === 'list') {
    ordersList.classList.add('list-view');
  } else {
    ordersList.classList.remove('list-view');
  }

  // Salva preferência no localStorage
  localStorage.setItem('ordersViewMode', viewMode);
}

// Carregar preferência salva ao iniciar (cole no final do seu código de inicialização)
window.addEventListener('DOMContentLoaded', () => {
  const savedView = localStorage.getItem('ordersViewMode') || 'card';
  toggleView(savedView);
});

const searchInput = document.getElementById('productSearch');

searchInput.addEventListener('input', () => {
  const search = searchInput.value.toLowerCase().trim();

  // 👉 pega TODOS os filhos diretos da lista
  const list = document.getElementById('productsList');
  if (!list) return;

  const items = list.children;

  Array.from(items).forEach(item => {
    const text = item.innerText.toLowerCase();

    item.style.display = text.includes(search) ? '' : 'none';
  });
});

// ========================================
// SISTEMA DE ALERTAS - MOBILE FIRST
// ========================================

let todosAlertas = [];
let alertasFiltrados = [];
let filtroAtual = 'all';
let alertaSelecionado = null;
let paginaAtual = 1;
let itensPorPagina = 10;
let empresasExpandidas = new Set();
let inspecoesExpandidas = new Set();



// ========================================
// CRIAR MODAL DE EDIÇÃO
// ========================================
function criarModalValidade() {
  if (document.getElementById('editValidadeModal')) {
    return;
  }

  const modalHTML = `
    <div id="editValidadeModal" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3><i class="fas fa-edit"></i> Editar Validade</h3>
          <button class="btn-close-modal" onclick="fecharModalValidade()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="info-card">
            <div class="info-row">
              <i class="fas fa-building"></i>
              <div>
                <span class="label">Empresa</span>
                <span class="value" id="modalEmpresa">-</span>
              </div>
            </div>
            
            <div class="info-row">
              <i class="fas fa-tag"></i>
              <div>
                <span class="label">Item</span>
                <span class="value" id="modalTipo">-</span>
              </div>
            </div>
            
            <div class="info-row status-row" id="modalStatus">
              <i class="fas fa-exclamation-triangle"></i>
              <div>
                <span class="label">Status</span>
                <span class="value" id="modalStatusTexto">-</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>
        <i class="fas fa-calendar-alt" style="font-size: 15px;"></i>
              Nova Data de Validade
            </label>
            <input 
              type="date" 
              id="inputNovaValidade" 
              class="input-date"
            >
          </div>
          
          <div class="info-atual">
            <i class="fas fa-info-circle"></i>
            <div>
              <strong>Validade atual:</strong>
              <span id="modalValidadeAtual">-</span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" onclick="fecharModalValidade()">
            <i class="fas fa-times"></i>
            Cancelar
          </button>
          <button class="btn-save" onclick="salvarNovaValidade()">
            <i class="fas fa-save"></i>
            Salvar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========================================
// BUSCAR E AGRUPAR ALERTAS
// ========================================
async function buscarAlertasVencimento() {
  const inspectionsRef = firebase.database().ref('inspections');

  inspectionsRef.on('value', (snapshot) => {
    try {
      const inspections = snapshot.val();

      if (!inspections) {
        todosAlertas = [];
        alertasFiltrados = [];
        atualizarContadores();
        renderizarAlertas();
        return;
      }

      const empresasMap = {};

      Object.entries(inspections).forEach(([id, inspecao]) => {
        const razaoSocial = inspecao.razao_social || 'Empresa sem nome';
        const cnpj = inspecao.cnpj || '-';
        const dataInspecao = inspecao.data_inspecao || null;

        if (!empresasMap[razaoSocial]) {
          empresasMap[razaoSocial] = {
            empresa: razaoSocial,
            cnpj: cnpj,
            inspecoes: [],
            totalVencidos: 0,
            totalProximos: 0
          };
        }

        const itensVencidos = [];

        // Verifica todos os campos da inspeção
        Object.keys(inspecao).forEach(campo => {
          // Busca apenas campos que terminam com "validade"
          if (campo.endsWith('validade') && !campo.includes('inicio') && inspecao[campo]) {
            const dataValidade = inspecao[campo];
            const diasRestantes = calcularDiasRestantes(dataValidade);

            if (diasRestantes !== null) {
              const status = determinarStatus(diasRestantes);

              if (status !== 'ok') {
                const tipo = formatarTipoCampo(campo, inspecao);

                itensVencidos.push({
                  id: `${id}-${campo}`,
                  tipo: tipo,
                  validade: dataValidade,
                  diasRestantes: diasRestantes,
                  status: status,
                  campo: campo,
                  inspectionId: id
                });

                if (status === 'vencido') {
                  empresasMap[razaoSocial].totalVencidos++;
                } else if (status === 'proximo') {
                  empresasMap[razaoSocial].totalProximos++;
                }
              }
            }
          }
        });

        // Verifica extintores individuais (extintores_validade_1, extintores_validade_2, etc.)
        Object.keys(inspecao).forEach(campo => {
          if (campo.startsWith('extintores_validade_') && inspecao[campo]) {
            const dataValidade = inspecao[campo];
            const diasRestantes = calcularDiasRestantes(dataValidade);

            if (diasRestantes !== null) {
              const status = determinarStatus(diasRestantes);

              if (status !== 'ok') {
                const tipo = formatarTipoCampo(campo, inspecao);

                itensVencidos.push({
                  id: `${id}-${campo}`,
                  tipo: tipo,
                  validade: dataValidade,
                  diasRestantes: diasRestantes,
                  status: status,
                  campo: campo,
                  inspectionId: id
                });

                if (status === 'vencido') {
                  empresasMap[razaoSocial].totalVencidos++;
                } else if (status === 'proximo') {
                  empresasMap[razaoSocial].totalProximos++;
                }
              }
            }
          }
        });

        // Verifica o campo geral de validade dos extintores (extintores_validade)
        if (inspecao.extintores_validade) {
          const dataValidade = inspecao.extintores_validade;
          const diasRestantes = calcularDiasRestantes(dataValidade);

          if (diasRestantes !== null) {
            const status = determinarStatus(diasRestantes);

            if (status !== 'ok') {
              const tipo = formatarTipoCampo('extintores_validade', inspecao);

              itensVencidos.push({
                id: `${id}-extintores_validade`,
                tipo: tipo,
                validade: dataValidade,
                diasRestantes: diasRestantes,
                status: status,
                campo: 'extintores_validade',
                inspectionId: id
              });

              if (status === 'vencido') {
                empresasMap[razaoSocial].totalVencidos++;
              } else if (status === 'proximo') {
                empresasMap[razaoSocial].totalProximos++;
              }
            }
          }
        }

        if (itensVencidos.length > 0) {
          empresasMap[razaoSocial].inspecoes.push({
            inspectionId: id,
            dataInspecao: dataInspecao,
            itens: itensVencidos.sort((a, b) => {
              if (a.status === 'vencido' && b.status !== 'vencido') return -1;
              if (a.status !== 'vencido' && b.status === 'vencido') return 1;
              return a.diasRestantes - b.diasRestantes;
            })
          });
        }
      });

      const empresasArray = Object.values(empresasMap)
        .filter(emp => emp.inspecoes.length > 0)
        .sort((a, b) => {
          if (a.totalVencidos !== b.totalVencidos) return b.totalVencidos - a.totalVencidos;
          if (a.totalProximos !== b.totalProximos) return b.totalProximos - a.totalProximos;
          return a.empresa.localeCompare(b.empresa);
        });

      todosAlertas = empresasArray;
      alertasFiltrados = empresasArray;

      atualizarContadores();
      renderizarAlertas();

    } catch (error) {
      console.error('Erro ao processar alertas:', error);
    }
  }, (error) => {
    console.error('Erro na conexão em tempo real:', error);
    showToast('Erro ao sincronizar alertas', 'error');
  });
}





// Função auxiliar para manter o código principal limpo
function formatarTipoCampo(campo, inspecao) {
  if (campo === 'cert_validade') return `Certificado ${inspecao.cert_tipo || ''}`;
  if (campo.startsWith('extintores_validade_')) {
    const index = campo.replace('extintores_validade_', '');
    return `${inspecao[`extintores_tipo_${index}`] || 'Extintor'} ${inspecao[`extintores_peso_${index}`] || ''}`.trim();
  }
  const nomes = {
    'alarme_incendio_validade': 'Alarme de Incêndio',
    'botoeira_validade': 'Botoeira',
    'central_alarme_validade': 'Central de Alarme',
    'detector_fumaca_validade': 'Detector de Fumaça',
    'hidrante_validade': 'Hidrante',
    'iluminacao_emergencia_validade': 'Iluminação de Emergência',
    'mangueira_validade': 'Mangueira',
    'projeto_spda_validade': 'Projeto SPDA',
    'sprinklers_validade': 'Sprinklers'
  };
  return nomes[campo] || campo.replace('_validade', '').replace(/_/g, ' ');
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================
function calcularDiasRestantes(dataValidade) {
  if (!dataValidade) return null;

  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const validade = new Date(dataValidade);

    // Verificar se a data é válida
    if (isNaN(validade.getTime())) {
      return null;
    }

    validade.setHours(0, 0, 0, 0);

    const diffTime = validade - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    return null;
  }
}

function determinarStatus(diasRestantes) {
  if (diasRestantes === null) return 'ok';
  if (diasRestantes < 0) {
    return 'vencido';
  } else if (diasRestantes <= 30) {
    return 'proximo';
  }
  return 'ok';
}

function formatarData(dataStr) {
  if (!dataStr) return '-';

  try {
    const data = new Date(dataStr);

    // Verificar se a data é válida
    if (isNaN(data.getTime())) {
      return '-';
    }

    return data.toLocaleDateString('pt-BR');
  } catch (error) {
    return '-';
  }
}

function atualizarContadores() {
  let totalItens = 0;
  let totalVencidos = 0;
  let totalProximos = 0;

  todosAlertas.forEach(empresa => {
    totalVencidos += empresa.totalVencidos;
    totalProximos += empresa.totalProximos;
    empresa.inspecoes.forEach(inspecao => {
      totalItens += inspecao.itens.length;
    });
  });

  const alertsBadge = document.getElementById('alertsBadge');
  const totalAlertasEl = document.getElementById('totalAlertas');

  if (alertsBadge) alertsBadge.textContent = totalItens;
  if (totalAlertasEl) totalAlertasEl.textContent = totalItens;

  const countAll = document.getElementById('countAll');
  const countVencido = document.getElementById('countVencido');
  const countProximo = document.getElementById('countProximo');

  if (countAll) countAll.textContent = totalItens;
  if (countVencido) countVencido.textContent = totalVencidos;
  if (countProximo) countProximo.textContent = totalProximos;
}

// ========================================
// TOGGLE FUNCTIONS
// ========================================
function toggleAlertsList() {
  const body = document.getElementById('alertsBody');
  const btn = document.getElementById('alertsToggleBtn');

  if (body.style.display === 'none') {
    body.style.display = 'block';
    btn.classList.add('open');
  } else {
    body.style.display = 'none';
    btn.classList.remove('open');
  }
}

function toggleEmpresa(empresaNome) {
  if (empresasExpandidas.has(empresaNome)) {
    empresasExpandidas.delete(empresaNome);
  } else {
    empresasExpandidas.add(empresaNome);
  }
  renderizarAlertas();
}

function toggleInspecao(inspectionId) {
  if (inspecoesExpandidas.has(inspectionId)) {
    inspecoesExpandidas.delete(inspectionId);
  } else {
    inspecoesExpandidas.add(inspectionId);
  }
  renderizarAlertas();
}

// ========================================
// FILTROS
// ========================================
function filterAlerts(tipo) {
  filtroAtual = tipo;
  paginaAtual = 1;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const filterBtn = document.querySelector(`[data-filter="${tipo}"]`);
  if (filterBtn) {
    filterBtn.classList.add('active');
  }

  if (tipo === 'all') {
    alertasFiltrados = todosAlertas;
  } else {
    alertasFiltrados = todosAlertas.map(empresa => {
      const inspecoesFiltradas = empresa.inspecoes.map(inspecao => {
        const itensFiltrados = inspecao.itens.filter(item => item.status === tipo);
        if (itensFiltrados.length > 0) {
          return { ...inspecao, itens: itensFiltrados };
        }
        return null;
      }).filter(i => i !== null);

      if (inspecoesFiltradas.length > 0) {
        const totalVencidos = inspecoesFiltradas.reduce((sum, insp) =>
          sum + insp.itens.filter(i => i.status === 'vencido').length, 0);
        const totalProximos = inspecoesFiltradas.reduce((sum, insp) =>
          sum + insp.itens.filter(i => i.status === 'proximo').length, 0);

        return {
          ...empresa,
          inspecoes: inspecoesFiltradas,
          totalVencidos,
          totalProximos
        };
      }
      return null;
    }).filter(e => e !== null);
  }

  renderizarAlertas();
}

// ========================================
// RENDERIZAR ALERTAS (MOBILE FIRST)
// ========================================
function renderizarAlertas() {
  const container = document.getElementById('alertsList');
  const paginationContainer = document.getElementById('paginationContainer');

  if (!container) return;

  if (alertasFiltrados.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px; text-align: center; color: #D4C29A;">
        <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Nenhum item ${filtroAtual === 'vencido' ? 'vencido' : filtroAtual === 'proximo' ? 'próximo do vencimento' : 'vencido ou próximo'}</p>
      </div>
    `;
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }

  const totalItens = alertasFiltrados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  if (paginaAtual < 1) paginaAtual = 1;

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = Math.min(inicio + itensPorPagina, totalItens);
  const empresasPaginadas = alertasFiltrados.slice(inicio, fim);

  const btnPDFGeral = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; width: 100%; background: #1a1a1a; padding: 15px; border-radius: 12px; border: 1px solid #333;">
      <div style="color: #efefef; font-size: 0.9rem;">
        <i class="fas fa-file-invoice" style="color: #D4C29A; margin-right: 8px;"></i>
        Relatório de <strong>${totalItens}</strong> registros
      </div>
      <button onclick="gerarPDFVencimentos()" style="
        background: linear-gradient(180deg, #D4C29A, #a7926d);
        color: #0f0f0f;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      " onmouseover="this.style.filter='brightness(1.2)'; this.style.transform='scale(1.02)'" onmouseout="this.style.filter='none'; this.style.transform='scale(1)'">
        <i class="fas fa-file-pdf"></i> Exportar Tudo
      </button>
    </div>
  `;

  container.innerHTML = btnPDFGeral + empresasPaginadas.map(empresa => {
    const isEmpresaExpanded = empresasExpandidas.has(empresa.empresa);
    const statusClass = empresa.totalVencidos > 0 ? 'vencido' : 'proximo';
    const empresaNomeEscaped = empresa.empresa.replace(/'/g, "\\'");

    return `
      <div class="empresa-card ${statusClass}">
        <div class="empresa-header" onclick="toggleEmpresa('${empresaNomeEscaped}')">
          <div class="empresa-info">
            <div class="empresa-icon">
              <i class="fas fa-building"></i>
            </div>
            <div class="empresa-data">
              <div class="empresa-nome">${empresa.empresa}</div>
              <div class="empresa-cnpj">${empresa.cnpj}</div>
            </div>
          </div>
          
          <div class="empresa-badges" style="display: flex; align-items: center; gap: 12px;">
            <button onclick="event.stopPropagation(); gerarPDFVencimentos('${empresaNomeEscaped}')" 
              title="Baixar PDF desta empresa" 
              style="
                background: transparent;
                border: 1px solid #D4C29A;
                padding: 6px 10px;
                border-radius: 6px;
                cursor: pointer;
                color: #D4C29A;
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s;
              "
              onmouseover="this.style.background='#D4C29A'; this.style.color='#0f0f0f'" 
              onmouseout="this.style.background='transparent'; this.style.color='#D4C29A'">
              <i class="fas fa-download"></i> PDF
            </button>

            ${empresa.totalVencidos > 0 ? `<span class="badge badge-vencido">${empresa.totalVencidos}</span>` : ''}
            ${empresa.totalProximos > 0 ? `<span class="badge badge-proximo">${empresa.totalProximos}</span>` : ''}
            <i class="fas fa-chevron-${isEmpresaExpanded ? 'up' : 'down'} chevron-icon"></i>
          </div>
        </div>
        
        ${isEmpresaExpanded ? `
          <div class="empresa-inspecoes">
            ${empresa.inspecoes.map(inspecao => {
      const isInspecaoExpanded = inspecoesExpandidas.has(inspecao.inspectionId);
      return `
                <div class="inspecao-item">
                  <div class="inspecao-header" onclick="event.stopPropagation(); toggleInspecao('${inspecao.inspectionId}')">
                    <div class="inspecao-info">
                      <i class="fas fa-clipboard-check"></i>
                      <span>Inspeção ${formatarData(inspecao.dataInspecao)}</span>
                    </div>
                    <div class="inspecao-count">
                      <span>${inspecao.itens.length} itens</span>
                      <i class="fas fa-chevron-${isInspecaoExpanded ? 'up' : 'down'}"></i>
                    </div>
                  </div>
                  ${isInspecaoExpanded ? `
                    <div class="itens-list">
                      ${inspecao.itens.map(item => {
        const tipoEscaped = item.tipo.replace(/'/g, "\\'");
        const campoEscaped = item.campo ? item.campo.replace(/'/g, "\\'") : '';
        return `
                        <div class="item-card ${item.status}">
                          <div class="item-header">
                            <div class="item-icon"><i class="fas fa-${item.status === 'vencido' ? 'times-circle' : 'exclamation-circle'}"></i></div>
                            <div class="item-info">
                              <div class="item-nome">${item.tipo}</div>
                              <div class="item-meta">
                                <span><i class="fas fa-calendar"></i> ${formatarData(item.validade)}</span>
                                <span class="status-text">${item.status === 'vencido' ? 'Vencido' : 'Próximo'}</span>
                              </div>
                            </div>
                            <button 
                              onclick="event.stopPropagation(); abrirModalEdicaoItem('${inspecao.inspectionId}', '${campoEscaped}', '${empresaNomeEscaped}', '${tipoEscaped}')" 
                              title="Editar validade" 
                              style="
                                background: transparent;
                                border: 1px solid #D4C29A;
                                padding: 6px 12px;
                                border-radius: 6px;
                                cursor: pointer;
                                color: #D4C29A;
                                display: flex;
                                align-items: center;
                                gap: 5px;
                                font-size: 11px;
                                font-weight: 600;
                                transition: all 0.2s;
                                margin-left: auto;
                              "
                              onmouseover="this.style.background='#D4C29A'; this.style.color='#0f0f0f'" 
                              onmouseout="this.style.background='transparent'; this.style.color='#D4C29A'">
                              <i class="fas fa-edit"></i> Editar
                            </button>
                          </div>
                        </div>
                      `;
      }).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
    }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (totalItens > 5) {
    if (paginationContainer) paginationContainer.style.display = 'flex';
    atualizarPaginacao(totalItens, inicio, fim, totalPaginas);
  } else {
    if (paginationContainer) paginationContainer.style.display = 'none';
  }
}

// ===================================
// FUNÇÃO PRINCIPAL PARA GERAR PDF
// ===================================
async function gerarPDFVencimentos(empresaAlvo = null) {
  try {
    const dadosParaImprimir = empresaAlvo
      ? alertasFiltrados.filter(e => e.empresa === empresaAlvo)
      : alertasFiltrados;

    if (dadosParaImprimir.length === 0) {
      showToast('Nenhum dado encontrado para gerar o PDF', 'warning');
      return;
    }

    const isIndividual = empresaAlvo !== null;
    const tipoRelatorio = isIndividual ? 'Individual' : 'Geral';
    const totalEmpresas = dadosParaImprimir.length;

    showToast(`Iniciando geração de ${totalEmpresas} PDF${totalEmpresas > 1 ? 's' : ''}...`, 'info');

    for (const [empresaIdx, empresa] of dadosParaImprimir.entries()) {
      showToast(`Gerando PDF ${empresaIdx + 1} de ${totalEmpresas}: ${empresa.empresa}`, 'info');

      let dadosEmpresaCompletos = null;
      try {
        const dbRef = firebase.database().ref('companies');
        const snapshot = await dbRef.once('value');
        const prediosRef = firebase.database().ref('buildings');
        const snapshotPredios = await prediosRef.once('value');

        if (snapshot.exists()) {
          const companies = snapshot.val();
          for (const [id, empresaData] of Object.entries(companies)) {
            if (
              empresaData.razao_social === empresa.empresa ||
              empresaData.razao_social?.toLowerCase() === empresa.empresa?.toLowerCase() ||
              empresa.cnpj === empresaData.cnpj
            ) {
              dadosEmpresaCompletos = empresaData;
              break;
            }
          }
        }

        if (!dadosEmpresaCompletos && snapshotPredios.exists()) {
          const predios = snapshotPredios.val();
          for (const [id, predioData] of Object.entries(predios)) {
            if (
              predioData.razao_social_predio === empresa.empresa ||
              predioData.razao_social_predio?.toLowerCase() === empresa.empresa?.toLowerCase() ||
              empresa.cnpj === predioData.cnpj_predio
            ) {
              dadosEmpresaCompletos = predioData;
              break;
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa/prédio:', error);
      }

      const todosVencimentos = [];
      empresa.inspecoes.forEach(inspecao => {
        inspecao.itens.forEach(item => {
          todosVencimentos.push({
            ...item,
            inspecaoTipo: inspecao.tipo,
            inspecaoData: inspecao.data
          });
        });
      });

      const totalItensEmpresa = todosVencimentos.length;
      const vencidosEmpresa = todosVencimentos.filter(i => i.status === 'vencido').length;
      const aVencerEmpresa = totalItensEmpresa - vencidosEmpresa;
      const percentualVencidos = totalItensEmpresa > 0 ? ((vencidosEmpresa / totalItensEmpresa) * 100).toFixed(1) : 0;
      const percentualAVencer = totalItensEmpresa > 0 ? ((aVencerEmpresa / totalItensEmpresa) * 100).toFixed(1) : 0;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (const [vencimentoIndex, vencimento] of todosVencimentos.entries()) {
        if (todosVencimentos.length > 5) {
          showToast(`Processando vencimento ${vencimentoIndex + 1} de ${todosVencimentos.length}...`, 'info');
        }

        if (vencimentoIndex > 0) {
          pdf.addPage();
        }

        const paginaHTML = gerarPaginaVencimentoHTML({
          tipoRelatorio,
          empresa,
          dadosEmpresaCompletos,
          vencimento,
          vencimentoIndex,
          totalVencimentos: todosVencimentos.length,
          totalItensEmpresa,
          vencidosEmpresa,
          aVencerEmpresa,
          percentualVencidos,
          percentualAVencer
        });

        await renderizarPaginaNoPDF(pdf, paginaHTML);
      }

      const nomeEmpresaLimpo = empresa.empresa.replace(/[^a-zA-Z0-9]/g, '_');
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const nomeArquivo = isIndividual
        ? `Vencimento_${nomeEmpresaLimpo}_${dataAtual}.pdf`
        : `Relatorio_Geral_${nomeEmpresaLimpo}_${dataAtual}.pdf`;

      showToast(`Baixando: ${empresa.empresa}...`, 'info');
      pdf.save(nomeArquivo);

      await new Promise(resolve => setTimeout(resolve, 800));
    }

    showToast(` ${totalEmpresas} PDF${totalEmpresas > 1 ? 's' : ''} gerado${totalEmpresas > 1 ? 's' : ''} com sucesso!`, 'success');

  } catch (error) {
    console.error('Erro ao gerar PDFs:', error);
    showToast('❌ Erro ao gerar PDFs: ' + error.message, 'error');
  }
}

// ===================================
// FUNÇÃO PARA MONTAR HTML DA PÁGINA DO VENCIMENTO
// ===================================
function gerarPaginaVencimentoHTML(opcoes) {
  const {
    tipoRelatorio,
    empresa,
    dadosEmpresaCompletos,
    vencimento,
    vencimentoIndex,
    totalVencimentos,
    totalItensEmpresa,
    vencidosEmpresa,
    aVencerEmpresa,
    percentualVencidos,
    percentualAVencer
  } = opcoes;

  const statusClass = vencimento.status === 'vencido' ? 'vencido' : 'avencer';
  const statusTexto = vencimento.status === 'vencido' ? 'VENCIDO' : 'A VENCER';
  const statusIcon = vencimento.status === 'vencido' ? 'fa-times-circle' : 'fa-exclamation-triangle';
  const statusColor = vencimento.status === 'vencido' ? '#dc2626' : '#f59e0b';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link rel="stylesheet" href="pdf-vencimentos-styles.css">
      <style>
        .vencimento-card { border-color: ${statusColor} !important; }
        .vencimento-header { background: ${statusColor} !important; }
        .info-box { border-left-color: ${statusColor} !important; }
        .info-box-value.destaque { color: ${statusColor} !important; }
        .info-box-value.status-color { color: ${statusColor} !important; }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <div class="pdf-header">
          <div class="header-top">
            <div class="logo-section">
              <div class="logo-box"><div class="logo-text">EXTINMAIS</div></div>
            </div>
            <div class="header-title">
              <h1><i class="fas fa-file-alt"></i> RELATÓRIO DE VENCIMENTO</h1>
              <div class="tipo-relatorio-badge">
                <i class="fas ${tipoRelatorio === 'Individual' ? 'fa-user' : 'fa-users'}"></i>
                RELATÓRIO ${tipoRelatorio.toUpperCase()}
              </div>
            </div>
          </div>
          <div class="header-divider"></div>
          <div class="header-info">
            <div class="header-info-left">
              <div class="header-info-item"><i class="fas fa-id-card"></i><span>CNPJ: 52.026.476/0001-03</span></div>
              <div class="header-info-item"><i class="fas fa-phone"></i><span>(15) 99137-1232</span></div>
              <div class="header-info-item"><i class="fas fa-envelope"></i><span>extinmaiss@outlook.com</span></div>
            </div>
            <div class="header-info-item"><i class="far fa-clock"></i><span>${formatarDataHora()}</span></div>
          </div>
        </div>

        <div class="pdf-body">
          <div class="empresa-identificacao">
            <div class="empresa-identificacao-header">
              <div class="empresa-icon"><i class="fas fa-building"></i></div>
              <div class="empresa-dados">
                <div class="empresa-nome">${empresa.empresa.toUpperCase()}</div>
                <div class="empresa-cnpj"><i class="fas fa-id-card"></i>${empresa.cnpj}</div>
              </div>
            </div>
            ${dadosEmpresaCompletos ? `
              <div class="empresa-detalhes">
                <div class="empresa-detalhe-item"><span class="detalhe-label"><i class="fas fa-phone"></i> Telefone</span><span class="detalhe-value">${dadosEmpresaCompletos.telefone || dadosEmpresaCompletos.telefone_predio || '-'}</span></div>
                <div class="empresa-detalhe-item"><span class="detalhe-label"><i class="fas fa-user-tie"></i> Responsável</span><span class="detalhe-value">${dadosEmpresaCompletos.responsavel || dadosEmpresaCompletos.responsavel_predio || '-'}</span></div>
                <div class="empresa-detalhe-item"><span class="detalhe-label"><i class="fas fa-map-marker-alt"></i> CEP</span><span class="detalhe-value">${dadosEmpresaCompletos.cep || dadosEmpresaCompletos.cep_predio || '-'}</span></div>
                <div class="empresa-detalhe-item"><span class="detalhe-label"><i class="fas fa-location-arrow"></i> Endereço</span><span class="detalhe-value">${dadosEmpresaCompletos.endereco || dadosEmpresaCompletos.endereco_predio || '-'}</span></div>
              </div>` : ''}
          </div>

          <div class="vencimento-card">
            <div class="vencimento-header">
              <div class="vencimento-header-left">
                <div class="vencimento-titulo"><i class="fas fa-bell"></i> VENCIMENTO <span class="vencimento-numero">${vencimentoIndex + 1} de ${totalVencimentos}</span></div>
                <div class="vencimento-tipo-item"><i class="fas fa-box"></i>${vencimento.tipo}</div>
              </div>
              <div class="vencimento-status-badge"><i class="fas ${statusIcon}"></i>${statusTexto}</div>
            </div>

            <div class="vencimento-body">
              <div class="vencimento-info-grid">
                <div class="info-box"><div class="info-box-label"><i class="far fa-calendar-alt"></i>Data de Validade</div><div class="info-box-value">${formatarData(vencimento.validade)}</div></div>
                <div class="info-box"><div class="info-box-label"><i class="fas fa-hourglass-half"></i>Dias ${vencimento.status === 'vencido' ? 'Vencidos' : 'Restantes'}</div><div class="info-box-value destaque">${Math.abs(vencimento.diasRestantes)}</div></div>
                <div class="info-box"><div class="info-box-label"><i class="fas fa-info-circle"></i>Status</div><div class="info-box-value status-color">${statusTexto}</div></div>
              </div>
              <div class="detalhes-adicionais">
                <div class="detalhes-adicionais-titulo"><i class="fas fa-clipboard-list"></i>Detalhes da Inspeção</div>
                <div class="detalhes-linha"><span class="detalhes-label">Data da Inspeção:</span><span class="detalhes-valor">${formatarData(vencimento.inspecaoData) || '-'}</span></div>
                <div class="detalhes-texto">
                  ${vencimento.inspecaoData ? `<p>Esta inspeção foi realizada em <strong>${formatarData(vencimento.inspecaoData)}</strong>, garantindo a verificação dos itens de segurança e conformidade exigidos.</p>` : `<p>Não há registro de data de inspeção para este item.</p>`}
                </div>
              </div>
            </div>
          </div>

          <div class="resumo-estatistico">
            <div class="resumo-titulo"><i class="fas fa-chart-pie"></i>RESUMO GERAL DA EMPRESA</div>
            <div class="resumo-grid">
              <div class="resumo-item"><div class="resumo-item-label">Total de Vencimentos</div><div class="resumo-item-valor total">${totalItensEmpresa}</div></div>
              <div class="resumo-item"><div class="resumo-item-label">Vencidos</div><div class="resumo-item-valor vencidos">${vencidosEmpresa}</div></div>
              <div class="resumo-item"><div class="resumo-item-label">A Vencer</div><div class="resumo-item-valor avencer">${aVencerEmpresa}</div></div>
            </div>
          </div>
        </div>

        <div class="pdf-footer">
          <div class="footer-brand"><i class="fas fa-fire-extinguisher"></i> EXTINMAIS</div>
          <div class="footer-info">CNPJ: 52.026.476/0001-03 | Tel: (15) 99137-1232 | extinmaiss@outlook.com</div>
          <div class="footer-timestamp">Documento gerado em ${formatarDataHora()}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ===================================
// FUNÇÃO PARA RENDERIZAR PÁGINA NO PDF
// ===================================
async function renderizarPaginaNoPDF(pdf, htmlString) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlString);
    iframeDoc.close();

    iframe.onload = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const canvas = await html2canvas(iframeDoc.body, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

        document.body.removeChild(iframe);
        resolve();
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    };

    iframe.onerror = (error) => {
      document.body.removeChild(iframe);
      reject(error);
    };
  });
}

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function formatarData(data) {
  if (!data) return '-';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
}

function formatarDataHora() {
  const agora = new Date();
  return `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}




// ========================================
// PAGINAÇÃO
// ========================================
function atualizarPaginacao(totalItens, inicio, fim, totalPaginas) {
  document.getElementById('showingFrom').textContent = inicio + 1;
  document.getElementById('showingTo').textContent = fim;
  document.getElementById('totalItems').textContent = totalItens;

  const btnFirst = document.getElementById('btnFirst');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnLast = document.getElementById('btnLast');

  if (btnFirst) btnFirst.disabled = paginaAtual === 1;
  if (btnPrev) btnPrev.disabled = paginaAtual === 1;
  if (btnNext) btnNext.disabled = paginaAtual === totalPaginas;
  if (btnLast) btnLast.disabled = paginaAtual === totalPaginas;

  const paginationNumbers = document.getElementById('paginationNumbers');
  if (!paginationNumbers) return;

  paginationNumbers.innerHTML = '';

  let paginasParaMostrar = [];

  if (totalPaginas <= 5) {
    for (let i = 1; i <= totalPaginas; i++) {
      paginasParaMostrar.push(i);
    }
  } else {
    if (paginaAtual <= 3) {
      paginasParaMostrar = [1, 2, 3, '...', totalPaginas];
    } else if (paginaAtual >= totalPaginas - 2) {
      paginasParaMostrar = [1, '...', totalPaginas - 2, totalPaginas - 1, totalPaginas];
    } else {
      paginasParaMostrar = [1, '...', paginaAtual, '...', totalPaginas];
    }
  }

  paginasParaMostrar.forEach(page => {
    if (page === '...') {
      const dots = document.createElement('span');
      dots.className = 'pagination-dots';
      dots.textContent = '...';
      paginationNumbers.appendChild(dots);
    } else {
      const btn = document.createElement('button');
      btn.className = 'pagination-btn' + (page === paginaAtual ? ' active' : '');
      btn.textContent = page;
      btn.onclick = () => goToPage(page);
      paginationNumbers.appendChild(btn);
    }
  });
}

function goToPage(page) {
  paginaAtual = page;
  renderizarAlertas();
  const alertsList = document.getElementById('alertsList');
  if (alertsList) {
    alertsList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function previousPage() {
  if (paginaAtual > 1) {
    goToPage(paginaAtual - 1);
  }
}

function nextPage() {
  const totalPaginas = Math.ceil(alertasFiltrados.length / itensPorPagina);
  if (paginaAtual < totalPaginas) {
    goToPage(paginaAtual + 1);
  }
}

function goToLastPage() {
  const totalPaginas = Math.ceil(alertasFiltrados.length / itensPorPagina);
  goToPage(totalPaginas);
}

function changeItemsPerPage() {
  const select = document.getElementById('itemsPerPage');
  if (select) {
    itensPorPagina = parseInt(select.value);
    paginaAtual = 1;
    renderizarAlertas();
  }
}

// ========================================
// MODAL DE EDIÇÃO
// ========================================
function abrirModalEdicaoItem(inspectionId, campo, empresa, tipo) {
  criarModalValidade();

  firebase.database().ref(`inspections/${inspectionId}`).once('value').then(snapshot => {
    const inspecao = snapshot.val();
    if (!inspecao) return;

    const dataValidade = inspecao[campo];
    const diasRestantes = calcularDiasRestantes(dataValidade);
    const status = determinarStatus(diasRestantes);

    alertaSelecionado = {
      inspectionId: inspectionId,
      campo: campo,
      empresa: empresa,
      tipo: tipo,
      validade: dataValidade,
      diasRestantes: diasRestantes,
      status: status
    };

    document.getElementById('modalEmpresa').textContent = empresa;
    document.getElementById('modalTipo').textContent = tipo;
    document.getElementById('modalValidadeAtual').textContent = formatarData(dataValidade);

    const statusDiv = document.getElementById('modalStatus');
    statusDiv.className = 'info-row status-row ' + status;

    const textoStatus = status === 'vencido'
      ? `Vencido há ${Math.abs(diasRestantes)} ${Math.abs(diasRestantes) === 1 ? 'dia' : 'dias'}`
      : `Vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`;

    document.getElementById('modalStatusTexto').textContent = textoStatus;
    document.getElementById('inputNovaValidade').value = '';

    const modal = document.getElementById('editValidadeModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  });
}

function fecharModalValidade() {
  const modal = document.getElementById('editValidadeModal');
  if (modal) {
    modal.classList.remove('show');
  }
  alertaSelecionado = null;
  document.body.style.overflow = '';
}

async function salvarNovaValidade() {
  if (!alertaSelecionado) return;

  const novaValidade = document.getElementById('inputNovaValidade').value;

  if (!novaValidade) {
    showToast('Selecione uma data', 'error');
    return;
  }

  try {
    const campo = alertaSelecionado.campo;
    const inspectionId = alertaSelecionado.inspectionId;

    await firebase.database().ref(`inspections/${inspectionId}`).update({
      [campo]: novaValidade
    });

    showToast('Validade atualizada com sucesso!', 'success');
    fecharModalValidade();
    await buscarAlertasVencimento();

  } catch (error) {
    console.error('Erro ao salvar validade:', error);
    showToast('Erro ao salvar alteração', 'error');
  }
}

// ========================================
// INICIALIZAÇÃO
// ========================================
function inicializarAlertas() {
  criarModalValidade();
  buscarAlertasVencimento();

  // Atualizar a cada 5 minutos
  setInterval(buscarAlertasVencimento, 5 * 60 * 1000);
}

// Fechar modal ao clicar fora
document.addEventListener('click', function (event) {
  const modal = document.getElementById('editValidadeModal');
  if (event.target === modal) {
    fecharModalValidade();
  }
});

// Fechar modal com ESC
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    fecharModalValidade();
  }
});

// Inicializar quando Firebase estiver pronto
if (typeof firebase !== 'undefined' && firebase.database) {
  setTimeout(() => {
    inicializarAlertas();
  }, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      inicializarAlertas();
    });
  } else {
    inicializarAlertas();
  }
} else {
  setTimeout(() => {
    if (typeof firebase !== 'undefined' && firebase.database) {
      inicializarAlertas();
    }
  }, 2000);
}

function toggleAlertsList() {
  const body = document.getElementById('alertsBody');
  const btn = document.getElementById('alertsToggleBtn');

  if (body.style.display === 'none' || body.style.display === '') {
    body.style.display = 'block';
    btn.classList.add('open');
  } else {
    body.style.display = 'none';
    btn.classList.remove('open');
  }
}
// versão silenciosa
(function corrigirCepDuplicado() {
  const elementos = document.querySelectorAll('#cep');
  if (elementos.length <= 1) return;

  elementos.forEach((el, index) => {
    if (index === 0) return;
    el.id = `cep-${index + 1}`;
  });
})();


let allCompanies = [];

// Carregar empresas e prédios do Firebase
async function loadClientsForOS() {
  try {
    // Carregar empresas
    const companiesSnapshot = await database.ref('companies').once('value');
    const companies = companiesSnapshot.val() || {};

    // Carregar prédios
    const buildingsSnapshot = await database.ref('buildings').once('value');
    const buildings = buildingsSnapshot.val() || {};

    allCompanies = [];

    // Adicionar empresas
    if (companies) {
      Object.keys(companies).forEach(key => {
        allCompanies.push({
          id: key,
          tipo: 'empresa',
          ...companies[key]
        });
      });
    }

    // Adicionar prédios
    if (buildings) {
      Object.keys(buildings).forEach(key => {
        allCompanies.push({
          id: key,
          tipo: 'predio',
          ...buildings[key]
        });
      });
    }

    // Preencher o select de clientes
    populateClientSelect();


  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
  }
}

// Preencher o dropdown de clientes
function populateClientSelect() {
  const select = document.getElementById('clienteSelect');

  if (!select) {
    console.error('Select clienteSelect não encontrado!');
    return;
  }

  // Limpar opções existentes (exceto a primeira)
  select.innerHTML = '<option value="">Selecione um cliente</option>';

  // Adicionar empresas e prédios
  allCompanies.forEach(client => {
    const isPredio = client.tipo === 'predio';

    const option = document.createElement('option');
    option.value = client.id;

    // Nome do cliente
    const nomeCliente = isPredio
      ? (client.razao_social_predio || 'Sem nome')
      : (client.razao_social || 'Sem nome');

    // Texto com prefixo
    const prefixo = isPredio ? '[PREDIO]' : '[EMPRESA]';
    option.textContent = `${prefixo} ${nomeCliente}`;

    // Salva os dados no dataset
    option.dataset.tipo = client.tipo || 'empresa';
    option.dataset.nome = nomeCliente;
    option.dataset.cnpj = isPredio ? (client.cnpj_predio || '') : (client.cnpj || '');
    option.dataset.cep = isPredio ? (client.cep_predio || '') : (client.cep || '');
    option.dataset.endereco = isPredio ? (client.endereco_predio || '') : (client.endereco || '');
    option.dataset.telefone = isPredio ? (client.telefone_predio || '') : (client.telefone || '');
    option.dataset.email = isPredio ? (client.email_predio || '') : (client.email || '');
    option.dataset.responsavel = isPredio ? (client.responsavel_predio || '') : (client.responsavel || '');
    option.dataset.numeroPredio = isPredio ? (client.numero_predio || '') : '';
    option.dataset.numeroEmpresa = !isPredio ? (client.numero_empresa || '') : '';

    select.appendChild(option);
  });

}




// Preencher campos automaticamente quando selecionar um cliente
document.addEventListener('DOMContentLoaded', function () {
  const clienteSelect = document.getElementById('clienteSelect');

  if (clienteSelect) {
    clienteSelect.addEventListener('change', function () {
      const selectedOption = this.options[this.selectedIndex];

      // Esconder ambos os grupos de campos primeiro
      const camposEmpresa = document.getElementById('camposEmpresa');
      const camposPredio = document.getElementById('camposPredio');

      if (camposEmpresa) camposEmpresa.style.display = 'none';
      if (camposPredio) camposPredio.style.display = 'none';

      if (selectedOption.value) {
        const tipo = selectedOption.dataset.tipo;

        // Preencher campos comuns
        document.getElementById('cnpjInput').value = selectedOption.dataset.cnpj || '';
        document.getElementById('clienteNomeHidden').value = selectedOption.dataset.nome || '';
        document.getElementById('clienteTipoHidden').value = tipo || 'empresa';

        // Mostrar e preencher campos específicos
        if (tipo === 'predio') {
          // Mostrar campos de prédio
          if (camposPredio) {
            camposPredio.style.display = 'block';

            document.getElementById('telefonePredioInput').value = selectedOption.dataset.telefone || '';
            document.getElementById('emailPredioInput').value = selectedOption.dataset.email || '';
            document.getElementById('responsavelPredioInput').value = selectedOption.dataset.responsavel || '';
            document.getElementById('cepPredioInput').value = selectedOption.dataset.cep || '';
            document.getElementById('enderecoPredioInput').value = selectedOption.dataset.endereco || '';
            document.getElementById('numeroPredioInput').value = selectedOption.dataset.numeroPredio || '';
          }
        } else {
          // Mostrar campos de empresa
          if (camposEmpresa) {
            camposEmpresa.style.display = 'block';

            document.getElementById('telefoneEmpresaInput').value = selectedOption.dataset.telefone || '';
            document.getElementById('emailEmpresaInput').value = selectedOption.dataset.email || '';
            document.getElementById('responsavelEmpresaInput').value = selectedOption.dataset.responsavel || '';
            document.getElementById('cepEmpresaInput').value = selectedOption.dataset.cep || '';
            document.getElementById('enderecoEmpresaInput').value = selectedOption.dataset.endereco || '';
            document.getElementById('numeroEmpresaInput').value = selectedOption.dataset.numeroEmpresa || '';
          }
        }
      } else {
        // Limpar campos se nenhum cliente foi selecionado
        document.getElementById('cnpjInput').value = '';
        document.getElementById('clienteNomeHidden').value = '';
        document.getElementById('clienteTipoHidden').value = '';
      }
    });
  }
});




// JavaScript para troca de sub-abas dentro do modal
function switchSubTab(tabName) {
  // Remove active de todos os botões
  const allSubTabs = document.querySelectorAll('.sub-tab');
  allSubTabs.forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active de todos os conteúdos
  const allContents = document.querySelectorAll('.sub-tab-content');
  allContents.forEach(content => {
    content.classList.remove('active');
  });

  // Adiciona active no botão clicado
  event.target.classList.add('active');

  // Adiciona active no conteúdo correspondente
  if (tabName === 'empresa') {
    document.getElementById('empresaContent').classList.add('active');
  } else if (tabName === 'predio') {
    document.getElementById('predioContent').classList.add('active');
  }
}

// CSS necessário - Tema Dourado Escuro
const subTabStyles = `
  .sub-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid #D4C29A;
  }

  .sub-tab {
    padding: 10px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #888;
    border-bottom: 3px solid transparent;
    transition: all 0.3s ease;
  }

  .sub-tab:hover {
    color: #D4C29A;
  }

  .sub-tab.active {
    color: #D4C29A;
    border-bottom-color: #B32117;
  }

  .sub-tab-content {
    display: none;
  }

  .sub-tab-content.active {
    display: block;
  }
`;

// Adicionar os estilos ao documento
if (!document.getElementById('subTabStyles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'subTabStyles';
  styleSheet.textContent = subTabStyles;
  document.head.appendChild(styleSheet);
}
// ========================================
// CALENDÁRIO DE INSPEÇÕES - JAVASCRIPT COMPLETO
// ========================================

// Variáveis Globais
let currentCalendarDate = new Date();
let calendarInspections = [];
let selectedDateForSchedule = null;

// ========================================
// INICIALIZAÇÃO
// ========================================

async function initCalendar() {
  await carregarInspecoesAgendadas();
  renderCalendar();
  setupCalendarEventListeners();
}

// ========================================
// CARREGAR DADOS
// ========================================

async function carregarInspecoesAgendadas() {
  try {
    const snapshot = await database.ref('scheduled_inspections').once('value');
    const data = snapshot.val();
    
    calendarInspections = [];
    
    if (data) {
      Object.keys(data).forEach(key => {
        calendarInspections.push({
          id: key,
          ...data[key]
        });
      });
    }
    
  } catch (error) {
    console.error('Erro ao carregar inspeções:', error);
    showToast('Erro ao carregar inspeções agendadas', 'error');
  }
}

// ========================================
// RENDERIZAÇÃO DO CALENDÁRIO
// ========================================


function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  // Atualizar título
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const monthTitleElement = document.getElementById('currentMonthTitle');
  if (monthTitleElement) {
    monthTitleElement.textContent = `${monthNames[month]} ${year}`;
  }
  
  // Limpar grid
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Adicionar cabeçalhos dos dias da semana
  const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  dayHeaders.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    grid.appendChild(header);
  });
  
  // Primeiro dia do mês
  const firstDay = new Date(year, month, 1).getDay();
  
  // Último dia do mês
  const lastDate = new Date(year, month + 1, 0).getDate();
  
  // Último dia do mês anterior
  const prevMonthDate = new Date(year, month, 0);
  const prevLastDate = prevMonthDate.getDate();
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();
  
  // Próximo mês
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextMonth = nextMonthDate.getMonth();
  const nextYear = nextMonthDate.getFullYear();
  
  // Hoje
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();
  
  // Dias do mês anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayDiv = createDayElement(prevLastDate - i, prevMonth, prevYear, true);
    grid.appendChild(dayDiv);
  }
  
  // Dias do mês atual
  for (let day = 1; day <= lastDate; day++) {
    const isToday = isCurrentMonth && day === todayDate;
    const dayDiv = createDayElement(day, month, year, false, isToday);
    grid.appendChild(dayDiv);
  }
  
  // Dias do próximo mês
  const remainingCells = 42 - (firstDay + lastDate);
  for (let day = 1; day <= remainingCells; day++) {
    const dayDiv = createDayElement(day, nextMonth, nextYear, true);
    grid.appendChild(dayDiv);
  }
}

function createDayElement(day, month, year, isOtherMonth = false, isToday = false) {
  const dayDiv = document.createElement('div');
  dayDiv.className = 'calendar-day';
  
  if (isOtherMonth) {
    dayDiv.classList.add('other-month');
  }
  
  if (isToday) {
    dayDiv.classList.add('today');
  }
  
  // Data completa (mês e ano já vêm ajustados)
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Filtrar inspeções deste dia (proteção contra array undefined)
  const dayInspections = (calendarInspections || []).filter(insp => insp.date === dateStr);
  
  if (dayInspections.length > 0) {
    dayDiv.classList.add('has-inspections');
  }
  
  // Número do dia
  const dayNumber = document.createElement('div');
  dayNumber.className = 'calendar-day-number';
  dayNumber.textContent = day;
  dayDiv.appendChild(dayNumber);
  
  // Container de inspeções
  const inspectionsContainer = document.createElement('div');
  inspectionsContainer.className = 'calendar-inspections';
  
  dayInspections.forEach(inspection => {
    const tag = document.createElement('div');
    tag.className = 'calendar-inspection-tag';
    tag.innerHTML = `
      <span class="calendar-inspection-time">${inspection.time || ''}</span>
      <span>${inspection.clientName || 'Sem nome'}</span>
    `;
    tag.onclick = (e) => {
      e.stopPropagation();
      if (typeof abrirDetalhesInspecao === 'function') {
        abrirDetalhesInspecao(inspection);
      }
    };
    inspectionsContainer.appendChild(tag);
  });
  
  dayDiv.appendChild(inspectionsContainer);
  
  // Botão de adicionar inspeção
  if (!isOtherMonth) {
    const addBtn = document.createElement('button');
    addBtn.className = 'calendar-add-btn';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> <span>Agendar</span>';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof abrirModalAgendamentoComData === 'function') {
        abrirModalAgendamentoComData(dateStr);
      }
    };
    dayDiv.appendChild(addBtn);
  }
  
  // Click no dia (visualizar)
  dayDiv.onclick = () => {
    if (!isOtherMonth && typeof mostrarInspecoesDoDia === 'function') {
      mostrarInspecoesDoDia(dateStr, day, month, year);
    }
  };
  
  return dayDiv;
}



// ========================================
// EXIBIR INSPEÇÕES DO DIA
// ========================================

function mostrarInspecoesDoDia(dateStr, day, month, year) {
  const dayInspections = calendarInspections.filter(insp => insp.date === dateStr);
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  document.getElementById('selectedDayTitle').innerHTML = `
    <i class="fas fa-calendar-day"></i> 
    Inspeções de ${day} de ${monthNames[month]} de ${year}
  `;
  
  const content = document.getElementById('dayInspectionsContent');
  
  if (dayInspections.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #999;">
        <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 15px; color: #D4C29A;"></i>
        <p style="margin-bottom: 20px;">Nenhuma inspeção agendada para este dia</p>
        <button class="btn" onclick="abrirModalAgendamentoComData('${dateStr}')">
          <i class="fas fa-plus"></i> Agendar Inspeção
        </button>
      </div>
    `;
  } else {
    content.innerHTML = dayInspections.map(inspection => `
      <div class="day-inspection-card">
        <div class="day-inspection-header">
          <div class="day-inspection-client">
            <div class="day-inspection-client-name">${inspection.clientName}</div>
            <div class="day-inspection-client-type">${inspection.clientType === 'predio' ? 'PRÉDIO' : 'EMPRESA'}</div>
          </div>
          <div class="day-inspection-actions">
            <button class="btn-action-small" onclick='abrirDetalhesInspecao(${JSON.stringify(inspection).replace(/'/g, "&#39;")})'>
              <i class="fas fa-eye"></i> Ver
            </button>
            <button class="btn-action-small btn-pdf" onclick='baixarPDFInspecao(${JSON.stringify(inspection).replace(/'/g, "&#39;")})'>
              <i class="fas fa-file-pdf"></i> PDF
            </button>
            <button class="btn-action-small btn-delete" onclick="deletarInspecao('${inspection.id}')">
              <i class="fas fa-trash"></i> Excluir
            </button>
          </div>
        </div>
        <div class="day-inspection-info">
          <div class="day-inspection-info-item">
            <i class="fas fa-clock"></i>
            <span>${inspection.time}</span>
          </div>
          <div class="day-inspection-info-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>${inspection.address || 'Endereço não informado'}</span>
          </div>
          ${inspection.notes ? `
          <div class="day-inspection-info-item" style="grid-column: 1 / -1;">
            <i class="fas fa-sticky-note"></i>
            <span>${inspection.notes}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
  
  document.getElementById('dayInspectionsList').style.display = 'block';
  
  // Scroll suave até a lista
  setTimeout(() => {
    document.getElementById('dayInspectionsList').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// ========================================
// MODAL DE DETALHES
// ========================================

function abrirDetalhesInspecao(inspection) {
  const content = document.getElementById('inspectionDetailContent');
  
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="background: #2a2a2a; padding: 20px; border-radius: 10px; border: 2px solid #D4C29A;">
        <h3 style="color: #D4C29A; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-building" style="flex-shrink: 0;"></i> 
          <span style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">Informações do Cliente</span>
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto;">
            <strong style="color: #D4C29A;">Nome:</strong>
            <span style="color: #fff; margin-left: 10px; display: inline-block;">${inspection.clientName}</span>
          </div>
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">
            <strong style="color: #D4C29A;">Tipo:</strong>
            <span style="color: #fff; margin-left: 10px;">${inspection.clientType === 'predio' ? 'PRÉDIO' : 'EMPRESA'}</span>
          </div>
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">
            <strong style="color: #D4C29A;">CNPJ:</strong>
            <span style="color: #fff; margin-left: 10px;">${inspection.cnpj || 'Não informado'}</span>
          </div>
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto;">
            <strong style="color: #D4C29A;">Endereço:</strong>
            <span style="color: #fff; margin-left: 10px; display: inline-block;">${inspection.address || 'Não informado'}</span>
          </div>
        </div>
      </div>
      
      <div style="background: #2a2a2a; padding: 20px; border-radius: 10px; border: 2px solid #D4C29A;">
        <h3 style="color: #D4C29A; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-calendar-check" style="flex-shrink: 0;"></i> 
          <span style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">Dados da Inspeção</span>
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">
            <strong style="color: #D4C29A;">Data:</strong>
            <span style="color: #fff; margin-left: 10px;">${formatarDataBR(inspection.date)}</span>
          </div>
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">
            <strong style="color: #D4C29A;">Horário:</strong>
            <span style="color: #fff; margin-left: 10px;">${inspection.time}</span>
          </div>
          ${inspection.notes ? `
          <div style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto;">
            <strong style="color: #D4C29A;">Observações:</strong>
            <div style="color: #fff; margin-top: 8px; padding: 10px; background: #1a1a1a; border-radius: 6px; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; hyphens: auto; white-space: pre-wrap;">
              ${inspection.notes}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-info" onclick='baixarPDFInspecao(${JSON.stringify(inspection).replace(/'/g, "&#39;")})' style="flex: 1; min-width: 150px;">
          <i class="fas fa-file-pdf"></i> Baixar PDF
        </button>
        <button class="btn" onclick="fecharModalDetalhes()" style="flex: 1; min-width: 150px; background: #6b7280;">
          <i class="fas fa-times"></i> Fechar
        </button>
        <button class="btn" onclick="deletarInspecao('${inspection.id}')" style="flex: 1; min-width: 150px; background: #B32117;">
          <i class="fas fa-trash"></i> Excluir
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('inspectionDetailModal').style.display = 'block';
}



function fecharModalDetalhes() {
  document.getElementById('inspectionDetailModal').style.display = 'none';
}

// ========================================
// MODAL DE AGENDAMENTO
// ========================================

async function abrirModalAgendamento() {
  selectedDateForSchedule = null;
  await loadClientsForSchedule();
  
  document.getElementById('scheduleForm').reset();
  document.getElementById('scheduleClientId').value = '';
  document.getElementById('scheduleClientName').value = '';
  document.getElementById('scheduleClientType').value = '';
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('scheduleDate').setAttribute('min', today);
  document.getElementById('scheduleDate').value = '';
  
  document.getElementById('scheduleModal').style.display = 'block';
}

async function abrirModalAgendamentoComData(dateStr) {
  selectedDateForSchedule = dateStr;
  await loadClientsForSchedule();
  
  document.getElementById('scheduleForm').reset();
  document.getElementById('scheduleClientId').value = '';
  document.getElementById('scheduleClientName').value = '';
  document.getElementById('scheduleClientType').value = '';
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('scheduleDate').setAttribute('min', today);
  document.getElementById('scheduleDate').value = dateStr;
  
  document.getElementById('scheduleModal').style.display = 'block';
}

function fecharModalAgendamento() {
  document.getElementById('scheduleModal').style.display = 'none';
  selectedDateForSchedule = null;
}

async function loadClientsForSchedule() {
  try {
    const companiesSnapshot = await database.ref('companies').once('value');
    const buildingsSnapshot = await database.ref('buildings').once('value');
    
    const companies = companiesSnapshot.val() || {};
    const buildings = buildingsSnapshot.val() || {};
    
    const select = document.getElementById('scheduleClientSelect');
    select.innerHTML = '<option value="">Selecione um cliente</option>';
    
    // Adicionar empresas
    Object.keys(companies).forEach(key => {
      const company = companies[key];
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `[EMPRESA] ${company.razao_social || 'Sem nome'}`;
      option.dataset.nome = company.razao_social || '';
      option.dataset.tipo = 'empresa';
      option.dataset.cnpj = company.cnpj || '';
      option.dataset.endereco = `${company.endereco || ''}, ${company.numero_empresa || ''}`.trim();
      select.appendChild(option);
    });
    
    // Adicionar prédios
    Object.keys(buildings).forEach(key => {
      const building = buildings[key];
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `[PRÉDIO] ${building.razao_social_predio || 'Sem nome'}`;
      option.dataset.nome = building.razao_social_predio || '';
      option.dataset.tipo = 'predio';
      option.dataset.cnpj = building.cnpj_predio || '';
      option.dataset.endereco = `${building.endereco_predio || ''}, ${building.numero_predio || ''}`.trim();
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
    showToast('Erro ao carregar lista de clientes', 'error');
  }
}

async function salvarAgendamento(e) {
  e.preventDefault();
  
  const scheduleData = {
    clientId: document.getElementById('scheduleClientId').value,
    clientName: document.getElementById('scheduleClientName').value,
    clientType: document.getElementById('scheduleClientType').value,
    date: document.getElementById('scheduleDate').value,
    time: document.getElementById('scheduleTime').value,
    address: document.getElementById('scheduleAddress').value,
    cnpj: document.getElementById('scheduleCNPJ').value,
    notes: document.getElementById('scheduleNotes').value,
    createdAt: new Date().toISOString(),
    createdBy: currentUser?.nome || 'Sistema'
  };
  
  try {
    await database.ref('scheduled_inspections').push(scheduleData);
    
    showToast('Inspeção agendada com sucesso!', 'success');
    fecharModalAgendamento();
    
    await carregarInspecoesAgendadas();
    renderCalendar();
  } catch (error) {
    console.error('Erro ao salvar agendamento:', error);
    showToast('Erro ao agendar inspeção', 'error');
  }
}

// ========================================
// DELETAR INSPEÇÃO
// ========================================

async function deletarInspecao(inspectionId) {
  if (!confirm('Tem certeza que deseja excluir esta inspeção?')) {
    return;
  }
  
  try {
    await database.ref(`scheduled_inspections/${inspectionId}`).remove();
    showToast('Inspeção excluída com sucesso!', 'success');
    
    fecharModalDetalhes();
    document.getElementById('dayInspectionsList').style.display = 'none';
    
    await carregarInspecoesAgendadas();
    renderCalendar();
  } catch (error) {
    console.error('Erro ao excluir inspeção:', error);
    showToast('Erro ao excluir inspeção', 'error');
  }
}

// ========================================
// EXPORTAR PDF INDIVIDUAL
// ========================================
// ========================================
// EXPORTAR PDF INDIVIDUAL
// ========================================

async function baixarPDFInspecao(inspection) {
  try {
    showToast('Gerando PDF da inspeção...', 'info');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: white; 
            color: #1f2937;
            padding: 0;
            margin: 0;
          }
          .pdf-page {
            width: 100%;
            height: 100%;
            padding: 0;
            margin: 0;
          }
          .pdf-header {
            background: linear-gradient(135deg, #b32117 0%, #dc2626 100%);
            color: white;
            padding: 20px 25px;
            margin: 0;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          .logo-section {
            flex-shrink: 0;
          }
          .logo-box {
            padding: 0;
          }
          .logo-text {
            font-size: 28px;
            font-weight: 900;
            color: white;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .header-title {
            flex: 1;
            text-align: right;
            margin-left: 20px;
          }
          .header-title h1 {
            font-size: 22px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
          .tipo-relatorio-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,0.2);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            border: 1px solid rgba(255,255,255,0.3);
          }
          .header-divider {
            height: 2px;
            background: rgba(255,255,255,0.3);
            margin: 15px 0;
          }
          .header-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
          }
          .header-info-left {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          .header-info-item {
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.95;
          }
          .header-info-item i {
            font-size: 12px;
          }
          
          .content {
            padding: 30px;
          }
          .section {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 800;
            color: #b32117;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .info-grid {
            display: grid;
            gap: 12px;
          }
          .info-item {
            display: flex;
            gap: 10px;
            font-size: 13px;
          }
          .info-label {
            font-weight: 700;
            color: #374151;
            min-width: 100px;
          }
          .info-value {
            color: #1f2937;
          }
          .notes-box {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            margin-top: 10px;
            font-size: 13px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="pdf-page">
          <div class="pdf-header">
            <div class="header-top">
              <div class="logo-section">
                <div class="logo-box">
                  <div class="logo-text">EXTINMAIS</div>
                </div>
              </div>
              <div class="header-title">
                <h1><i class="fas fa-file-alt"></i> RELATÓRIO DE INSPEÇÃO</h1>
                <div class="tipo-relatorio-badge">
                  <i class="fas fa-user"></i>
                  RELATÓRIO INDIVIDUAL
                </div>
              </div>
            </div>
            <div class="header-divider"></div>
            <div class="header-info">
              <div class="header-info-left">
                <div class="header-info-item">
                  <i class="fas fa-id-card"></i>
                  <span>CNPJ: 52.026.476/0001-03</span>
                </div>
                <div class="header-info-item">
                  <i class="fas fa-phone"></i>
                  <span>(15) 99137-1232</span>
                </div>
                <div class="header-info-item">
                  <i class="fas fa-envelope"></i>
                  <span>extinmaiss@outlook.com</span>
                </div>
              </div>
              <div class="header-info-item">
                <i class="far fa-clock"></i>
                <span>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">
                <i class="fas fa-building"></i>
                Informações do Cliente
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Nome:</span>
                  <span class="info-value">${inspection.clientName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Tipo:</span>
                  <span class="info-value">${inspection.clientType === 'predio' ? 'PRÉDIO' : 'EMPRESA'}</span>
                </div>
                ${inspection.cnpj ? `
                <div class="info-item">
                  <span class="info-label">CNPJ:</span>
                  <span class="info-value">${inspection.cnpj}</span>
                </div>
                ` : ''}
                ${inspection.address ? `
                <div class="info-item">
                  <span class="info-label">Endereço:</span>
                  <span class="info-value">${inspection.address}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">
                <i class="fas fa-calendar-check"></i>
                Dados da Inspeção
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Data:</span>
                  <span class="info-value">${formatarDataBR(inspection.date)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Horário:</span>
                  <span class="info-value">${inspection.time}</span>
                </div>
                ${inspection.createdBy ? `
                <div class="info-item">
                  <span class="info-label">Agendado por:</span>
                  <span class="info-value">${inspection.createdBy}</span>
                </div>
                ` : ''}
              </div>
              ${inspection.notes ? `
                <div style="margin-top: 15px;">
                  <div class="info-label" style="margin-bottom: 8px;">Observações:</div>
                  <div class="notes-box">${inspection.notes}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await renderizarPaginaNoPDF(pdf, pdfHTML);
    
    const fileName = `Inspecao_${inspection.clientName.replace(/[^a-z0-9]/gi, '_')}_${inspection.date}.pdf`;
    pdf.save(fileName);
    
    showToast('PDF gerado com sucesso!', 'success');
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    showToast('Erro ao gerar PDF', 'error');
  }
}

// ========================================
// EXPORTAR PDF DO MÊS
// ========================================

async function exportarMesPDF() {
  try {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const monthInspections = calendarInspections.filter(insp => {
      const inspDate = new Date(insp.date);
      return inspDate.getMonth() === month && inspDate.getFullYear() === year;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    
    if (monthInspections.length === 0) {
      showToast('Nenhuma inspeção agendada neste mês', 'warning');
      return;
    }
    
    showToast('Gerando PDF do calendário...', 'info');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const itemsPerPage = 4;
    const totalPages = Math.ceil(monthInspections.length / itemsPerPage);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();

      const start = i * itemsPerPage;
      const currentChunk = monthInspections.slice(start, start + itemsPerPage);

      const pdfHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              background: white; 
              color: #1f2937;
              width: 794px; /* Largura exata para preencher o A4 sem bordas brancas */
            }
            .pdf-header {
              background: linear-gradient(135deg, #b32117 0%, #dc2626 100%);
              color: white;
              padding: 20px 25px;
              width: 100%;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 15px;
            }
            .logo-text {
              font-size: 28px;
              font-weight: 900;
              letter-spacing: 2px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .header-title { text-align: right; flex: 1; }
            .header-title h1 {
              font-size: 22px;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 10px;
            }
            .tipo-relatorio-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(255,255,255,0.2);
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 700;
              border: 1px solid rgba(255,255,255,0.3);
            }
            .header-divider {
              height: 2px;
              background: rgba(255,255,255,0.3);
              margin: 15px 0;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
            }
            .header-info-left { display: flex; gap: 20px; }
            .header-info-item { display: flex; align-items: center; gap: 6px; }

            .content { padding: 25px; width: 100%; }
            
            .month-header {
              background: #f9fafb;
              border: 2px solid #b32117;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
              text-align: center;
            }

            .inspection-card {
              background: #f9fafb;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
              min-height: 145px;
            }
            .inspection-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .client-name { font-size: 16px; font-weight: 800; color: #1f2937; }
            .client-type { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600; }

            .inspection-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
            .info-item i { color: #b32117; margin-right: 5px; width: 14px; }
            .info-full { grid-column: 1 / -1; }
          </style>
        </head>
        <body>
          <div class="pdf-header">
            <div class="header-top">
              <div class="logo-text">EXTINMAIS</div>
              <div class="header-title">
                <h1><i class="fas fa-file-alt"></i> CALENDÁRIO DE INSPEÇÕES</h1>
                <div class="tipo-relatorio-badge">
                  PÁGINA ${i + 1} DE ${totalPages}
                </div>
              </div>
            </div>
            <div class="header-divider"></div>
            <div class="header-info">
              <div class="header-info-left">
                <div class="header-info-item"><i class="fas fa-id-card"></i> 52.026.476/0001-03</div>
                <div class="header-info-item"><i class="fas fa-phone"></i> (15) 99137-1232</div>
                <div class="header-info-item"><i class="fas fa-envelope"></i> extinmaiss@outlook.com</div>
              </div>
              <div class="header-info-item">
                <i class="far fa-clock"></i> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          
          <div class="content">
            <div class="month-header">
              <h2 style="color: #b32117; font-size: 20px;">${monthNames[month].toUpperCase()} ${year}</h2>
              <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin-top: 5px;">
                <i class="fas fa-calendar-check" style="color: #b32117;"></i> Total de ${monthInspections.length} agendamentos
              </p>
            </div>
            
            ${currentChunk.map(insp => `
              <div class="inspection-card">
                <div class="inspection-header">
                  <div>
                    <div class="client-name">${insp.clientName}</div>
                    <div class="client-type">${insp.clientType === 'predio' ? 'PRÉDIO' : 'EMPRESA'}</div>
                  </div>
                </div>
                <div class="inspection-info">
                  <div class="info-item"><i class="fas fa-calendar"></i> <strong>${formatarDataBR(insp.date)}</strong></div>
                  <div class="info-item"><i class="fas fa-clock"></i> <strong>${insp.time}</strong></div>
                  ${insp.address ? `<div class="info-item info-full"><i class="fas fa-map-marker-alt"></i> ${insp.address}</div>` : ''}
                  ${insp.cnpj ? `<div class="info-item info-full"><i class="fas fa-id-card"></i> ${insp.cnpj}</div>` : ''}
                  ${insp.notes ? `<div class="info-item info-full"><i class="fas fa-sticky-note"></i> ${insp.notes}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `;
      
      await renderizarPaginaNoPDF(pdf, pdfHTML, i === 0);
    }
    
    pdf.save(`Agenda_${monthNames[month]}_${year}.pdf`);
    showToast('PDF exportado com sucesso!', 'success');
    
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    showToast('Erro ao gerar PDF', 'error');
  }
}

// ========================================
// UTILITÁRIOS
// ========================================

function formatarDataBR(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupCalendarEventListeners() {

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentCalendarDate.setDate(1); // evita bug
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentCalendarDate.setDate(1); // evita bug
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('closeDayListBtn').addEventListener('click', () => {
    document.getElementById('dayInspectionsList').style.display = 'none';
  });

  document.getElementById('addScheduleBtn').addEventListener('click', abrirModalAgendamento);

  document.getElementById('scheduleForm').addEventListener('submit', salvarAgendamento);

  document.getElementById('scheduleClientSelect').addEventListener('change', function () {
    const selectedOption = this.options[this.selectedIndex];

    if (selectedOption.value) {
      document.getElementById('scheduleClientId').value = selectedOption.value;
      document.getElementById('scheduleClientName').value = selectedOption.dataset.nome || '';
      document.getElementById('scheduleClientType').value = selectedOption.dataset.tipo || 'empresa';
      document.getElementById('scheduleCNPJ').value = selectedOption.dataset.cnpj || '';
      document.getElementById('scheduleAddress').value = selectedOption.dataset.endereco || '';
    }
  });

  document.getElementById('exportMonthPDFBtn').addEventListener('click', exportarMesPDF);
}
