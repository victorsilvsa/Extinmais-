
// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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



// Função para alternar visibilidade das empresas
function toggleCompanies() {
  companiesExpanded = !companiesExpanded;
  loadCompanies();
}

// Função para alternar visibilidade dos prédios
function toggleBuildings() {
  buildingsExpanded = !buildingsExpanded;
  loadCompanies();
}

// Funções de mudança de página
function changeCompanyPage(page) {
  const companiesSnapshot = database.ref('companies').once('value');
  companiesSnapshot.then(snapshot => {
    const companies = snapshot.val() || {};
    const totalPages = Math.ceil(Object.keys(companies).length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentCompanyPage = page;
      loadCompanies();
    }
  });
}

function changeBuildingPage(page) {
  const buildingsSnapshot = database.ref('buildings').once('value');
  buildingsSnapshot.then(snapshot => {
    const buildings = snapshot.val() || {};
    const totalPages = Math.ceil(Object.keys(buildings).length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentBuildingPage = page;
      loadCompanies();
    }
  });
}

// Função para criar e mostrar modal de edição de empresa
function editCompany(key) {
  database.ref('companies/' + key).once('value').then(snapshot => {
    const company = snapshot.val();
    if (!company) return;

    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
        border-radius: 16px;
        padding: 30px;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid #D4C29A;
        max-height: 90vh;
        overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="color: #D4C29A; margin: 0; font-size: 24px; font-weight: bold;">
            <i class="fas fa-edit"></i> Editar Empresa
          </h2>
          <button onclick="closeEditModal()" style="
            background: none;
            border: none;
            color: #D4C29A;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
          ">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form id="editCompanyForm" style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="color: #D4C29A; display: block; margin-bottom: 8px; font-weight: bold;">
              Razão Social *
            </label>
            <input 
              type="text" 
              id="edit_razao_social" 
              value="${company.razao_social || ''}"
              required
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #D4C29A; display: block; margin-bottom: 8px; font-weight: bold;">
              CNPJ *
            </label>
            <input 
              type="text" 
              id="edit_cnpj" 
              value="${company.cnpj || ''}"
              required
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #D4C29A; display: block; margin-bottom: 8px; font-weight: bold;">
              Telefone
            </label>
            <input 
              type="text" 
              id="edit_telefone" 
              value="${company.telefone || ''}"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #D4C29A; display: block; margin-bottom: 8px; font-weight: bold;">
              Número da Empresa
            </label>
            <input 
              type="text" 
              id="edit_numero_empresa" 
              value="${company.numero_empresa || ''}"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #D4C29A; display: block; margin-bottom: 8px; font-weight: bold;">
              Responsável
            </label>
            <input 
              type="text" 
              id="edit_responsavel" 
              value="${company.responsavel || ''}"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #D4C29A; display: block; margin-bottom: 8px; font-weight: bold;">
              Endereço
            </label>
            <textarea 
              id="edit_endereco" 
              rows="3"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #D4C29A;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
                resize: vertical;
              "
            >${company.endereco || ''}</textarea>
          </div>

          <div style="display: flex; gap: 15px; margin-top: 10px;">
            <button 
              type="submit"
              style="
                flex: 1;
                padding: 14px;
                background: linear-gradient(135deg, #D4C29A 0%, #B8A47E 100%);
                color: #0d0d0d;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 4px 15px rgba(212, 194, 154, 0.35);
              "
            >
              <i class="fas fa-save"></i> Salvar Alterações
            </button>
            <button 
              type="button"
              onclick="closeEditModal()"
              style="
                flex: 1;
                padding: 14px;
                background: #444;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
              "
            >
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handler do formulário
    document.getElementById('editCompanyForm').onsubmit = (e) => {
      e.preventDefault();

      const updatedData = {
        razao_social: document.getElementById('edit_razao_social').value.trim(),
        cnpj: document.getElementById('edit_cnpj').value.trim(),
        telefone: document.getElementById('edit_telefone').value.trim(),
        numero_empresa: document.getElementById('edit_numero_empresa').value.trim(),
        responsavel: document.getElementById('edit_responsavel').value.trim(),
        endereco: document.getElementById('edit_endereco').value.trim()
      };

      // Atualizar no Firebase
      database.ref('companies/' + key).update(updatedData)
        .then(() => {
          closeEditModal();
          loadCompanies();
          showNotification('Empresa atualizada com sucesso!', 'success');
        })
        .catch((error) => {
          console.error('Erro ao atualizar empresa:', error);
          showNotification('Erro ao atualizar empresa. Tente novamente.', 'error');
        });
    };
  });
}

// Função para criar e mostrar modal de edição de prédio
function editBuilding(key) {
  database.ref('buildings/' + key).once('value').then(snapshot => {
    const building = snapshot.val();
    if (!building) return;

    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
        border-radius: 16px;
        padding: 30px;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid #2ecc71;
        max-height: 90vh;
        overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="color: #2ecc71; margin: 0; font-size: 24px; font-weight: bold;">
            <i class="fas fa-edit"></i> Editar Prédio
          </h2>
          <button onclick="closeEditModal()" style="
            background: none;
            border: none;
            color: #2ecc71;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
          ">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form id="editBuildingForm" style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="color: #2ecc71; display: block; margin-bottom: 8px; font-weight: bold;">
              Razão Social *
            </label>
            <input 
              type="text" 
              id="edit_razao_social_predio" 
              value="${building.razao_social_predio || ''}"
              required
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #2ecc71; display: block; margin-bottom: 8px; font-weight: bold;">
              CNPJ *
            </label>
            <input 
              type="text" 
              id="edit_cnpj_predio" 
              value="${building.cnpj_predio || ''}"
              required
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #2ecc71; display: block; margin-bottom: 8px; font-weight: bold;">
              Telefone
            </label>
            <input 
              type="text" 
              id="edit_telefone_predio" 
              value="${building.telefone_predio || ''}"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #2ecc71; display: block; margin-bottom: 8px; font-weight: bold;">
              Número do Prédio
            </label>
            <input 
              type="text" 
              id="edit_numero_predio" 
              value="${building.numero_predio || ''}"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div>
            <label style="color: #2ecc71; display: block; margin-bottom: 8px; font-weight: bold;">
              Endereço
            </label>
            <textarea 
              id="edit_endereco_predio" 
              rows="3"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
                resize: vertical;
              "
            >${building.endereco_predio || ''}</textarea>
          </div>

          <div>
            <label style="color: #2ecc71; display: block; margin-bottom: 8px; font-weight: bold;">
              Responsável
            </label>
            <input 
              type="text" 
              id="edit_responsavel_predio" 
              value="${building.responsavel_predio || ''}"
              style="
                width: 100%;
                padding: 12px;
                background: #1a1a1a;
                border: 2px solid #2ecc71;
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            >
          </div>

          <div style="display: flex; gap: 15px; margin-top: 10px;">
            <button 
              type="submit"
              style="
                flex: 1;
                padding: 14px;
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                color: #0d0d0d;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.35);
              "
            >
              <i class="fas fa-save"></i> Salvar Alterações
            </button>
            <button 
              type="button"
              onclick="closeEditModal()"
              style="
                flex: 1;
                padding: 14px;
                background: #444;
                color: #fff;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
              "
            >
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Handler do formulário
    document.getElementById('editBuildingForm').onsubmit = (e) => {
      e.preventDefault();

      const updatedData = {
        razao_social_predio: document.getElementById('edit_razao_social_predio').value.trim(),
        cnpj_predio: document.getElementById('edit_cnpj_predio').value.trim(),
        telefone_predio: document.getElementById('edit_telefone_predio').value.trim(),
        numero_predio: document.getElementById('edit_numero_predio').value.trim(),
        endereco_predio: document.getElementById('edit_endereco_predio').value.trim(),
        responsavel_predio: document.getElementById('edit_responsavel_predio').value.trim()
      };

      // Atualizar no Firebase
      database.ref('buildings/' + key).update(updatedData)
        .then(() => {
          closeEditModal();
          loadCompanies();
          showNotification('Prédio atualizado com sucesso!', 'success');
        })
        .catch((error) => {
          console.error('Erro ao atualizar prédio:', error);
          showNotification('Erro ao atualizar prédio. Tente novamente.', 'error');
        });
    };
  });
}

// Função para fechar o modal
function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) {
    modal.remove();
  }
}

// Função para mostrar notificações
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' : 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'};
    color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-weight: bold;
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    ${message}
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Função principal de carregamento
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
        <button class="btn-small btn-secondary" onclick="editCompany('${key}')" style="background-color:#2c3e50; border-color:#2c3e50;">
  <i class="fas fa-edit"></i> Editar
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
     <button class="btn-small btn-secondary" onclick="editBuilding('${key}')" style="background-color:#2c3e50; border-color:#2c3e50;">
  <i class="fas fa-edit"></i> Editar
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

// Adicionar estilos de animação para notificações
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', loadCompanies);


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
// Cria o modal de seleção dinamicamente
function criarModalSelecao() {
  const modalHTML = `
      <div id="selectionModal" class="modal">
        <div class="modal-content" style="max-width: 800px;">
          <div class="modal-header">
            <h2><i class="fas fa-search"></i> Selecionar Cliente</h2>
            <span class="close" onclick="closeModal('selectionModal')" style="cursor: pointer;">×</span>
          </div>
          <div class="modal-body">
            <!-- Abas de Empresas e Prédios -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #D4C29A;">
              <button id="tabEmpresas" class="tab-button active" onclick="switchTab('empresas')" style="flex: 1; padding: 12px 24px; background: transparent; border: none; color: #D4C29A; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s; border-bottom: 3px solid #D4C29A;">
                <i class="fas fa-briefcase"></i> Empresas
              </button>
              <button id="tabPredios" class="tab-button" onclick="switchTab('predios')" style="flex: 1; padding: 12px 24px; background: transparent; border: none; color: #888; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s; border-bottom: 3px solid transparent;">
                <i class="fas fa-building"></i> Prédios
              </button>
            </div>

            <!-- Campo de Busca -->
            <div style="margin-bottom: 20px;">
              <input 
                type="text" 
                id="searchSelection" 
                placeholder="Buscar por nome, CNPJ ou responsável..."
                style="width: 100%; padding: 12px; border: 2px solid #D4C29A; border-radius: 8px; background: #2a2a2a; color: #fff; font-size: 14px;"
                onkeyup="filtrarSelecao()"
              >
            </div>

            <!-- Lista de Empresas -->
            <div id="listaEmpresas" style="max-height: 400px; overflow-y: auto; padding: 10px;">
              <div style="text-align: center; color: #D4C29A; padding: 40px; font-size: 18px;">
                <i class="fas fa-spinner fa-spin"></i> Carregando empresas...
              </div>
            </div>

            <!-- Lista de Prédios -->
            <div id="listaPredios" style="max-height: 400px; overflow-y: auto; padding: 10px; display: none;">
              <div style="text-align: center; color: #D4C29A; padding: 40px; font-size: 18px;">
                <i class="fas fa-spinner fa-spin"></i> Carregando prédios...
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  // Adiciona o modal ao body se ainda não existir
  if (!document.getElementById('selectionModal')) {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}


// Variável para controlar qual aba está ativa
let todasEmpresas = [];
let todosPredios = [];
let abaAtiva = 'empresas';

// Cria o modal de seleção
function criarModalSelecao() {
  const modalHTML = `
      <div id="selectionModal" class="modal">
        <div class="modal-content" style="max-width: 600px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);">
          <div class="modal-header" style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); border-bottom: 2px solid #D4C29A; padding: 20px;">
            <h2 style="color: #D4C29A; font-size: 20px; margin: 0;"><i class="fas fa-search"></i> Selecionar Cliente</h2>
            <span class="close" onclick="closeModal('selectionModal')" style="cursor: pointer; color: #D4C29A; font-size: 28px; font-weight: bold; transition: all 0.3s;" onmouseover="this.style.color='#fff'; this.style.transform='rotate(90deg)'" onmouseout="this.style.color='#D4C29A'; this.style.transform='rotate(0deg)'">×</span>
          </div>
          <div class="modal-body" style="padding: 20px;">
            <!-- Abas de Empresas e Prédios -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 3px solid #D4C29A; padding-bottom: 5px;">
              <button id="tabEmpresas" class="tab-button active" onclick="switchTab('empresas')" style="flex: 1; padding: 12px 20px; background: linear-gradient(135deg, #D4C29A 0%, #b8a676 100%); border: none; color: #1a1a1a; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.3s; border-radius: 8px 8px 0 0; box-shadow: 0 4px 15px rgba(212, 194, 154, 0.3);">
                <i class="fas fa-briefcase"></i> Empresas
              </button>
              <button id="tabPredios" class="tab-button" onclick="switchTab('predios')" style="flex: 1; padding: 12px 20px; background: transparent; border: 2px solid #444; color: #888; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.3s; border-radius: 8px 8px 0 0;">
                <i class="fas fa-building"></i> Prédios
              </button>
            </div>

            <!-- Campo de Busca -->
            <div style="margin-bottom: 20px; position: relative;">
              <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #D4C29A; font-size: 14px;"></i>
              <input 
                type="text" 
                id="searchSelection" 
                placeholder="Buscar por nome, CNPJ ou responsável..."
                style="width: 100%; padding: 12px 12px 12px 40px; border: 2px solid #D4C29A; border-radius: 8px; background: #2a2a2a; color: #fff; font-size: 14px; transition: all 0.3s; box-shadow: 0 2px 10px rgba(212, 194, 154, 0.1);"
                onkeyup="filtrarSelecao()"
                onfocus="this.style.borderColor='#fff'; this.style.boxShadow='0 4px 20px rgba(212, 194, 154, 0.3)'"
                onblur="this.style.borderColor='#D4C29A'; this.style.boxShadow='0 2px 10px rgba(212, 194, 154, 0.1)'"
              >
            </div>

            <!-- Lista de Empresas -->
            <div id="listaEmpresas" style="max-height: 350px; overflow-y: auto; padding: 5px; scrollbar-width: thin; scrollbar-color: #D4C29A #1a1a1a;">
              <div style="text-align: center; color: #D4C29A; padding: 40px 20px; font-size: 16px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 28px; margin-bottom: 12px;"></i>
                <div>Carregando empresas...</div>
              </div>
            </div>

            <!-- Lista de Prédios -->
            <div id="listaPredios" style="max-height: 350px; overflow-y: auto; padding: 5px; display: none; scrollbar-width: thin; scrollbar-color: #D4C29A #1a1a1a;">
              <div style="text-align: center; color: #D4C29A; padding: 40px 20px; font-size: 16px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 28px; margin-bottom: 12px;"></i>
                <div>Carregando prédios...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  // Adiciona o modal ao body se ainda não existir
  if (!document.getElementById('selectionModal')) {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}

// Abre o modal de seleção
async function abrirModalSelecao() {
  criarModalSelecao();
  openModal('selectionModal');
  await carregarDadosSelecao();
}

// Carrega empresas e prédios do Firebase
async function carregarDadosSelecao() {
  try {
    const [companiesSnapshot, buildingsSnapshot] = await Promise.all([
      database.ref('companies').once('value'),
      database.ref('buildings').once('value')
    ]);

    const companies = companiesSnapshot.val() || {};
    const buildings = buildingsSnapshot.val() || {};

    todasEmpresas = Object.entries(companies).map(([id, data]) => ({ id, ...data, tipo: 'empresa' }));
    todosPredios = Object.entries(buildings).map(([id, data]) => ({ id, ...data, tipo: 'predio' }));

    renderizarLista();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showToast('Erro ao carregar dados', 'error');
  }
}

// Alterna entre abas
function switchTab(aba) {
  abaAtiva = aba;

  const tabEmpresas = document.getElementById('tabEmpresas');
  const tabPredios = document.getElementById('tabPredios');

  if (aba === 'empresas') {
    tabEmpresas.style.background = 'linear-gradient(135deg, #D4C29A 0%, #b8a676 100%)';
    tabEmpresas.style.color = '#1a1a1a';
    tabEmpresas.style.border = 'none';
    tabEmpresas.style.boxShadow = '0 4px 15px rgba(212, 194, 154, 0.3)';

    tabPredios.style.background = 'transparent';
    tabPredios.style.color = '#888';
    tabPredios.style.border = '2px solid #444';
    tabPredios.style.boxShadow = 'none';
  } else {
    tabPredios.style.background = 'linear-gradient(135deg, #D4C29A 0%, #b8a676 100%)';
    tabPredios.style.color = '#1a1a1a';
    tabPredios.style.border = 'none';
    tabPredios.style.boxShadow = '0 4px 15px rgba(212, 194, 154, 0.3)';

    tabEmpresas.style.background = 'transparent';
    tabEmpresas.style.color = '#888';
    tabEmpresas.style.border = '2px solid #444';
    tabEmpresas.style.boxShadow = 'none';
  }

  document.getElementById('listaEmpresas').style.display = aba === 'empresas' ? 'block' : 'none';
  document.getElementById('listaPredios').style.display = aba === 'predios' ? 'block' : 'none';

  document.getElementById('searchSelection').value = '';
  renderizarLista();
}

// Renderiza a lista baseada na aba ativa
function renderizarLista(filtro = '') {
  const listaEmpresas = document.getElementById('listaEmpresas');
  const listaPredios = document.getElementById('listaPredios');

  const empresasFiltradas = todasEmpresas.filter(emp => {
    if (!filtro) return true;
    const searchTerm = filtro.toLowerCase();
    return (
      (emp.razao_social || '').toLowerCase().includes(searchTerm) ||
      (emp.cnpj || '').toLowerCase().includes(searchTerm) ||
      (emp.responsavel || '').toLowerCase().includes(searchTerm)
    );
  });

  const prediosFiltrados = todosPredios.filter(pred => {
    if (!filtro) return true;
    const searchTerm = filtro.toLowerCase();
    return (
      (pred.razao_social_predio || '').toLowerCase().includes(searchTerm) ||
      (pred.cnpj_predio || '').toLowerCase().includes(searchTerm) ||
      (pred.responsavel_predio || '').toLowerCase().includes(searchTerm)
    );
  });

  if (empresasFiltradas.length === 0) {
    listaEmpresas.innerHTML = '<div style="text-align: center; color: #888; padding: 40px 20px; font-size: 15px; background: #2a2a2a; border-radius: 8px; border: 2px dashed #444;"><i class="fas fa-inbox" style="font-size: 36px; margin-bottom: 10px; color: #D4C29A; display: block;"></i>Nenhuma empresa encontrada</div>';
  } else {
    listaEmpresas.innerHTML = empresasFiltradas.map(emp => `
      <div onclick="selecionarCliente('${emp.id}', 'empresa')" style="background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); border: 2px solid #D4C29A; border-radius: 10px; padding: 15px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 6px 20px rgba(212, 194, 154, 0.4)'; this.style.borderColor='#D4C29A';" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none'; this.style.borderColor='#D4C29A';">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #D4C29A 0%, #b8a676 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #1a1a1a; flex-shrink: 0;">
            <i class="fas fa-briefcase"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #D4C29A; font-size: 16px; font-weight: bold; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${emp.razao_social}</div>
            <div style="color: #888; font-size: 13px;"><i class="fas fa-id-card"></i> ${emp.cnpj}</div>
          </div>
        </div>
        <div style="color: #ccc; font-size: 12px; display: flex; gap: 15px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid #444;">
          <span><i class="fas fa-user" style="color: #D4C29A;"></i> ${emp.responsavel || 'Não informado'}</span>
          <span><i class="fas fa-building" style="color: #D4C29A;"></i> Nº ${emp.numero_empresa || '-'}</span>
        </div>
      </div>
    `).join('');
  }

  if (prediosFiltrados.length === 0) {
    listaPredios.innerHTML = '<div style="text-align: center; color: #888; padding: 40px 20px; font-size: 15px; background: #2a2a2a; border-radius: 8px; border: 2px dashed #444;"><i class="fas fa-inbox" style="font-size: 36px; margin-bottom: 10px; color: #D4C29A; display: block;"></i>Nenhum prédio encontrado</div>';
  } else {
    listaPredios.innerHTML = prediosFiltrados.map(pred => `
      <div onclick="selecionarCliente('${pred.id}', 'predio')" style="background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); border: 2px solid #D4C29A; border-radius: 10px; padding: 15px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 6px 20px rgba(212, 194, 154, 0.4)'; this.style.borderColor='#D4C29A';" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none'; this.style.borderColor='#D4C29A';">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #D4C29A 0%, #b8a676 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #1a1a1a; flex-shrink: 0;">
            <i class="fas fa-building"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #D4C29A; font-size: 16px; font-weight: bold; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pred.razao_social_predio}</div>
            <div style="color: #888; font-size: 13px;"><i class="fas fa-id-card"></i> ${pred.cnpj_predio}</div>
          </div>
        </div>
        <div style="color: #ccc; font-size: 12px; display: flex; gap: 15px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid #444;">
          <span><i class="fas fa-user" style="color: #D4C29A;"></i> ${pred.responsavel_predio || 'Não informado'}</span>
          <span><i class="fas fa-building" style="color: #D4C29A;"></i> Nº ${pred.numero_predio || '-'}</span>
        </div>
      </div>
    `).join('');
  }
}

// Filtrar ao digitar
function filtrarSelecao() {
  const filtro = document.getElementById('searchSelection').value;
  renderizarLista(filtro);
}

// Seleciona cliente e abre inspeção
async function selecionarCliente(id, tipo) {
  closeModal('selectionModal');

  if (tipo === 'empresa') {
    await startInspection(id);
  } else {
    await startInspectionBuilding(id);
  }
}

// Atualiza o botão de inspeção manual
document.getElementById('manualInspectionBtn').addEventListener('click', () => {
  abrirModalSelecao();
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
      html += generateAlarmeSection(data);
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página 4 - Alarme (se existir)
    // -------------------------------------
    if (data.has_alarme) {
      html += `<div class="pdf-page">`;
      html += generatePDFHeader('RELATÓRIO COMPLETO DE INSPEÇÃO');
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

      if (data.has_alarme) {
        html += generateAlarmeSection(data);

      }
      html += generatePDFFooter();
      html += `</div>`;
    }


    // -------------------------------------
    // Página 3 - Alarme (somente se existir)
    // -------------------------------------



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
      <div class="header-top">
  
        <div class="header-title">
          <h1><i class="fas fa-file-alt"></i>ExtinMais ${title}</h1>
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
          <span>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>
    </div>
  `;
}


function generateClientSection(data) {
  const isPredio = data.tipo === 'predio' || !!data.razao_social_predio;

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
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #e5e7eb; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #991b12;">
        <i class="fas ${icone}" style="font-size: 13px;"></i> Dados do Cliente
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
        <div style="border-right: 1px solid #e5e7eb;">
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">${labelRazao}</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${razaoSocial}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">CNPJ</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${cnpj}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Telefone</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${telefone}</div>
          </div>
        </div>

        <div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">CEP</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${cep}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Endereço</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${endereco}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">${isPredio && numeroPredio ? 'Nº Prédio' : !isPredio && numeroEmpresa ? 'Nº Empresa' : 'Responsável'}</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${isPredio && numeroPredio ? numeroPredio : !isPredio && numeroEmpresa ? numeroEmpresa : responsavel}</div>
          </div>
        </div>
      </div>

      ${((isPredio && numeroPredio) || (!isPredio && numeroEmpresa)) ? `
      <div style="padding: 7px 10px; border-top: 1px solid #e5e7eb;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Responsável</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${responsavel}</div>
      </div>
      ` : ''}
    </div>
  `;
}

function generateCertificateSection(data) {
  return `
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #e5e7eb; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #991b12;">
        <i class="fas fa-certificate" style="font-size: 13px;"></i> Certificado AVCB/CLCB
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
        <div style="border-right: 1px solid #e5e7eb;">
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Tipo</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.cert_tipo || '-'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Número</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.cert_numero || '-'}</div>
          </div>
        </div>
        
        <div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Início Validade</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.cert_inicio_validade ? new Date(data.cert_inicio_validade).toLocaleDateString('pt-BR') : '-'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Validade</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.cert_validade ? new Date(data.cert_validade).toLocaleDateString('pt-BR') : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateBombasSection(data) {
  const campos = [
    { label: 'Reservatório (L)', value: data.reservatorio_tamanho || '-' },
    { label: 'Bomba Principal', value: data.bomba_principal_potencia || '-' },
    { label: 'Teste Partida', value: data.bomba_principal_teste === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>' },
    { label: 'Estado Geral', value: data.bomba_principal_estado || '-' }
  ];

  if (data.has_bomba_jockey) {
    campos.push(
      { label: 'Bomba Jockey', value: data.jockey_potencia || '-' },
      { label: 'Partida Auto', value: data.jockey_partida === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>' },
      { label: 'Pressostato', value: data.jockey_pressostato === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>' },
      { label: 'Sem Ruídos', value: data.jockey_ruidos === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>' }
    );
  }

  const coluna1 = campos.filter((_, i) => i % 2 === 0);
  const coluna2 = campos.filter((_, i) => i % 2 === 1);

  return `
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #e5e7eb; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #991b12;">
        <i class="fas fa-water" style="font-size: 13px;"></i> Sistema de Bombas
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
        <div style="border-right: 1px solid #e5e7eb;">
          ${coluna1.map((campo, idx) => `
            <div style="padding: 7px 10px; ${idx < coluna1.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">${campo.label}</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${campo.value}</div>
            </div>
          `).join('')}
        </div>
        
        <div>
          ${coluna2.map((campo, idx) => `
            <div style="padding: 7px 10px; ${idx < coluna2.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">${campo.label}</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${campo.value}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function generateHidrantesSection(data) {
  return `
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #e5e7eb; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #991b12;">
        <i class="fas fa-truck-droplet" style="font-size: 13px;"></i> Rede de Hidrantes
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;">
        <div style="border-right: 1px solid #e5e7eb;">
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Diâmetro Tubulação</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrantes_diametro || '-'}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Qtd Pontos</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrantes_quantidade || '-'}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Suportes Firmes</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrantes_suportes === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Sem Vazamentos</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrantes_vazamentos === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Identificação</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrantes_identificacao === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}</div>
          </div>
        </div>

        <div style="border-right: 1px solid #e5e7eb;">
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Adaptador Storz</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.adaptador_storz || '-'}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Material Adaptador</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.adaptador_material || '-'}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Esguicho</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.esguicho_tipo || '-'}</div>
          </div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Material Esguicho</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.esguicho_material || '-'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Chave Storz</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.chave_storz || '-'}</div>
          </div>
        </div>

        <div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Material Chave</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.chave_material || '-'}</div>
          </div>
    <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
  <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Tipo Mangueira</div>
  <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.mangueira_tipo || '-'}</div>
</div>
<div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
  <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Diâmetro Mangueira</div>
  <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.mangueira_diametro || '-'}</div>
</div>
<div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
  <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Comprimento</div>
  <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.mangueira_comprimento ? data.mangueira_comprimento + ' m' : '-'}</div>
</div>
<div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
  <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Data Fabricação</div>
  <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.mangueira_data_fabricacao ? new Date(data.mangueira_data_fabricacao).toLocaleDateString('pt-BR') : '-'}</div>
</div>
<div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
  <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Data Vencimento</div>
  <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.mangueira_data_vencimento ? new Date(data.mangueira_data_vencimento).toLocaleDateString('pt-BR') : '-'}</div>
</div>


          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Hidrante RR</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrante_rr_possui || '-'}</div>
          </div>
        </div>
      </div>

      ${data.hidrante_rr_possui === 'Sim' ? `
      <div style="border-top: 2px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;">
        <div style="padding: 7px 10px; border-right: 1px solid #e5e7eb;">
          <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Possui Adaptador</div>
          <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrante_rr_adaptador || '-'}</div>
        </div>
        <div style="padding: 7px 10px; border-right: 1px solid #e5e7eb;">
          <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Medida Adaptador</div>
          <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrante_rr_medida || '-'}</div>
        </div>
        <div style="padding: 7px 10px;">
          <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Observações</div>
          <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.hidrante_rr_observacoes || '-'}</div>
        </div>
      </div>
      ` : ''}
    </div>
  `;
}

function generateAlarmeSection(data) {
  return `
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #e5e7eb; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #991b12;">
        <i class="fas fa-bell" style="font-size: 13px;"></i> Sistema de Alarme
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;">
        <div style="border-right: 1px solid #e5e7eb;">
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Qtd Pontos</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.alarme_pontos || '-'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Tipo Central</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.alarme_central_tipo || '-'}</div>
          </div>
        </div>
        
        <div style="border-right: 1px solid #e5e7eb;">
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Central Liga</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.central_liga ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Sem Falhas</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.central_sem_falhas ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}</div>
          </div>
        </div>
        
        <div>
          <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Baterias OK</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.central_baterias_testadas ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}</div>
          </div>
          <div style="padding: 7px 10px;">
            <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Detectores</div>
            <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${data.detectores_quantidade || '-'}</div>
          </div>
        </div>
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
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #d1d5db; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #374151;">
        <i class="fas fa-fire-extinguisher" style="font-size: 13px;"></i> Extintor ${numeroGlobal} — ${ext.tipo || '-'}
      </div>

      <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Quantidade</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${ext.quantidade || '-'}</div>
      </div>

      <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Peso</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${ext.peso || '-'}</div>
      </div>

      <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Validade</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
          ${ext.validade ? new Date(ext.validade).toLocaleDateString('pt-BR') : '-'}
        </div>
      </div>

      <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Lacres Intactos</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
          ${ext.lacres === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}
        </div>
      </div>

      <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Manômetro OK</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
          ${ext.manometro === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}
        </div>
      </div>

      <div style="padding: 7px 10px;">
        <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Fixação Adequada</div>
        <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
          ${ext.fixacao === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}
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
      <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #d1d5db; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
        <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #374151;">
          <i class="fas fa-fire-extinguisher" style="font-size: 13px;"></i> Extintores de Incêndio
        </div>
        <div style="padding: 10px 12px; color: #6b7280; font-size: 9px;">Nenhum extintor informado</div>
      </div>
    `;
  }

  return `
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #d1d5db; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #374151;">
        <i class="fas fa-fire-extinguisher" style="font-size: 13px;"></i> Extintores de Incêndio
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
        ${extintores.map((ext, idx) => `
          <div style="${idx === 0 ? 'border-right: 2px solid #d1d5db;' : ''}">
            <div style="padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 800; color: #4b5563; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">
                Extintor ${startIndex + idx + 1} — ${ext.tipo || '-'}
              </div>
            </div>

            <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Quantidade</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${ext.quantidade || '-'}</div>
            </div>

            <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Peso</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${ext.peso || '-'}</div>
            </div>

            <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Validade</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
                ${ext.validade ? new Date(ext.validade).toLocaleDateString('pt-BR') : '-'}
              </div>
            </div>

            <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Lacres Intactos</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
                ${ext.lacres === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}
              </div>
            </div>

            <div style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Manômetro OK</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
                ${ext.manometro === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}
              </div>
            </div>

            <div style="padding: 7px 10px;">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">Fixação Adequada</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">
                ${ext.fixacao === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'}
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
      <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #d1d5db; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
        <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #374151;">
          <i class="fas fa-fire-extinguisher" style="font-size: 13px;"></i> Extintores de Incêndio
        </div>
        <div style="padding: 10px 12px; color: #6b7280; font-size: 9px;">Nenhum extintor informado</div>
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
  const campos = [];

  // Placas Fotoluminescentes
  campos.push({
    label: 'Placas Fotoluminescentes',
    value: data.placas_fotoluminescentes === 'Sim' ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;">✓</span>' : '<span style="color: #ef4444; font-weight: 900; font-size: 13px;">✗</span>'
  });

  // Rota de Fuga
  if (data.sinal_saida && parseInt(data.sinal_saida) > 0) {
    campos.push({ label: 'Saída', value: data.sinal_saida });
  }
  if (data.sinal_cam_direita && parseInt(data.sinal_cam_direita) > 0) {
    campos.push({ label: 'Caminhamento → Direita', value: data.sinal_cam_direita });
  }
  if (data.sinal_cam_esquerda && parseInt(data.sinal_cam_esquerda) > 0) {
    campos.push({ label: 'Caminhamento → Esquerda', value: data.sinal_cam_esquerda });
  }
  if (data.sinal_esc_up_direita && parseInt(data.sinal_esc_up_direita) > 0) {
    campos.push({ label: 'Escada ↑ Direita', value: data.sinal_esc_up_direita });
  }
  if (data.sinal_esc_up_esquerda && parseInt(data.sinal_esc_up_esquerda) > 0) {
    campos.push({ label: 'Escada ↑ Esquerda', value: data.sinal_esc_up_esquerda });
  }
  if (data.sinal_esc_down_direita && parseInt(data.sinal_esc_down_direita) > 0) {
    campos.push({ label: 'Escada ↓ Direita', value: data.sinal_esc_down_direita });
  }
  if (data.sinal_esc_down_esquerda && parseInt(data.sinal_esc_down_esquerda) > 0) {
    campos.push({ label: 'Escada ↓ Esquerda', value: data.sinal_esc_down_esquerda });
  }

  // Sinalização de Hidrantes
  if (data.sinal_hidrante && parseInt(data.sinal_hidrante) > 0) {
    campos.push({ label: 'Hidrante', value: data.sinal_hidrante });
  }

  // Sinalização de Acionadores
  if (data.sinal_acion_bomba && parseInt(data.sinal_acion_bomba) > 0) {
    campos.push({ label: 'Acionamento de Bomba', value: data.sinal_acion_bomba });
  }
  if (data.sinal_acion_alarme && parseInt(data.sinal_acion_alarme) > 0) {
    campos.push({ label: 'Acionamento de Alarme', value: data.sinal_acion_alarme });
  }
  if (data.sinal_central_alarme && parseInt(data.sinal_central_alarme) > 0) {
    campos.push({ label: 'Central de Alarme', value: data.sinal_central_alarme });
  }
  if (data.sinal_bomba_incendio && parseInt(data.sinal_bomba_incendio) > 0) {
    campos.push({ label: 'Bomba de Incêndio', value: data.sinal_bomba_incendio });
  }

  // Placas Específicas
  if (data.placa_lotacao && parseInt(data.placa_lotacao) > 0) {
    campos.push({ label: 'Placa de Lotação (Nº Pessoas)', value: data.placa_lotacao });
  }
  if (data.placa_m1 && parseInt(data.placa_m1) > 0) {
    campos.push({ label: 'Placa M1', value: data.placa_m1 });
  }
  if (data.placa_extintor && parseInt(data.placa_extintor) > 0) {
    campos.push({ label: 'Extintor', value: data.placa_extintor });
  }
  if (data.placa_ilum_emerg && parseInt(data.placa_ilum_emerg) > 0) {
    campos.push({ label: 'Iluminação de Emergência', value: data.placa_ilum_emerg });
  }
  if (data.placa_sinal_emerg && parseInt(data.placa_sinal_emerg) > 0) {
    campos.push({ label: 'Sinalização de Emergência', value: data.placa_sinal_emerg });
  }
  if (data.placa_alarme && parseInt(data.placa_alarme) > 0) {
    campos.push({ label: 'Alarme de Incêndio', value: data.placa_alarme });
  }
  if (data.placa_hidrante_espec && parseInt(data.placa_hidrante_espec) > 0) {
    campos.push({ label: 'Hidrante', value: data.placa_hidrante_espec });
  }

  const coluna1 = campos.filter((_, i) => i % 2 === 0);
  const coluna2 = campos.filter((_, i) => i % 2 === 1);

  return `
    <div style="margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #d1d5db; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #374151;">
        <i class="fas fa-sign" style="font-size: 13px;"></i> Sinalização
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
        <div style="border-right: 2px solid #d1d5db;">
          ${coluna1.map((campo, idx) => `
            <div style="padding: 7px 10px; ${idx < coluna1.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">${campo.label}</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${campo.value}</div>
            </div>
          `).join('')}
        </div>
        
        <div>
          ${coluna2.map((campo, idx) => `
            <div style="padding: 7px 10px; ${idx < coluna2.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
              <div style="font-weight: 700; color: #6b7280; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.3px;">${campo.label}</div>
              <div style="color: #1f2937; font-weight: 600; font-size: 9px;">${campo.value}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
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
    <div style="margin-top: 30px; margin-bottom: 15px; background: white; border-radius: 6px; border: 2px solid #d1d5db; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.06); page-break-inside: avoid;">
      <div style="font-size: 11px; color: white; font-weight: 800; margin: 0; padding: 8px 12px; background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #374151;">
        <i class="fas fa-signature" style="font-size: 13px;"></i> Assinaturas
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 25px 20px;">
        <div style="text-align: center; padding: 0 15px; border-right: 2px solid #d1d5db;">
          <div style="border-top: 2px solid #333; padding-top: 8px; margin-top: 50px;">
            <div style="font-weight: 700; color: #1f2937; font-size: 10px; margin-bottom: 4px;">Assinatura do Técnico</div>
            <div style="color: #6b7280; font-size: 8px; margin-bottom: 2px;">${currentUser ? currentUser.nome : 'Técnico Responsável'}</div>
            <div style="color: #9ca3af; font-size: 7px;">CNPJ: ${currentUser ? currentUser.cnpj : '__.___.___/____-__'}</div>
          </div>
        </div>
        
        <div style="text-align: center; padding: 0 15px;">
          <div style="border-top: 2px solid #333; padding-top: 8px; margin-top: 50px;">
            <div style="font-weight: 700; color: #1f2937; font-size: 10px; margin-bottom: 4px;">Assinatura do Cliente</div>
            <div style="color: #6b7280; font-size: 8px; margin-bottom: 2px;">${data.responsavel || 'Responsável pela Empresa'}</div>
            <div style="color: #9ca3af; font-size: 7px;">Endereço: ${data.endereco || 'Endereço não informado'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generatePDFFooter() {
  return `
    <div class="pdf-footer">
      <div class="footer-brand">
        <i class="fas fa-fire-extinguisher"></i> EXTINMAIS
      </div>
      <div class="footer-info">
        CNPJ: 52.026.476/0001-03 | Tel: (15) 99137-1232 | extinmaiss@outlook.com
      </div>
      <div class="footer-timestamp">
        Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </div>
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
// ===== VARIÁVEIS GLOBAIS DA CÂMERA =====
let photos = [];

// ===== FUNÇÕES DA CÂMERA =====

// Abrir Câmera Nativa do Aparelho
function openNativeCamera(event) {
  event.preventDefault();

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // Força câmera traseira

  input.onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const photoData = event.target.result;
        photos.push({
          id: Date.now(),
          data: photoData,
          timestamp: new Date().toLocaleString('pt-BR')
        });

        atualizarGaleria();
        atualizarContador();
        showToast('Foto capturada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  input.click();
}

// Atualizar Galeria
function atualizarGaleria() {
  const gallery = document.getElementById('photosGallery');
  gallery.innerHTML = '';

  photos.forEach((photo, index) => {
    const div = document.createElement('div');
    div.style.position = 'relative';
    div.style.cursor = 'pointer';

    const img = document.createElement('img');
    img.src = photo.data;
    img.style.width = '100%';
    img.style.height = '80px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';
    img.style.border = '1px solid #D4C29A';
    img.style.transition = 'all 0.2s';

    img.onmouseover = () => {
      img.style.transform = 'scale(1.05)';
      img.style.boxShadow = '0 0 8px rgba(212, 194, 154, 0.3)';
    };

    img.onmouseout = () => {
      img.style.transform = 'scale(1)';
      img.style.boxShadow = 'none';
    };

    // Botão deletar
    const btnDelete = document.createElement('button');
    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
    btnDelete.style.position = 'absolute';
    btnDelete.style.top = '2px';
    btnDelete.style.right = '2px';
    btnDelete.style.background = '#B32117';
    btnDelete.style.color = 'white';
    btnDelete.style.border = 'none';
    btnDelete.style.borderRadius = '4px';
    btnDelete.style.width = '24px';
    btnDelete.style.height = '24px';
    btnDelete.style.display = 'flex';
    btnDelete.style.alignItems = 'center';
    btnDelete.style.justifyContent = 'center';
    btnDelete.style.cursor = 'pointer';
    btnDelete.style.fontSize = '12px';
    btnDelete.style.opacity = '0';
    btnDelete.style.transition = 'opacity 0.2s';

    div.onmouseover = () => btnDelete.style.opacity = '1';
    div.onmouseout = () => btnDelete.style.opacity = '0';

    btnDelete.onclick = (e) => {
      e.stopPropagation();
      deletarFoto(index);
    };

    div.appendChild(img);
    div.appendChild(btnDelete);
    gallery.appendChild(div);
  });
}

// Deletar Foto
function deletarFoto(index) {
  photos.splice(index, 1);
  atualizarGaleria();
  atualizarContador();
}

// Atualizar Contador
function atualizarContador() {
  const count = photos.length;
  document.getElementById('photoCount').textContent = `${count} foto${count !== 1 ? '(s)' : ''}`;
}

// Limpar todas as fotos
function limparTodasFotos() {
  photos = [];
  atualizarGaleria();
  atualizarContador();
}

// Obter fotos (para salvar no BD)
function obterFotos() {
  return photos;
}


// ===== FINISH INSPECTION =====
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
      tipo: window.ultimaEmpresaCadastrada?.tipo || 'empresa',
      observacoes: document.getElementById('inspecaoObservacoes')?.value || '',
      fotos: photos.map(p => ({
        data: p.data,
        timestamp: p.timestamp
      })),
      total_fotos: photos.length
    };

    // Se for prédio, salva os campos com sufixo _predio
    if (window.ultimaEmpresaCadastrada?.tipo === 'predio') {
      inspectionData.razao_social_predio = data.razao_social || window.ultimaEmpresaCadastrada.razao_social_predio;
      inspectionData.cnpj_predio = data.cnpj || window.ultimaEmpresaCadastrada.cnpj_predio;
      inspectionData.telefone_predio = data.telefone || window.ultimaEmpresaCadastrada.telefone_predio;
      inspectionData.responsavel_predio = data.responsavel || window.ultimaEmpresaCadastrada.responsavel_predio;
      inspectionData.cep_predio = data.cep || window.ultimaEmpresaCadastrada.cep_predio;
      inspectionData.endereco_predio = data.endereco || window.ultimaEmpresaCadastrada.endereco_predio;
      inspectionData.numero_predio = data.numero_predio || window.ultimaEmpresaCadastrada.numero_predio;
    }

    // Salva a inspeção com as fotos em base64
    await database.ref('inspections').push(inspectionData);

    showToast('Inspeção finalizada com sucesso!');

    closeModal('inspectionFormModal');
    form.reset();
    limparTodasFotos();
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

// ===== BACK TO FORM =====
document.getElementById('backToFormBtn').addEventListener('click', () => {
  openModal('inspectionFormModal');
  navigateToSection('inspections');
});

// ===== DOWNLOAD PDF =====
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

// ===== SAVE INSPECTION =====
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
      tipo: window.ultimaEmpresaCadastrada?.tipo || currentInspectionData.tipo || 'empresa',
      observacoes: document.getElementById('inspecaoObservacoes')?.value || '',
      fotos: photos.map(p => ({
        data: p.data,
        timestamp: p.timestamp
      })),
      total_fotos: photos.length
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

    // Salva a inspeção com fotos em base64
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
// ============================================
// FUNÇÃO DE CARREGAR INSPEÇÕES COM EXCLUIR
// ============================================

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

        <div class="list-item-info-row">
          <span class="list-item-info-label">Fotos:</span>
          <span class="list-item-info-value">${insp.total_fotos || 0} foto(s)</span>
        </div>
      </div>

      <div class="list-item-actions">
        ${!insp.completed ? `<button class="btn-small btn-success" onclick="markAsCompleted('${insp.id}')">
          <i class="fas fa-check-circle"></i> Finalizar
        </button>` : ''}
        <button class="btn-small btn-info" onclick="viewInspection('${insp.id}')">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button class="btn-small btn-warning" onclick="viewPhotosInspection('${insp.id}')">
          <i class="fas fa-images"></i> Fotos
        </button>
        <button class="btn-small btn-danger" onclick="deleteInspection('${insp.id}')">
          <i class="fas fa-trash"></i> Excluir
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

// ============================================
// FUNÇÃO PARA VER FOTOS DA INSPEÇÃO
// ============================================
async function viewPhotosInspection(inspectionId) {
  const snapshot = await database.ref('inspections/' + inspectionId).once('value');
  const insp = snapshot.val();

  if (!insp || !insp.fotos || insp.fotos.length === 0) {
    showToast('Nenhuma foto encontrada nesta inspeção', 'warning');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'photosModalOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    padding: 20px;
    box-sizing: border-box;
    animation: fadeIn 0.3s ease-out;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #D4C29A;
    border-radius: 16px;
    padding: 30px;
    width: 100%;
    max-width: 800px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    animation: slideUp 0.3s ease-out;
    box-sizing: border-box;
  `;

  let photosHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="color: #D4C29A; font-size: 24px; margin: 0; font-weight: 700;">
        <i class="fas fa-images"></i> Fotos da Inspeção
      </h2>
      <button id="closePhotosBtn" style="
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <p style="color: #bbb; margin-bottom: 20px;">Total: ${insp.fotos.length} foto(s)</p>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">
  `;

  insp.fotos.forEach((foto, index) => {
    photosHTML += `
      <div style="
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid #D4C29A;
        cursor: pointer;
        transition: all 0.3s;
      " onclick="expandPhotoFullscreen('${foto.data.replace(/'/g, "\\'")}', '${foto.timestamp || 'Sem data'}')" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 15px rgba(212, 194, 154, 0.5)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
        <div style="position: absolute; top: 8px; right: 8px; background: rgba(212, 194, 154, 0.2); padding: 6px 10px; border-radius: 6px; color: #D4C29A; font-size: 12px; font-weight: 600; opacity: 0; transition: opacity 0.3s; pointer-events: none;" class="expand-icon">
          <i class="fas fa-expand"></i>
        </div>
        <img src="${foto.data}" style="width: 100%; height: 150px; object-fit: cover; display: block;">
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: #D4C29A;
          padding: 8px;
          font-size: 12px;
          text-align: center;
        ">
          ${foto.timestamp || 'Sem data'}
        </div>
      </div>
    `;
  });

  photosHTML += `
    </div>
  `;

  modal.innerHTML = photosHTML;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Mostrar ícone de expansão ao passar o mouse
  const photoItems = modal.querySelectorAll('div[onclick*="expandPhotoFullscreen"]');
  photoItems.forEach(item => {
    item.addEventListener('mouseover', function () {
      this.querySelector('.expand-icon').style.opacity = '1';
    });
    item.addEventListener('mouseout', function () {
      this.querySelector('.expand-icon').style.opacity = '0';
    });
  });

  document.getElementById('closePhotosBtn').onclick = () => {
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => overlay.remove(), 300);
    }
  };
}

// ============================================
// EXPANDIR FOTO EM TELA CHEIA
// ============================================
function expandPhotoFullscreen(photoData, timestamp) {
  const overlay = document.createElement('div');
  overlay.id = 'fullscreenPhotoOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
    padding: 20px;
    box-sizing: border-box;
    animation: fadeIn 0.3s ease-out;
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 15px;
  `;

  const imageContainer = document.createElement('div');
  imageContainer.style.cssText = `
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 90vw;
  `;

  const img = document.createElement('img');
  img.src = photoData;
  img.style.cssText = `
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 0 40px rgba(212, 194, 154, 0.3);
    animation: slideUp 0.3s ease-out;
  `;

  imageContainer.appendChild(img);

  const bottomBar = document.createElement('div');
  bottomBar.style.cssText = `
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #D4C29A;
    border-radius: 12px;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 15px;
    flex-wrap: wrap;
  `;

  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    color: #D4C29A;
    font-weight: 600;
    font-size: 14px;
  `;
  infoDiv.textContent = timestamp;

  const buttonsDiv = document.createElement('div');
  buttonsDiv.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  // Botão Baixar
  const downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '<i class="fas fa-download"></i> Baixar';
  downloadBtn.style.cssText = `
    background: #2a7a3f;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 15px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
  `;
  downloadBtn.onmouseover = () => { downloadBtn.style.background = '#1f5a2f'; };
  downloadBtn.onmouseout = () => { downloadBtn.style.background = '#2a7a3f'; };
  downloadBtn.onclick = () => downloadPhoto(photoData, timestamp);

  // Botão Fechar
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<i class="fas fa-times"></i> Fechar';
  closeBtn.style.cssText = `
    background: #B32117;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 15px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
  `;
  closeBtn.onmouseover = () => { closeBtn.style.background = '#8a180f'; };
  closeBtn.onmouseout = () => { closeBtn.style.background = '#B32117'; };
  closeBtn.onclick = () => {
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => overlay.remove(), 300);
  };

  buttonsDiv.appendChild(downloadBtn);
  buttonsDiv.appendChild(closeBtn);

  bottomBar.appendChild(infoDiv);
  bottomBar.appendChild(buttonsDiv);

  container.appendChild(imageContainer);
  container.appendChild(bottomBar);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => overlay.remove(), 300);
    }
  };

  // Adiciona animações se não existirem
  if (!document.getElementById('fullscreenAnimations')) {
    const style = document.createElement('style');
    style.id = 'fullscreenAnimations';
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
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================
// BAIXAR FOTO
// ============================================
function downloadPhoto(photoData, timestamp) {
  const link = document.createElement('a');
  link.href = photoData;
  link.download = `foto_${timestamp.replace(/[\/\s:]/g, '-')}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Foto baixada com sucesso!', 'success');
}

// ============================================
// FUNÇÃO DE EXCLUIR INSPEÇÃO
// ============================================
function deleteInspection(inspectionId) {
  database.ref('inspections/' + inspectionId).once('value').then(snapshot => {
    const insp = snapshot.val();

    if (!insp) {
      showToast('Inspeção não encontrada!', 'error');
      return;
    }

    const isPredio = insp.tipo === 'predio';
    const nomeCliente = isPredio
      ? (insp.razao_social_predio || insp.razao_social || 'Esta inspeção')
      : (insp.razao_social || 'Esta inspeção');

    const overlay = document.createElement('div');
    overlay.id = 'deleteConfirmOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      padding: 20px;
      box-sizing: border-box;
      animation: fadeIn 0.3s ease-out;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
      border: 2px solid #ef4444;
      border-radius: 16px;
      padding: 30px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      animation: slideUp 0.3s ease-out;
      box-sizing: border-box;
    `;

    modal.innerHTML = `
      <div style="text-align: center;">
        <div style="
          width: 80px;
          height: 80px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        ">
          <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #ef4444;"></i>
        </div>

        <h2 style="color: #fff; font-size: 24px; margin: 0 0 15px 0; font-weight: 700;">
          Confirmar Exclusão
        </h2>

        <p style="color: #bbb; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
          Tem certeza que deseja excluir a inspeção de:
        </p>

        <p style="color: #D4C29A; font-size: 18px; font-weight: 600; margin: 0 0 25px 0; word-wrap: break-word;">
          ${escapeHtml(nomeCliente)}
        </p>

        <p style="color: #ef4444; font-size: 14px; font-weight: 600; margin: 0 0 30px 0;">
          Esta ação não pode ser desfeita!
        </p>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="cancelDeleteBtn" style="
            background: #444;
            border: 1px solid #666;
            color: #fff;
            border-radius: 8px;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-times"></i> Cancelar
          </button>
          <button id="confirmDeleteBtn" style="
            background: #ef4444;
            border: none;
            color: #fff;
            border-radius: 8px;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <i class="fas fa-trash"></i> Sim, Excluir
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    cancelBtn.onmouseover = () => { cancelBtn.style.background = '#555'; };
    cancelBtn.onmouseout = () => { cancelBtn.style.background = '#444'; };
    confirmBtn.onmouseover = () => { confirmBtn.style.background = '#dc2626'; };
    confirmBtn.onmouseout = () => { confirmBtn.style.background = '#ef4444'; };

    cancelBtn.onclick = () => {
      overlay.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => overlay.remove(), 300);
    };

    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.6';
      confirmBtn.style.cursor = 'not-allowed';
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

      try {
        await database.ref('inspections/' + inspectionId).remove();
        overlay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => overlay.remove(), 300);
        showToast('Inspeção excluída com sucesso!', 'success');
        loadInspections();
      } catch (error) {
        console.error('Erro ao excluir inspeção:', error);
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Sim, Excluir';
        showToast('Erro ao excluir inspeção: ' + error.message, 'error');
      }
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => overlay.remove(), 300);
      }
    };

    if (!document.getElementById('deleteAnimations')) {
      const style = document.createElement('style');
      style.id = 'deleteAnimations';
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
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  });
}

// ============================================
// FUNÇÃO AUXILIAR - ESCAPE HTML
// ============================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// ============================================
// FUNÇÃO DE MENSAGEM DE SUCESSO
// ============================================
function showSuccessMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: #fff;
    padding: 16px 24px;
    border-radius: 10px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);

  if (!document.getElementById('slideAnimations')) {
    const style = document.createElement('style');
    style.id = 'slideAnimations';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
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
            </div>
            ${produtosListaHTML ? ` 
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
              </div> 
            ` : ` 
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
              </div> 
            `}
            <!-- VALOR TOTAL DA OS -->
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
        <button onclick="gerarPDFOrdem('${osId}', 'com_valores'); document.body.removeChild(this.closest('div').parentElement)" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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

        <button onclick="gerarPDFOrdem('${osId}', 'sem_valores'); document.body.removeChild(this.closest('div').parentElement)" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(239, 68, 68, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.3)'">
          <i class="fas fa-file-alt" style="font-size: 18px;"></i>
          <span>PDF sem Valores</span>
        </button>

        <button onclick="gerarPDFOrdem('${osId}', 'valores_detalhados'); document.body.removeChild(this.closest('div').parentElement)" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
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
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(124, 58, 237, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(124, 58, 237, 0.3)'">
          <i class="fas fa-list-check" style="font-size: 18px;"></i>
          <span>PDF com Valores Detalhados</span>
        </button>

        <button onclick="gerarPDFOrdem('${osId}', 'sem_quantidade'); document.body.removeChild(this.closest('div').parentElement)" style="
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(245, 158, 11, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.3)'">
          <i class="fas fa-file" style="font-size: 18px;"></i>
          <span>PDF sem Quantidade</span>
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
async function gerarPDFOrdem(orderId, tipoRelatorio = 'com_valores') {
  const ordem = allOrders.find(o => o.id === orderId);
  if (!ordem) {
    showToast('Ordem não encontrada', 'error');
    return;
  }

  try {
    const mensagens = {
      'com_valores': 'Gerando PDF com valor total...',
      'sem_valores': 'Gerando PDF sem valores...',
      'valores_detalhados': 'Gerando PDF com valores detalhados...',
      'sem_quantidade': 'Gerando PDF sem quantidade...'
    };
    showToast(mensagens[tipoRelatorio] || 'Gerando PDF...', 'info');

    const produtosOriginais = Array.isArray(ordem.products) ? ordem.products : [];
    const produtos = agruparProdutos(produtosOriginais);

    const dataStr = ordem.data ? new Date(ordem.data).toLocaleDateString('pt-BR') : '-';
    const formaPagamento = ordem.payment_method || ordem.formaPagamento || 'Não informado';
    const statusPagamento = ordem.payment_status || ordem.statusPagamento || 'Não Pago';
    const totalFinal = Number(ordem.total) || Number(ordem.preco) || 0;
    const statusText = (ordem.status || ordem.estado || (ordem.completed ? 'Concluída' : 'Pendente')).toString();
    const indexNaLista = allOrders.findIndex(o => o.id === ordem.id);
    const numeroSequencial = indexNaLista !== -1 ? (indexNaLista + 1) : '-';

    let numero = ordem.numeroPredio || ordem.numeroEmpresa || '';
    let enderecoCompleto = ordem.endereco || '-';
    if (numero) {
      enderecoCompleto = `${enderecoCompleto}, Nº ${numero}`;
    }

    const qtdTotal = produtos.reduce((acc, p) => acc + p.qty, 0);

    // 🔥 TAMANHOS DE FONTE DINÂMICOS
    const qtdProdutos = produtos.length;
    let fontSizes = {
      tabelaTh: '10px',
      tabelaTd: '11px',
      tabelaNumero: '9px',
      maxNomeLength: 80
    };

    if (qtdProdutos <= 10) {
      fontSizes = {
        tabelaTh: '10px',
        tabelaTd: '11px',
        tabelaNumero: '9px',
        maxNomeLength: 80
      };
    } else if (qtdProdutos <= 30) {
      fontSizes = {
        tabelaTh: '8px',
        tabelaTd: '9px',
        tabelaNumero: '7px',
        maxNomeLength: 60
      };
    } else if (qtdProdutos <= 60) {
      fontSizes = {
        tabelaTh: '7px',
        tabelaTd: '7.5px',
        tabelaNumero: '6px',
        maxNomeLength: 45
      };
    } else {
      fontSizes = {
        tabelaTh: '6px',
        tabelaTd: '6.5px',
        tabelaNumero: '5px',
        maxNomeLength: 35
      };
    }

    // ===== DIVIDE PRODUTOS EM MÚLTIPLAS COLUNAS E PÁGINAS =====
    function dividirEmColunas(array, itensPorColuna) {
      const colunas = [];
      for (let i = 0; i < array.length; i += itensPorColuna) {
        colunas.push(array.slice(i, i + itensPorColuna));
      }
      return colunas;
    }

    // 🎯 CONFIGURAÇÃO ESPECIAL: Todos os tipos começam com produtos na PRIMEIRA PÁGINA
    // 🎯 PRIMEIRA PÁGINA: 15 produtos em 3 colunas (5 por coluna)
    // 🎯 PRÓXIMAS PÁGINAS: 45 produtos em 3 colunas (15 por coluna)
    const ITENS_PRIMEIRA_PAGINA = 10;
    const ITENS_POR_COLUNA_PRIMEIRA = 10;
    const ITENS_POR_COLUNA = 40;
    const COLUNAS_POR_PAGINA = 1;

    let colunasProdutos = [];
    let paginasProdutos = [];

    // Distribuição de produtos
    if (produtos.length > 0) {
      const produtosPrimeiraPagina = produtos.slice(0, ITENS_PRIMEIRA_PAGINA);
      const colunasPrimeira = dividirEmColunas(produtosPrimeiraPagina, ITENS_POR_COLUNA_PRIMEIRA);
      paginasProdutos.push(colunasPrimeira);
      
      // Próximas páginas: resto dos produtos em grupos de 45 (15 por coluna, 3 colunas)
      if (produtos.length > ITENS_PRIMEIRA_PAGINA) {
        const produtosRestantes = produtos.slice(ITENS_PRIMEIRA_PAGINA);
        colunasProdutos = dividirEmColunas(produtosRestantes, ITENS_POR_COLUNA);
        for (let i = 0; i < colunasProdutos.length; i += COLUNAS_POR_PAGINA) {
          paginasProdutos.push(colunasProdutos.slice(i, i + COLUNAS_POR_PAGINA));
        }
      }
    }

    // 🎯 CALCULA TOTAL DE PÁGINAS
    const totalPaginas = paginasProdutos.length;

    // FUNÇÃO PARA TRUNCAR NOME DO PRODUTO
    const truncarNome = (nome, maxLength = fontSizes.maxNomeLength) => {
      if (!nome) return '-';
      if (nome.length <= maxLength) return nome;
      return nome.substring(0, maxLength) + '...';
    };

    // ===== RENDERIZA TABELA DE PRODUTOS =====
    const renderizarTabelaProdutos = (lista, offset = 0) => {
      if (!lista || !lista.length) return '';

      // PDF COM VALORES DETALHADOS (Unit. + Total)
      if (tipoRelatorio === 'valores_detalhados') {
        return `
          <table style="width: 100%; border-collapse: collapse; background: white; font-size: ${fontSizes.tabelaTd}; border: 2px solid #d1d5db; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead style="background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); color: white; border-bottom: 2px solid #374151;">
              <tr>
                <th style="padding: 6px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 30px; border-right: 1px solid rgba(255,255,255,0.2);">N°</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; border-right: 1px solid rgba(255,255,255,0.2);">Produto</th>
                <th style="padding: 6px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 40px; border-right: 1px solid rgba(255,255,255,0.2);">Qtd</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 65px; border-right: 1px solid rgba(255,255,255,0.2);">Unit.</th>
                <th style="padding: 6px 8px; text-align: right; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 70px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lista.map((p, idx) => {
                const valorUn = (Number(p.price) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const subtotal = ((Number(p.price) || 0) * p.qty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                const nomeTruncado = truncarNome(p.name);
                return `
                  <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 5px 8px; color: #6b7280; text-align: center; font-weight: 700; font-size: ${fontSizes.tabelaNumero}; border-right: 1px solid #e5e7eb;">${offset + idx + 1}</td>
                    <td style="padding: 5px 8px; color: #374151; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${fontSizes.tabelaTd}; border-right: 1px solid #e5e7eb;" title="${p.name || '-'}">${nomeTruncado}</td>
                    <td style="padding: 5px 8px; color: #374151; text-align: center; font-weight: 600; font-size: ${fontSizes.tabelaTd}; border-right: 1px solid #e5e7eb;">${p.qty}x</td>
                    <td style="padding: 5px 8px; color: #b91c1c; text-align: right; font-weight: 600; font-size: ${fontSizes.tabelaTd}; border-right: 1px solid #e5e7eb;">${valorUn}</td>
                    <td style="padding: 5px 8px; color: #1f2937; text-align: right; font-weight: 700; font-size: ${fontSizes.tabelaTd};">${subtotal}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }

      // PDF SEM QUANTIDADE (apenas Produto)
      else if (tipoRelatorio === 'sem_quantidade') {
        return `
          <table style="width: 100%; border-collapse: collapse; background: white; font-size: ${fontSizes.tabelaTd}; border: 2px solid #d1d5db; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead style="background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); color: white; border-bottom: 2px solid #374151;">
              <tr>
                <th style="padding: 6px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 30px; border-right: 1px solid rgba(255,255,255,0.2);">N°</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; border-right: 1px solid rgba(255,255,255,0.2);">Produto</th>
              </tr>
            </thead>
            <tbody>
              ${lista.map((p, idx) => {
                const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                const nomeTruncado = truncarNome(p.name);
                return `
                  <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 5px 8px; color: #6b7280; text-align: center; font-weight: 700; font-size: ${fontSizes.tabelaNumero}; border-right: 1px solid #e5e7eb;">${offset + idx + 1}</td>
                    <td style="padding: 5px 8px; color: #374151; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${fontSizes.tabelaTd}; border-right: 1px solid #e5e7eb;" title="${p.name || '-'}">${nomeTruncado}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }

      // PDF SEM VALORES ou COM VALORES (Produto + Qtd)
      else {
        return `
          <table style="width: 100%; border-collapse: collapse; background: white; font-size: ${fontSizes.tabelaTd}; border: 2px solid #d1d5db; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead style="background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%); color: white; border-bottom: 2px solid #374151;">
              <tr>
                <th style="padding: 6px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 30px; border-right: 1px solid rgba(255,255,255,0.2);">N°</th>
                <th style="padding: 6px 8px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; border-right: 1px solid rgba(255,255,255,0.2);">Produto</th>
                <th style="padding: 6px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: ${fontSizes.tabelaTh}; width: 40px;">Qtd</th>
              </tr>
            </thead>
            <tbody>
              ${lista.map((p, idx) => {
                const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                const nomeTruncado = truncarNome(p.name);
                return `
                  <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 5px 8px; color: #6b7280; text-align: center; font-weight: 700; font-size: ${fontSizes.tabelaNumero}; border-right: 1px solid #e5e7eb;">${offset + idx + 1}</td>
                    <td style="padding: 5px 8px; color: #374151; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${fontSizes.tabelaTd}; border-right: 1px solid #e5e7eb;" title="${p.name || '-'}">${nomeTruncado}</td>
                    <td style="padding: 5px 8px; color: #374151; text-align: center; font-weight: 600; font-size: ${fontSizes.tabelaTd};">${p.qty}x</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    };

    // ===== GERA HEADER COMPLETO =====
    const gerarHeader = (numeroPagina = 1) => `
      <div class="pdf-nota-header">
        <div class="pdf-nota-header-top">
          <div class="pdf-nota-logo-section">
            <div class="pdf-nota-logo-header">
              <div class="pdf-nota-logo-text">EXTINMAIS</div>
            </div>
            <div class="pdf-nota-company-info">
              <div>CNPJ: 52.026.476/0001-03 | Tel: (15) 99137-1232</div>
              <div>Email: extinmaiss@outlook.com</div>
            </div>
          </div>
          <div class="pdf-nota-header-center">
            <h1>NOTA DE SERVIÇO ${numeroPagina > 1 ? `- PARTE ${numeroPagina}` : ''}</h1>
            <p>Nº OS: ${numeroSequencial}</p>
          </div>
          <div class="pdf-nota-header-right">
            <div class="pdf-nota-header-item">Status: ${statusText}</div>
            <div class="pdf-nota-header-item">Data: ${dataStr}</div>
            ${totalPaginas > 1 ? `<div class="pdf-nota-header-item">Pág: ${numeroPagina}/${totalPaginas}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    // ===== GERA FOOTER COMPLETO =====
    const gerarFooter = () => `
      <div class="pdf-nota-pdf-footer">
        <div class="pdf-nota-footer-brand">
          <i class="fas fa-fire-extinguisher"></i> EXTINMAIS
        </div>
        <div class="pdf-nota-footer-info">
          CNPJ: 52.026.476/0001-03 | Tel: (15) 99137-1232 | Email: extinmaiss@outlook.com
        </div>
        <div class="pdf-nota-footer-timestamp">
          ${new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    `;

    // ===== GERA PRIMEIRA PÁGINA (COM DADOS + PRODUTOS) =====
    const gerarPrimeiraPagina = () => {
      return `
        <div class="pdf-nota-page">
          ${gerarHeader(1)}

          <div class="pdf-nota-body">
            <div class="pdf-nota-section">
              <div class="pdf-nota-section-title vermelho">
                <i class="fas fa-user-circle"></i> DADOS DO CLIENTE
              </div>
              <div class="pdf-nota-section-content">
                <div class="pdf-nota-dados-inline">
                  <div class="pdf-nota-dado-item destaque">
                    <div class="pdf-nota-dado-label">Cliente</div>
                    <div class="pdf-nota-dado-valor">${ordem.cliente || '-'}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">CPF/CNPJ</div>
                    <div class="pdf-nota-dado-valor">${ordem.cnpj || '____'}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">Telefone</div>
                    <div class="pdf-nota-dado-valor">${ordem.telefone || ordem.contato || '____'}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">E-mail</div>
                    <div class="pdf-nota-dado-valor">${ordem.email || '____'}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">Endereço Completo</div>
                    <div class="pdf-nota-dado-valor">${enderecoCompleto}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">CEP</div>
                    <div class="pdf-nota-dado-valor">${ordem.cep || '____'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pdf-nota-section">
              <div class="pdf-nota-section-title">
                <i class="fas fa-tools"></i> DESCRIÇÃO DO SERVIÇO
              </div>
              <div class="pdf-nota-section-content">
                <div class="pdf-nota-dados-inline">
                  <div class="pdf-nota-dado-item destaque">
                    <div class="pdf-nota-dado-label">Serviço</div>
                    <div class="pdf-nota-dado-valor">${ordem.servico || '-'}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">Técnico</div>
                    <div class="pdf-nota-dado-valor">${ordem.tecnico || '-'}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">Data Execução</div>
                    <div class="pdf-nota-dado-valor">${dataStr}</div>
                  </div>
                  <div class="pdf-nota-dado-item">
                    <div class="pdf-nota-dado-label">Cidade</div>
                    <div class="pdf-nota-dado-valor">${ordem.cidade || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            ${produtos.length && paginasProdutos[0] ? `
              <div class="pdf-nota-section">
                <div class="pdf-nota-section-title">
                  <i class="fas fa-box"></i> MATERIAIS E PRODUTOS ${tipoRelatorio === 'sem_quantidade' ? `(${produtos.length} itens)` : `(${qtdTotal} un.)`}
                </div>
                <div class="pdf-nota-section-content">
                  <div class="pdf-produtos-columns">
                    ${paginasProdutos[0].map((coluna, idx) => `
                      <div>
                        ${renderizarTabelaProdutos(coluna, idx * ITENS_POR_COLUNA_PRIMEIRA)}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}

            ${(tipoRelatorio !== 'sem_valores' && tipoRelatorio !== 'sem_quantidade') ? `
              <div class="pdf-nota-section">
                <div class="pdf-nota-section-title vermelho">
                  <i class="fas fa-chart-line"></i> RESUMO FINANCEIRO
                </div>
                <div class="pdf-nota-section-content">
                  <div class="pdf-nota-resumo-compact">
                    <div class="pdf-nota-resumo-item">
                      <div class="pdf-nota-resumo-label">Total Itens</div>
                      <div class="pdf-nota-resumo-valor">${qtdTotal}</div>
                    </div>
                    <div class="pdf-nota-resumo-item">
                      <div class="pdf-nota-resumo-label">Pagamento</div>
                      <div class="pdf-nota-resumo-valor" style="font-size: 9px;">${formaPagamento}</div>
                    </div>
                    <div class="pdf-nota-resumo-item">
                      <div class="pdf-nota-resumo-label">Status</div>
                      <div class="pdf-nota-resumo-valor" style="font-size: 9px; color: ${statusPagamento === 'Pago' ? '#22c55e' : '#ef4444'};">${statusPagamento}</div>
                    </div>
                    <div class="pdf-nota-resumo-item destaque">
                      <div class="pdf-nota-resumo-label">Valor Total</div>
                      <div class="pdf-nota-resumo-valor">${totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            ${tipoRelatorio === 'sem_quantidade' ? `
              <div class="pdf-nota-section">
                <div class="pdf-nota-section-title vermelho">
                  <i class="fas fa-chart-line"></i> RESUMO FINANCEIRO
                </div>
                <div class="pdf-nota-section-content">
                  <div class="pdf-nota-resumo-compact">
                    <div class="pdf-nota-resumo-item">
                      <div class="pdf-nota-resumo-label">Total Itens</div>
                      <div class="pdf-nota-resumo-valor">${produtos.length}</div>
                    </div>
                    <div class="pdf-nota-resumo-item">
                      <div class="pdf-nota-resumo-label">Pagamento</div>
                      <div class="pdf-nota-resumo-valor" style="font-size: 9px;">${formaPagamento}</div>
                    </div>
                    <div class="pdf-nota-resumo-item">
                      <div class="pdf-nota-resumo-label">Status</div>
                      <div class="pdf-nota-resumo-valor" style="font-size: 9px; color: ${statusPagamento === 'Pago' ? '#22c55e' : '#ef4444'};">${statusPagamento}</div>
                    </div>
                    <div class="pdf-nota-resumo-item destaque">
                      <div class="pdf-nota-resumo-label">Valor Total</div>
                      <div class="pdf-nota-resumo-valor">${totalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            ${ordem.observacoes || ordem.notas || ordem.descricao ? `
              <div class="pdf-nota-section">
                <div class="pdf-nota-section-title">
                  <i class="fas fa-sticky-note"></i> OBSERVAÇÕES
                </div>
                <div class="pdf-nota-section-content">
                  <p class="pdf-nota-observacoes-texto">${ordem.observacoes || ordem.notas || ordem.descricao}</p>
                </div>
              </div>
            ` : ''}

            <div class="pdf-nota-section">
              <div class="pdf-nota-section-title">
                <i class="fas fa-shield-alt"></i> CONDIÇÕES GERAIS
              </div>
              <div class="pdf-nota-section-content">
                <div class="pdf-nota-condicoes-list">
                  <div class="pdf-nota-condicoes-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Garantia de 90 dias para serviços e peças.</span>
                  </div>
                  <div class="pdf-nota-condicoes-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Garantia não cobre mau uso ou danos.</span>
                  </div>
                  <div class="pdf-nota-condicoes-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Validade do orçamento: 30 dias.</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pdf-nota-section">
              <div class="pdf-nota-section-title">
                <i class="fas fa-pen-square"></i> ASSINATURAS
              </div>
              <div class="pdf-nota-section-content">
                <div class="pdf-nota-assinaturas">
                  <div class="pdf-nota-assinatura-campo">
                    <div class="pdf-nota-assinatura-linha"></div>
                    <div class="pdf-nota-assinatura-nome">Técnico Responsável</div>
                    <div class="pdf-nota-assinatura-info">
                      Nome: ${ordem.tecnico || '_____________________'}<br>
                      Tel: (15) 99137-1232
                    </div>
                  </div>
                  <div class="pdf-nota-assinatura-campo">
                    <div class="pdf-nota-assinatura-linha"></div>
                    <div class="pdf-nota-assinatura-nome">Cliente</div>
                    <div class="pdf-nota-assinatura-info">
                      Nome: ${ordem.cliente || '_____________________'}<br>
                      CPF/CNPJ: ${ordem.cnpj || '_____________________'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          ${gerarFooter()}
        </div>
      `;
    };

    // ===== GERA PÁGINAS ADICIONAIS (SÓ PRODUTOS) =====
    const gerarPaginaProdutos = (numeroPagina, colunas) => {
      let offsetInicial = ITENS_PRIMEIRA_PAGINA + ((numeroPagina - 2) * ITENS_POR_COLUNA * COLUNAS_POR_PAGINA);

      return `
        <div class="pdf-nota-page">
          ${gerarHeader(numeroPagina)}

          <div class="pdf-nota-body">
            <div class="pdf-nota-section">
              <div class="pdf-nota-section-title">
                <i class="fas fa-box"></i> MATERIAIS E PRODUTOS (CONTINUAÇÃO) ${tipoRelatorio === 'sem_quantidade' ? `(${produtos.length} itens)` : `(${qtdTotal} un.)`}
              </div>
              <div class="pdf-nota-section-content">
                <div class="pdf-produtos-columns">
                  ${colunas.map((coluna, idx) => {
                    const offsetColuna = offsetInicial + (idx * ITENS_POR_COLUNA);
                    return `
                      <div>
                        ${renderizarTabelaProdutos(coluna, offsetColuna)}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>

          ${gerarFooter()}
        </div>
      `;
    };

    // ===== MONTA HTML COMPLETO COM TODAS AS PÁGINAS =====
    let htmlPDF = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    html, body { 
      width: 100%; 
      height: auto;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    
    body { 
      background: #ffffff;
      padding: 0;
    }

    .pdf-nota-page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto 10mm auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .pdf-nota-page:last-child {
      margin-bottom: 0;
    }

    .pdf-nota-header {
      background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
      color: white;
      padding: 12px 15px;
      border-bottom: 3px solid #7f1d1d;
      flex-shrink: 0;
    }

    .pdf-nota-header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 15px;
    }

    .pdf-nota-logo-section {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .pdf-nota-logo-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pdf-nota-logo-text {
      font-size: 14px;
      font-weight: 900;
    }

    .pdf-nota-company-info {
      font-size: 7px;
      line-height: 1.4;
      opacity: 0.9;
    }

    .pdf-nota-header-center {
      text-align: center;
      flex: 1;
    }

    .pdf-nota-header-center h1 {
      font-size: 16px;
      font-weight: 900;
      margin: 0 0 2px 0;
    }

    .pdf-nota-header-center p {
      font-size: 9px;
      margin: 0;
      opacity: 0.9;
    }

    .pdf-nota-header-right {
      text-align: right;
      font-size: 8px;
      line-height: 1.4;
    }

    .pdf-nota-header-item {
      font-weight: 600;
      margin: 2px 0;
    }

    .pdf-nota-body {
      flex: 1;
      padding: 10px 15px 10px 15px;
      background: #fafafa;
      overflow: auto;
    }

    .pdf-nota-section {
      margin-bottom: 8px;
      background: white;
      border: 1px solid #d1d5db;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border-radius: 6px;
    }

    .pdf-nota-section-title {
      background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
      color: white;
      padding: 6px 10px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pdf-nota-section-title.vermelho {
      background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
      border-bottom: 2px solid #7f1d1d;
    }

    .pdf-nota-section-title i {
      font-size: 10px;
    }

    .pdf-nota-section-content {
      padding: 8px 10px;
    }

    .pdf-nota-dados-inline {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .pdf-nota-dado-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-left: 3px solid #6b7280;
      padding: 5px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-radius: 4px;
    }

    .pdf-nota-dado-item.destaque {
      border-left-color: #b91c1c;
      background: #fef2f2;
    }

    .pdf-nota-dado-label {
      font-size: 7px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }

    .pdf-nota-dado-valor {
      font-size: 9px;
      font-weight: 600;
      color: #1f2937;
      word-break: break-word;
    }

    .pdf-produtos-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    /* 🎯 QUANDO HÁ APENAS 1 COLUNA DE PRODUTOS, ELA OCUPA 100% DA LARGURA */
    .pdf-produtos-columns > div:only-child {
      grid-column: 1 / -1;
      max-width: 100%;
    }

    .pdf-nota-resumo-compact {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }

    .pdf-nota-resumo-item {
      flex: 1;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-radius: 4px;
    }

    .pdf-nota-resumo-item.destaque {
      background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
      color: white;
      border: 2px solid #7f1d1d;
    }

    .pdf-nota-resumo-label {
      font-size: 7px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .pdf-nota-resumo-item.destaque .pdf-nota-resumo-label {
      color: rgba(255,255,255,0.8);
    }

    .pdf-nota-resumo-valor {
      font-size: 11px;
      font-weight: 800;
      color: #1f2937;
    }

    .pdf-nota-resumo-item.destaque .pdf-nota-resumo-valor {
      color: #ffffff;
      font-size: 16px;
    }

    .pdf-nota-observacoes-texto {
      font-size: 8px;
      line-height: 1.5;
      color: #4b5563;
      margin: 0;
      padding: 6px;
      background: #f9fafb;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
    }

    .pdf-nota-condicoes-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .pdf-nota-condicoes-item {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      font-size: 8px;
      line-height: 1.3;
      color: #374151;
      padding: 4px;
      background: #f9fafb;
      border-left: 2px solid #6b7280;
      border-radius: 4px;
    }

    .pdf-nota-condicoes-item i {
      color: #22c55e;
      font-size: 8px;
      margin-top: 1px;
      flex-shrink: 0;
    }

    .pdf-nota-assinaturas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 8px;
    }

    .pdf-nota-assinatura-campo {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .pdf-nota-assinatura-linha {
      border-bottom: 1.5px solid #374151;
      height: 20px;
    }

    .pdf-nota-assinatura-nome {
      font-weight: 700;
      color: #1f2937;
      font-size: 8px;
      text-align: center;
    }

    .pdf-nota-assinatura-info {
      font-size: 7px;
      color: #6b7280;
      text-align: center;
      line-height: 1.3;
    }

    .pdf-nota-pdf-footer {
      width: 100%;
      padding: 8px 15px;
      border-top: 3px solid #b91c1c;
      text-align: center;
      background: #f9fafb;
      flex-shrink: 0;
    }

    .pdf-nota-footer-brand {
      font-size: 11px;
      font-weight: 900;
      color: #1f2937;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    .pdf-nota-footer-brand i {
      color: #b91c1c;
    }

    .pdf-nota-footer-info {
      font-size: 7px;
      color: #6b7280;
      margin-bottom: 2px;
    }

    .pdf-nota-footer-timestamp {
      font-size: 6px;
      color: #9ca3af;
      font-style: italic;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body { margin: 0; padding: 0; }
      .pdf-nota-page { 
        max-width: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  ${gerarPrimeiraPagina()}
  ${paginasProdutos.slice(1).map((colunas, idx) => gerarPaginaProdutos(idx + 2, colunas)).join('')}
</body>
</html>`;

    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 100));

    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = '-9999px';
    div.innerHTML = htmlPDF;
    document.body.appendChild(div);

    const containers = div.querySelectorAll('.pdf-nota-page');

    // Aguardar carregamento de fontes
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 300));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Renderizar cada página
    for (let i = 0; i < containers.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const canvas = await html2canvas(containers[i], {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: containers[i].offsetWidth,
        height: containers[i].offsetHeight
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, '', 'FAST');
    }

    document.body.removeChild(div);

    const nomeArquivos = {
      'com_valores': `Nota_Servico_${ordem.cliente || 'cliente'}_ComValorTotal_${Date.now()}.pdf`,
      'sem_valores': `Nota_Servico_${ordem.cliente || 'cliente'}_SemValores_${Date.now()}.pdf`,
      'valores_detalhados': `Nota_Servico_${ordem.cliente || 'cliente'}_Detalhado_${Date.now()}.pdf`,
      'sem_quantidade': `Nota_Servico_${ordem.cliente || 'cliente'}_SemQtdValor_${Date.now()}.pdf`
    };

    pdf.save(nomeArquivos[tipoRelatorio]);
    showToast('PDF gerado com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    showToast('Erro ao gerar PDF. Tente novamente.', 'error');
  }
}





let editingOSId = null;
let editingProducts = [];
let produtosOriginaisOS = [];
let estoqueBackup = {};

async function editarOS(orderId) {
  try {
    const snapshot = await database.ref(`orders/${orderId}`).once('value');
    const ordem = snapshot.val();

    if (!ordem) {
      showToast('Ordem não encontrada no banco', 'error');
      return;
    }

    editingOSId = orderId;

    // ✅ GUARDAR PRODUTOS ORIGINAIS DA OS
    produtosOriginaisOS = Array.isArray(ordem.products) ? [...ordem.products] : [];

    // ✅ FAZER BACKUP DO ESTOQUE ATUAL ANTES DE QUALQUER ALTERAÇÃO
    estoqueBackup = {};
    products.forEach(p => {
      estoqueBackup[p.id] = p.quantity || 0;
    });

    // ✅ RESTAURAR O ESTOQUE DOS PRODUTOS QUE ESTAVAM NA OS (TEMPORARIAMENTE)
    for (const prodOS of produtosOriginaisOS) {
      const produtoOriginal = products.find(p => p.id === prodOS.id);
      if (produtoOriginal) {
        produtoOriginal.quantity = (produtoOriginal.quantity || 0) + prodOS.qty;
      }
    }

    editingProducts = [...produtosOriginaisOS];

    document.getElementById('editCliente').value = ordem.cliente || '';
    document.getElementById('editCNPJ').value = ordem.cnpj || '';
    document.getElementById('editEndereco').value = ordem.endereco || '';
    document.getElementById('editServico').value = ordem.servico || '';
    document.getElementById('editTecnico').value = ordem.tecnico || '';
    document.getElementById('editPagamento').value =
      ordem.payment_method || ordem.formaPagamento || '';
    document.getElementById('editProfitPercent').value =
      ordem.profitPercent ?? 0;

    if (ordem.data) {
      document.getElementById('editData').value =
        new Date(ordem.data).toISOString().split('T')[0];
    }

    renderizarProdutosEdicao();
    atualizarTotaisEdicao();
    document.getElementById('editOSModal').style.display = 'flex';

    showToast('Editando ordem de serviço', 'info');
  } catch (err) {
    console.error(err);
    showToast('Erro ao carregar OS', 'error');
  }
}

function renderizarProdutosEdicao() {
  const container = document.getElementById('editProductsContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!editingProducts || editingProducts.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Nenhum produto nesta ordem</p>';
    return;
  }

  editingProducts.forEach((product, index) => {
    const totalProd = (product.price || 0) * (product.qty || 1);

    const prodHtml = `
      <div class="product-edit-item" data-prod-index="${index}" style="
        background: #242424;
        border: 1px solid #333;
        border-radius: 10px;
        margin-bottom: 12px;
        overflow: hidden;
      ">
        <div class="product-header-collapsed" onclick="toggleProdutoEdicao(${index})" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #1a1a1a;
          cursor: pointer;
          user-select: none;
          transition: background 0.3s ease;
          flex-wrap: wrap;
          gap: 8px;
        " onmouseover="this.style.background='#2a2a2a'" onmouseout="this.style.background='#1a1a1a'">
          <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 0;">
            <i class="fas fa-boxes" style="color: #10b981; font-size: 1rem; flex-shrink: 0;"></i>
            <span style="color: #fff; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(product.name || 'Sem nome').substring(0, 25)}${(product.name || '').length > 25 ? '...' : ''}</span>
          </div>
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <span style="color: #999; font-size: 0.9rem;">Qtd: <strong style="color: #10b981;">${product.qty || 1}</strong></span>
            <span style="color: #10b981; font-weight: 600;">R$ ${totalProd.toFixed(2)}</span>
          </div>
          <button class="toggle-btn-${index}" style="
            background: transparent;
            border: none;
            color: #10b981;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease;
            flex-shrink: 0;
          ">
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>

        <div class="product-content-${index}" style="
          padding: 16px;
          display: none;
          background: #1a1a1a;
          border-top: 1px solid #333;
          animation: slideDown 0.3s ease;
        ">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group" style="width: 100%;">
              <label style="font-weight: 600; color: #fff; display: block; margin-bottom: 8px;"><i class="fas fa-box" style="color: #10b981;"></i> Nome do Produto</label>
              <input type="text" class="product-name" value="${(product.name || '').replace(/"/g, '&quot;')}" placeholder="Nome do produto" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #333;
                border-radius: 6px;
                font-size: 0.95rem;
                background: #2a2a2a;
                color: #fff;
                box-sizing: border-box;
              " onchange="atualizarProdutoEdicao(${index})">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label style="font-weight: 600; color: #fff; display: block; margin-bottom: 8px;"><i class="fas fa-boxes" style="color: #10b981;"></i> Qtd</label>
                <input type="number" class="product-qty" value="${product.qty || 1}" placeholder="1" min="1" step="1" style="
                  width: 100%;
                  padding: 10px;
                  border: 1px solid #333;
                  border-radius: 6px;
                  font-size: 0.95rem;
                  background: #2a2a2a;
                  color: #fff;
                  box-sizing: border-box;
                " onchange="atualizarProdutoEdicao(${index})">
              </div>
              <div class="form-group">
                <label style="font-weight: 600; color: #fff; display: block; margin-bottom: 8px;"><i class="fas fa-tag" style="color: #10b981;"></i> Preço (R$)</label>
                <input type="number" class="product-price" value="${product.price || 0}" placeholder="0.00" step="0.01" style="
                  width: 100%;
                  padding: 10px;
                  border: 1px solid #333;
                  border-radius: 6px;
                  font-size: 0.95rem;
                  background: #2a2a2a;
                  color: #fff;
                  box-sizing: border-box;
                " onchange="atualizarProdutoEdicao(${index})">
              </div>
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #333; padding-top: 12px;">
              <button class="btn btn-danger" onclick="apagarProdutoEdicao(${index})" style="
                padding: 8px 16px;
                font-size: 0.9rem;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s ease;
              " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                <i class="fas fa-trash"></i> Apagar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', prodHtml);
  });

  if (!document.getElementById('product-animation-style')) {
    const style = document.createElement('style');
    style.id = 'product-animation-style';
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
        }
        to {
          opacity: 1;
          max-height: 1000px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function toggleProdutoEdicao(index) {
  const content = document.querySelector(`.product-content-${index}`);
  const btn = document.querySelector(`.toggle-btn-${index}`);

  if (!content || !btn) return;

  if (content.style.display === 'none') {
    content.style.display = 'block';
    btn.style.transform = 'rotate(180deg)';
  } else {
    content.style.display = 'none';
    btn.style.transform = 'rotate(0deg)';
  }
}

function apagarProdutoEdicao(index) {
  const container = document.getElementById('editProductsContainer');
  const productElement = container.querySelector(`[data-prod-index="${index}"]`);

  if (!productElement) return;

  const confirmHtml = `
    <div id="confirm-delete-${index}" style="
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid #ef4444;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <span style="color: #ef4444; font-weight: 600;">
        <i class="fas fa-exclamation-triangle"></i> Confirmar exclusão?
      </span>
      <div style="display: flex; gap: 8px;">
        <button onclick="confirmarExclusaoProduto(${index})" style="
          padding: 6px 12px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">Sim</button>
        <button onclick="cancelarExclusaoProduto(${index})" style="
          padding: 6px 12px;
          background: #333;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">Não</button>
      </div>
    </div>
  `;

  productElement.insertAdjacentHTML('beforebegin', confirmHtml);
}

function confirmarExclusaoProduto(index) {
  const produto = editingProducts[index];
  if (!produto) return;

  // ✅ DEVOLVER AO ESTOQUE LOCAL QUANDO REMOVER
  const produtoOriginal = products.find(p => p.id === produto.id);
  if (produtoOriginal) {
    produtoOriginal.quantity = (produtoOriginal.quantity || 0) + produto.qty;
  }

  editingProducts.splice(index, 1);

  const confirmDiv = document.getElementById(`confirm-delete-${index}`);
  if (confirmDiv) confirmDiv.remove();

  renderizarProdutosEdicao();
  atualizarTotaisEdicao();
  showToast('Produto removido e devolvido ao estoque!', 'success');
}

function cancelarExclusaoProduto(index) {
  const confirmDiv = document.getElementById(`confirm-delete-${index}`);
  if (confirmDiv) confirmDiv.remove();
}

async function atualizarProdutoEdicao(index) {
  const element = document.querySelector(`[data-prod-index="${index}"]`);
  if (!element) return;

  const nomeEl = element.querySelector('.product-name');
  const qtyEl = element.querySelector('.product-qty');
  const precoEl = element.querySelector('.product-price');

  if (!nomeEl || !qtyEl || !precoEl) {
    showToast('Erro ao localizar campos do produto', 'error');
    return;
  }

  const nome = nomeEl.value;
  const novaQty = parseInt(qtyEl.value) || 1;
  const preco = parseFloat(precoEl.value) || 0;

  if (!nome.trim()) {
    showToast('Nome do produto é obrigatório', 'error');
    return;
  }

  if (novaQty <= 0) {
    showToast('Quantidade deve ser maior que zero', 'error');
    qtyEl.value = editingProducts[index].qty || 1;
    return;
  }

  const produtoAtual = editingProducts[index];
  const qtyAnterior = produtoAtual.qty || 0;
  const diferencaQty = novaQty - qtyAnterior;

  if (diferencaQty !== 0) {
    const product = products.find(p => p.id === produtoAtual.id);
    if (!product) {
      showToast('Produto não encontrado no estoque', 'error');
      qtyEl.value = qtyAnterior;
      return;
    }

    const estoqueAtual = product.quantity || 0;

    if (diferencaQty > 0) {
      if (diferencaQty > estoqueAtual) {
        showToast(`Estoque insuficiente! Disponível: ${estoqueAtual}`, 'error');
        qtyEl.value = qtyAnterior;
        return;
      }

      product.quantity = estoqueAtual - diferencaQty;
    }

    if (diferencaQty < 0) {
      const quantidadeDevolver = Math.abs(diferencaQty);
      product.quantity = estoqueAtual + quantidadeDevolver;
    }
  }

  editingProducts[index] = {
    ...editingProducts[index],
    name: nome,
    description: editingProducts[index].description || '',
    qty: novaQty,
    price: preco,
    id: editingProducts[index]?.id || ''
  };

  atualizarTotaisEdicao();
  renderizarProdutosEdicao();
}

function atualizarTotaisEdicao() {
  let subtotal = 0;
  editingProducts.forEach(prod => {
    subtotal += (prod.price || 0) * (prod.qty || 1);
  });

  const profitPercentEl = document.getElementById('editProfitPercent');
  let profitPercent = 0;
  if (profitPercentEl) {
    const value = parseFloat(profitPercentEl.value);
    if (!isNaN(value)) {
      profitPercent = value;
    }
  }

  const profitValue = (subtotal * profitPercent) / 100;
  const total = subtotal + profitValue;

  const subtotalEl = document.getElementById('editSubtotal');
  const totalEl = document.getElementById('editTotalComLucro');

  if (subtotalEl) subtotalEl.value = subtotal.toFixed(2);
  if (totalEl) totalEl.value = total.toFixed(2);
}

async function salvarEdicaoOS() {
  if (!editingOSId) {
    showToast('ID da OS não encontrado', 'error');
    return;
  }

  try {
    // ✅ Atualizar dados dos produtos editados
    editingProducts.forEach((_, index) => {
      const element = document.querySelector(`[data-prod-index="${index}"]`);
      if (element) {
        const nomeEl = element.querySelector('.product-name');
        const qtyEl = element.querySelector('.product-qty');
        const precoEl = element.querySelector('.product-price');

        editingProducts[index] = {
          ...editingProducts[index],
          name: nomeEl ? nomeEl.value : (editingProducts[index].name || ''),
          description: editingProducts[index].description || '',
          qty: qtyEl ? (parseInt(qtyEl.value) || 1) : (editingProducts[index].qty || 1),
          price: precoEl ? (parseFloat(precoEl.value) || 0) : (editingProducts[index].price || 0)
        };
      }
    });

    // ✅ COMPARAR PRODUTOS: Encontrar removidos e alterados
    const produtosRemovidos = produtosOriginaisOS.filter(
      original => !editingProducts.some(editado => editado.id == original.id)
    );

    const produtosAlterados = produtosOriginaisOS.filter(original => {
      const editado = editingProducts.find(p => p.id == original.id);
      return editado && editado.qty !== original.qty;
    });

    console.log('Produtos removidos:', produtosRemovidos);
    console.log('Produtos com quantidade alterada:', produtosAlterados);

    // ✅ DEVOLVER ESTOQUE DOS PRODUTOS REMOVIDOS
    for (const produtoRemovido of produtosRemovidos) {
      try {
        // Buscar produto no Firebase
        const produtoSnapshot = await database.ref('products')
          .orderByChild('id')
          .equalTo(Number(produtoRemovido.id))
          .once('value');

        if (produtoSnapshot.exists()) {
          produtoSnapshot.forEach(async (childSnapshot) => {
            const produto = childSnapshot.val();
            const firebaseKey = childSnapshot.key;

            const novoEstoque = (produto.quantity || 0) + produtoRemovido.qty;

            await database.ref(`products/${firebaseKey}`).update({
              quantity: novoEstoque
            });

            console.log(`✅ Devolvido ${produtoRemovido.qty}x de "${produtoRemovido.name}" ao estoque`);
          });
        }
      } catch (error) {
        console.error(`Erro ao devolver estoque de ${produtoRemovido.name}:`, error);
      }
    }

    // ✅ AJUSTAR ESTOQUE DOS PRODUTOS COM QUANTIDADE ALTERADA
    for (const produtoOriginal of produtosAlterados) {
      try {
        const produtoEditado = editingProducts.find(p => p.id == produtoOriginal.id);
        if (!produtoEditado) continue;

        const diferencaQty = produtoOriginal.qty - produtoEditado.qty;

        // Buscar produto no Firebase
        const produtoSnapshot = await database.ref('products')
          .orderByChild('id')
          .equalTo(Number(produtoOriginal.id))
          .once('value');

        if (produtoSnapshot.exists()) {
          produtoSnapshot.forEach(async (childSnapshot) => {
            const produto = childSnapshot.val();
            const firebaseKey = childSnapshot.key;

            // Se diminuiu a quantidade na OS, devolver ao estoque
            // Se aumentou a quantidade na OS, retirar do estoque
            const novoEstoque = (produto.quantity || 0) + diferencaQty;

            if (novoEstoque < 0) {
              showToast(`Estoque insuficiente para ${produto.name}`, 'error');
              return;
            }

            await database.ref(`products/${firebaseKey}`).update({
              quantity: novoEstoque
            });

            if (diferencaQty > 0) {
              console.log(`✅ Devolvido ${diferencaQty}x de "${produto.name}" ao estoque`);
            } else {
              console.log(`✅ Retirado ${Math.abs(diferencaQty)}x de "${produto.name}" do estoque`);
            }
          });
        }
      } catch (error) {
        console.error(`Erro ao ajustar estoque:`, error);
      }
    }

    // ✅ Preparar dados limpos para salvar
    const produtosLimpos = editingProducts.map(prod => ({
      id: prod.id || '',
      name: prod.name || '',
      description: prod.description || '',
      qty: prod.qty || 1,
      price: prod.price || 0
    }));

    // ✅ Calcular totais
    let subtotal = 0;
    produtosLimpos.forEach(prod => {
      subtotal += (prod.price || 0) * (prod.qty || 1);
    });

    const profitPercentEl = document.getElementById('editProfitPercent');
    const profitPercent = profitPercentEl
      ? (isNaN(parseFloat(profitPercentEl.value))
        ? 0
        : parseFloat(profitPercentEl.value))
      : 0;
    const profitValue = (subtotal * profitPercent) / 100;
    const total = subtotal + profitValue;

    // ✅ Coletar dados do formulário
    const clienteEl = document.getElementById('editCliente');
    const cnpjEl = document.getElementById('editCNPJ');
    const enderecoEl = document.getElementById('editEndereco');
    const servicoEl = document.getElementById('editServico');
    const tecnicoEl = document.getElementById('editTecnico');
    const pagamentoEl = document.getElementById('editPagamento');
    const dataEl = document.getElementById('editData');

    const dadosAtualizados = {
      cliente: clienteEl ? (clienteEl.value || '') : '',
      cnpj: cnpjEl ? (cnpjEl.value || '') : '',
      endereco: enderecoEl ? (enderecoEl.value || '') : '',
      servico: servicoEl ? (servicoEl.value || '') : '',
      tecnico: tecnicoEl ? (tecnicoEl.value || '') : '',
      payment_method: pagamentoEl ? (pagamentoEl.value || '') : '',
      formaPagamento: pagamentoEl ? (pagamentoEl.value || '') : '',
      data: dataEl && dataEl.value
        ? new Date(dataEl.value).toISOString()
        : new Date().toISOString(),
      products: produtosLimpos,
      subtotal: Math.round(subtotal * 100) / 100,
      profitPercent: profitPercent,
      profitValue: Math.round(profitValue * 100) / 100,
      total: Math.round(total * 100) / 100,
      preco: Math.round(total * 100) / 100
    };

    // ✅ Atualizar OS no Firebase
    await database.ref(`orders/${editingOSId}`).update(dadosAtualizados);

    // ✅ Limpar variáveis de controle
    produtosOriginaisOS = [];
    editingProducts = [];
    editingOSId = null;

    closeEditOSModal();
    showToast('Ordem atualizada com sucesso!', 'success');

    if (typeof loadOrders === 'function') {
      loadOrders();
    }

  } catch (err) {
    console.error('Erro ao salvar:', err);
    showToast('Erro ao salvar edição: ' + err.message, 'error');
  }
}

//



function filtrarProdutosEditOSModal() {
  const searchInput = document.getElementById('searchProductEditOSInput');
  const searchTerm = searchInput?.value.toLowerCase() || '';

  const list = document.getElementById('productEditOSModalList');
  if (!list) return;

  database.ref('products').once('value', (snapshot) => {
    const produtosDisponiveis = [];

    snapshot.forEach((childSnapshot) => {
      const produto = childSnapshot.val();
      const firebaseKey = childSnapshot.key;

      if (produto.quantity > 0) {
        produtosDisponiveis.push({
          ...produto,
          firebaseKey: firebaseKey
        });
      }
    });

    const produtosNaoAdicionados = produtosDisponiveis.filter(
      p => !editingProducts.some(ep => ep.id == p.id)
    );

    // ✅ Aplicar filtro de busca
    const produtosFiltrados = produtosNaoAdicionados.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );

    if (produtosFiltrados.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
          <p style="margin: 0; font-size: 15px;">Nenhum produto encontrado</p>
        </div>
      `;
      return;
    }

    list.innerHTML = produtosFiltrados.map(produto => `
      <div style="
        background: #2a2a2a;
        border: 2px solid #333;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
      " onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='#333'">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="flex: 1;">
            <div style="color: #fff; font-weight: 700; font-size: 15px; margin-bottom: 4px;">
              ${escapeHtml(produto.name)}
            </div>
            ${produto.description ? `
              <div style="color: #999; font-size: 12px; margin-bottom: 6px;">
                ${escapeHtml(produto.description)}
              </div>
            ` : ''}
            <div style="display: flex; gap: 12px; font-size: 13px; color: #aaa;">
              <span><strong style="color: #10b981;">Preço:</strong> R$ ${produto.price.toFixed(2)}</span>
              <span><strong style="color: ${produto.quantity <= 5 ? '#ef4444' : '#10b981'};">Estoque:</strong> ${produto.quantity}</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px; align-items: center;">
          <input 
            type="number" 
            id="qty_edit_${produto.id}" 
            min="1" 
            max="${produto.quantity}"
            value="1" 
            style="
              width: 80px;
              padding: 8px 10px;
              background: #1a1a1a;
              border: 2px solid #333;
              border-radius: 8px;
              color: #fff;
              font-size: 14px;
              font-weight: 600;
              text-align: center;
            "
          >
          <button 
            onclick="selecionarProdutoEditOSModal('${produto.id}')"
            style="
              flex: 1;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: none;
              color: #fff;
              padding: 10px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            "
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
          >
            <i class="fas fa-plus"></i>
            Adicionar
          </button>
        </div>
      </div>
    `).join('');
  });
}



function renderizarListaProdutosEditOSModal() {
  const list = document.getElementById('productEditOSModalList');
  if (!list) return;

  // ✅ Buscar produtos diretamente do Firebase
  database.ref('products').once('value', (snapshot) => {
    const produtosDisponiveis = [];

    snapshot.forEach((childSnapshot) => {
      const produto = childSnapshot.val();
      const firebaseKey = childSnapshot.key;

      // ✅ Mostrar apenas produtos com estoque > 0
      if (produto.quantity > 0) {
        produtosDisponiveis.push({
          ...produto,
          firebaseKey: firebaseKey
        });
      }
    });

    // ✅ Filtrar produtos já adicionados à OS
    const produtosNaoAdicionados = produtosDisponiveis.filter(
      p => !editingProducts.some(ep => ep.id == p.id)
    );

    // Renderizar lista
    if (produtosNaoAdicionados.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
          <p style="margin: 0; font-size: 15px;">Nenhum produto disponível</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.7;">Todos os produtos já foram adicionados ou estão sem estoque</p>
        </div>
      `;
      return;
    }

    list.innerHTML = produtosNaoAdicionados.map(produto => `
      <div style="
        background: #2a2a2a;
        border: 2px solid #333;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
      " onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='#333'">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="flex: 1;">
            <div style="color: #fff; font-weight: 700; font-size: 15px; margin-bottom: 4px;">
              ${escapeHtml(produto.name)}
            </div>
            ${produto.description ? `
              <div style="color: #999; font-size: 12px; margin-bottom: 6px;">
                ${escapeHtml(produto.description)}
              </div>
            ` : ''}
            <div style="display: flex; gap: 12px; font-size: 13px; color: #aaa;">
              <span><strong style="color: #10b981;">Preço:</strong> R$ ${produto.price.toFixed(2)}</span>
              <span><strong style="color: ${produto.quantity <= 5 ? '#ef4444' : '#10b981'};">Estoque:</strong> ${produto.quantity}</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px; align-items: center;">
          <input 
            type="number" 
            id="qty_edit_${produto.id}" 
            min="1" 
            max="${produto.quantity}"
            value="1" 
            style="
              width: 80px;
              padding: 8px 10px;
              background: #1a1a1a;
              border: 2px solid #333;
              border-radius: 8px;
              color: #fff;
              font-size: 14px;
              font-weight: 600;
              text-align: center;
            "
          >
          <button 
            onclick="selecionarProdutoEditOSModal('${produto.id}')"
            style="
              flex: 1;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: none;
              color: #fff;
              padding: 10px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            "
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
          >
            <i class="fas fa-plus"></i>
            Adicionar
          </button>
        </div>
      </div>
    `).join('');
  });
}


function validarQuantidadeEditModalOS(prodId, maxStock) {
  const input = document.getElementById(`qty_edit_${prodId}`);
  if (!input) return;

  let valor = parseInt(input.value);

  if (isNaN(valor) || valor < 1) {
    input.value = 1;
  } else if (valor > maxStock) {
    input.value = maxStock;
    showToast(`Quantidade máxima disponível: ${maxStock}`, 'info');
  } else {
    input.value = valor;
  }
}

function alterarQuantidadeEditModal(productId, delta, maxStock) {
  const input = document.getElementById(`qty_edit_${productId}`);
  if (!input) return;

  let currentValue = parseInt(input.value) || 1;
  let newValue = currentValue + delta;

  if (newValue < 1) newValue = 1;

  if (maxStock && newValue > maxStock) {
    showToast('Quantidade maior que o estoque disponível!', 'error');
    newValue = maxStock;
  }

  input.value = newValue;
}



// Referências do banco de dados
const productsRef = database.ref('products');
const osRef = database.ref('os');

// Arrays locais que serão sincronizados com Firebase

// ✅ Listener em tempo real para produtos
productsRef.on('value', (snapshot) => {
  products = [];
  const data = snapshot.val();

  if (data) {
    Object.keys(data).forEach(key => {
      products.push({
        firebaseKey: key,
        ...data[key]
      });
    });
  }

  // Atualizar UI se necessário
  if (typeof renderProducts === 'function') {
    renderProducts();
  }
});

// ✅ Função para adicionar produto à OS (com atualização em tempo real)
async function selecionarProdutoEditOSModal(productId) {
  try {
    // Buscar produto atualizado do Firebase em tempo real
    const produtoSnapshot = await database.ref('products')
      .orderByChild('id')
      .equalTo(Number(productId))
      .once('value');

    if (!produtoSnapshot.exists()) {
      showToast('Produto não encontrado', 'error');
      return;
    }

    let produto = null;
    let firebaseKey = null;

    produtoSnapshot.forEach((childSnapshot) => {
      produto = childSnapshot.val();
      firebaseKey = childSnapshot.key;
    });

    // Verificar se já foi adicionado
    const produtoJaAdicionado = editingProducts.find(p => p.id == productId);
    if (produtoJaAdicionado) {
      showToast('Este produto já foi adicionado à OS', 'error');
      return;
    }

    const qtyInput = document.getElementById(`qty_edit_${productId}`);
    const qty = parseInt(qtyInput?.value) || 1;

    if (qty <= 0) {
      showToast('Quantidade inválida', 'error');
      return;
    }

    const stockAvailable = produto.quantity || 0;
    if (qty > stockAvailable) {
      showToast(`Estoque insuficiente! Disponível: ${stockAvailable}`, 'error');
      return;
    }

    // ✅ DESCONTAR do estoque no Firebase
    const novoEstoque = stockAvailable - qty;
    await database.ref(`products/${firebaseKey}/quantity`).set(novoEstoque);

    // ✅ Adicionar ao array de produtos da OS em edição
    editingProducts.push({
      id: produto.id,
      firebaseKey: firebaseKey, // ✅ Guardar a chave do Firebase
      name: produto.name,
      description: produto.description || '',
      qty: qty,
      price: produto.price
    });

    // Fechar modal e atualizar UI
    closeProductModal();

    if (typeof renderizarProdutosEdicao === 'function') {
      renderizarProdutosEdicao();
    }

    if (typeof atualizarTotaisEdicao === 'function') {
      atualizarTotaisEdicao();
    }

    // ✅ Forçar atualização do modal de produtos
    if (document.getElementById('productEditOSModalList')) {
      renderizarListaProdutosEditOSModal();
    }

    showToast(`${produto.name} (${qty}x) adicionado!`, 'success');

  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    showToast('Erro ao adicionar produto', 'error');
  }
}

// ✅ Função para remover produto da OS (com atualização em tempo real)
// ✅ VERSÃO CORRIGIDA - Remover produto da OS
async function removerProdutoEdicao(index) {
  try {
    const produtoRemovido = editingProducts[index];

    if (!produtoRemovido) {
      showToast('Produto não encontrado', 'error');
      return;
    }

    // ✅ DEVOLVER estoque no Firebase usando a chave correta
    if (produtoRemovido.firebaseKey) {
      const produtoRef = database.ref(`products/${produtoRemovido.firebaseKey}`);
      const snapshot = await produtoRef.once('value');
      const produtoAtual = snapshot.val();

      if (produtoAtual) {
        const novoEstoque = (produtoAtual.quantity || 0) + produtoRemovido.qty;
        await produtoRef.update({ quantity: novoEstoque });
      }
    }

    // Remover do array local
    editingProducts.splice(index, 1);

    // Atualizar UI
    if (typeof renderizarProdutosEdicao === 'function') {
      renderizarProdutosEdicao();
    }

    if (typeof atualizarTotaisEdicao === 'function') {
      atualizarTotaisEdicao();
    }

    // ✅ Forçar atualização do modal de produtos se estiver aberto
    if (document.getElementById('productEditOSModalList')) {
      renderizarListaProdutosEditOSModal();
    }

    showToast(`${produtoRemovido.name} removido - estoque devolvido`, 'success');

  } catch (error) {
    console.error('Erro ao remover produto:', error);
    showToast('Erro ao remover produto', 'error');
  }
}


// ✅ Função auxiliar para salvar OS completa no Firebase
async function salvarOSNoFirebase(osData) {
  try {
    // Criar nova OS ou atualizar existente
    if (osData.id) {
      // Atualizar OS existente
      await database.ref(`os/${osData.id}`).update(osData);
    } else {
      // Criar nova OS
      const newOsRef = osRef.push();
      osData.id = newOsRef.key;
      await newOsRef.set(osData);
    }

    showToast('OS salva com sucesso!', 'success');
    return osData.id;

  } catch (error) {
    console.error('Erro ao salvar OS:', error);
    showToast('Erro ao salvar OS', 'error');
    return null;
  }
}

// ✅ Listener em tempo real para uma OS específica
function monitorarOS(osId, callback) {
  const osItemRef = database.ref(`os/${osId}`);

  osItemRef.on('value', (snapshot) => {
    const osData = snapshot.val();
    if (osData && typeof callback === 'function') {
      callback(osData);
    }
  });

  // Retornar função para parar de monitorar
  return () => osItemRef.off('value');
}

// ✅ Desconectar listeners quando não precisar mais
function desconectarListeners() {
  productsRef.off();
  osRef.off();
}




function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function closeEditOSModal() {
  // ✅ RESTAURAR ESTOQUE ORIGINAL (CANCELAR ALTERAÇÕES)
  if (Object.keys(estoqueBackup).length > 0) {
    products.forEach(p => {
      if (estoqueBackup.hasOwnProperty(p.id)) {
        p.quantity = estoqueBackup[p.id];
      }
    });
  }

  document.getElementById('editOSModal').style.display = 'none';
  editingOSId = null;
  editingProducts = [];
  produtosOriginaisOS = [];
  estoqueBackup = {};
}

async function excluirOS(orderId) {
  const ordem = allOrders.find(o => o.id === orderId);
  if (!ordem) {
    showToast('Ordem não encontrada', 'error');
    return;
  }

  const confirmed = await showConfirmDialog(
    'Confirmar Exclusão',
    `Tem certeza que deseja excluir a ordem de <strong>${escapeHtml(ordem.cliente || 'este cliente')}</strong>?<br><br><span style="color: #10b981;">Os produtos serão devolvidos ao estoque.</span>`
  );

  if (!confirmed) return;

  try {
    showToast('Excluindo ordem e devolvendo estoque...', 'info');

    const produtosDaOS = Array.isArray(ordem.products) ? ordem.products : [];

    for (const osProd of produtosDaOS) {
      const product = products.find(p => p.id === osProd.id);
      if (product) {
        const newStock = (product.quantity || 0) + (osProd.qty || 0);
        await firebase.database().ref('products/' + osProd.id).update({
          quantity: newStock
        });

        product.quantity = newStock;
      }
    }

    const ordemRef = firebase.database().ref('orders/' + orderId);
    await ordemRef.remove();

    showToast('Ordem excluída - Produtos devolvidos ao estoque!', 'success');

    if (typeof loadOrders === 'function') {
      loadOrders();
    }
  } catch (error) {
    console.error('Erro ao excluir ordem:', error);
    showToast('Erro ao excluir: ' + error.message, 'error');
  }
}

function switchEditTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.style.borderBottomColor = 'transparent';
    btn.style.color = '#666';
    btn.classList.remove('active');
  });

  const selectedTab = document.getElementById(`tab-${tabName}`);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }

  const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.style.borderBottomColor = '#10b981';
    activeBtn.style.color = '#10b981';
    activeBtn.classList.add('active');
  }

  if (tabName === 'produtos') {
    renderizarProdutosEdicao();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.addEventListener('click', function (e) {
    if (e.target && (e.target.id === 'addProductToEditOSBtn' || e.target.closest('#addProductToEditOSBtn'))) {
      e.preventDefault();
      e.stopPropagation();
      abrirModalSelecionarProdutoEditOS();
    }
  });
});




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
    /* DIMINUIR ESTOQUE DOS PRODUTOS */
    /* ============================= */

    for (const produto of osSelectedProducts) {
      if (produto.id) {
        const produtoSnapshot = await database.ref(`products/${produto.id}`).once('value');
        const produtoNoEstoque = produtoSnapshot.val();

        if (produtoNoEstoque) {
          const quantidadeAtual = produtoNoEstoque.quantity || 0;
          const quantidadeUsada = produto.qty || 0;
          const novaQuantidade = quantidadeAtual - quantidadeUsada;

          // Atualizar o estoque (garantir que não fique negativo)
          await database.ref(`products/${produto.id}`).update({
            quantity: novaQuantidade < 0 ? 0 : novaQuantidade
          });
        }
      }
    }

    /* ============================= */
    /* SALVAR NO FIREBASE */
    /* ============================= */

    await database.ref('orders').push(data);

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

    // Guarda dados para reutilizar
    window.ultimaEmpresaCadastrada = {
      id: companyId,
      tipo: 'empresa',
      ...company
    };

    openModal('inspectionFormModal');

    setTimeout(() => {
      // Atualiza label
      const labelRazaoNome = document.getElementById('labelRazaoNome');
      if (labelRazaoNome) labelRazaoNome.textContent = 'Razão Social';

      // Preenche campos com IDs corretos
      const campoRazao = document.getElementById('inspecaoRazao');
      const campoCnpj = document.getElementById('inspecaoCnpj');
      const campoTelefone = document.getElementById('inspecaoTelefone');
      const campoResponsavel = document.getElementById('inspecaoResponsavel');
      const campoCep = document.getElementById('inspecaoCep');
      const campoEndereco = document.getElementById('inspecaoEndereco');
      const campoNumeroEmpresa = document.getElementById('inspecaoNumeroEmpresa');

      if (campoRazao) campoRazao.value = company.razao_social || '';
      if (campoCnpj) campoCnpj.value = company.cnpj || '';
      if (campoTelefone) campoTelefone.value = company.telefone || '';
      if (campoResponsavel) campoResponsavel.value = company.responsavel || '';
      if (campoCep) campoCep.value = company.cep || '';
      if (campoEndereco) campoEndereco.value = company.endereco || '';
      if (campoNumeroEmpresa) campoNumeroEmpresa.value = company.numero_empresa || '';

      // Mostra campo empresa, oculta campo prédio
      const rowEmpresa = document.getElementById('rowNumeroEmpresa');
      const rowPredio = document.getElementById('rowNumeroPredio');
      const campoNumeroPredio = document.getElementById('inspecaoNumeroPredio');

      if (rowEmpresa) rowEmpresa.style.display = 'flex';
      if (rowPredio) rowPredio.style.display = 'none';
      if (campoNumeroPredio) campoNumeroPredio.value = '';

      window.currentInspectionType = 'empresa';
    }, 200);
  } catch (err) {
    console.error('Erro startInspection:', err);
    showToast('Erro ao iniciar inspeção', 'error');
  }
}

// Start Inspection Building (PRÉDIO) - VERSÃO ÚNICA
async function startInspectionBuilding(buildingId) {
  try {
    const snapshot = await database.ref(`buildings/${buildingId}`).once('value');
    const building = snapshot.val();
    if (!building) return showToast('Prédio não encontrado', 'error');

    // Guarda dados para reutilizar (tipo 'predio' para PDF)
    window.ultimaEmpresaCadastrada = {
      id: buildingId,
      tipo: 'predio',
      ...building
    };

    openModal('inspectionFormModal');

    setTimeout(() => {
      // Atualiza label
      const labelRazaoNome = document.getElementById('labelRazaoNome');
      if (labelRazaoNome) labelRazaoNome.textContent = 'Nome do Prédio';

      // Preenche campos com IDs corretos
      const campoRazao = document.getElementById('inspecaoRazao');
      const campoCnpj = document.getElementById('inspecaoCnpj');
      const campoTelefone = document.getElementById('inspecaoTelefone');
      const campoResponsavel = document.getElementById('inspecaoResponsavel');
      const campoCep = document.getElementById('inspecaoCep');
      const campoEndereco = document.getElementById('inspecaoEndereco');
      const campoNumeroPredio = document.getElementById('inspecaoNumeroPredio');

      if (campoRazao) campoRazao.value = building.razao_social_predio || '';
      if (campoCnpj) campoCnpj.value = building.cnpj_predio || '';
      if (campoTelefone) campoTelefone.value = building.telefone_predio || '';
      if (campoResponsavel) campoResponsavel.value = building.responsavel_predio || '';
      if (campoCep) campoCep.value = building.cep_predio || '';
      if (campoEndereco) campoEndereco.value = building.endereco_predio || '';
      if (campoNumeroPredio) campoNumeroPredio.value = building.numero_predio || '';

      // Oculta campo empresa, mostra campo prédio
      const rowEmpresa = document.getElementById('rowNumeroEmpresa');
      const rowPredio = document.getElementById('rowNumeroPredio');
      const campoNumeroEmpresa = document.getElementById('inspecaoNumeroEmpresa');

      if (rowEmpresa) rowEmpresa.style.display = 'none';
      if (rowPredio) rowPredio.style.display = 'flex';
      if (campoNumeroEmpresa) campoNumeroEmpresa.value = '';

      window.currentInspectionType = 'predio';
    }, 200);
  } catch (err) {
    console.error('Erro startInspectionBuilding:', err);
    showToast('Erro ao iniciar inspeção do prédio', 'error');
  }
}



// ---------- startInspectionBuilding para prédio (lista -> iniciar inspeção) ----------


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
/* ============================= */
/* SALVAR PRODUTO NO FIREBASE */
/* ============================= */

function saveProduct() {
  const name = document.getElementById('productName').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const quantity = parseInt(document.getElementById('productQuantity').value) || 0;

  if (!name || isNaN(price) || price < 0) {
    showToast('Preencha todos os campos obrigatórios corretamente', 'error');
    return;
  }

  const productId = Date.now();

  const productData = {
    id: productId,
    name,
    description,
    price,
    quantity
  };

  firebase.database().ref('products/' + productId).set(productData)
    .then(() => {
      showToast('Produto cadastrado com sucesso!', 'success');
      closeProductModal();
      clearProductForm();
    })
    .catch(err => {
      console.error(err);
      showToast('Erro ao salvar produto', 'error');
    });
}

/* ============================= */
/* LIMPAR FORM PRODUTO */
/* ============================= */

function clearProductForm() {
  document.getElementById('productName').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productQuantity').value = '';
}

/* ============================= */
/* CARREGAR PRODUTOS DO FIREBASE */
/* ============================= */
// ===========================
// VARIÁVEIS GLOBAIS
// ===========================
let products = [];
let osSelectedProducts = [];
let currentPage = 1;
let editingProductId = null;

// ===========================
// CARREGAR PRODUTOS DO FIREBASE
// ===========================
function loadProducts() {
  firebase.database().ref('products').on('value', snapshot => {
    products = [];

    snapshot.forEach(child => {
      products.push(child.val());
    });

    // ORDENAR POR NOME (A-Z)
    products.sort((a, b) => a.name.localeCompare(b.name));

    renderProducts();
    populateOSProductSelect();
  });
}

// ===========================
// RENDERIZAR LISTA DE PRODUTOS COM ESTOQUE
// ===========================
// ============================================
// VARIÁVEIS GLOBAIS PARA FILTROS E VISUALIZAÇÃO
// ============================================

let productViewMode = 'cards';
let productSearchQuery = '';
let filtersVisible = false;
let productFilters = {
  priceMin: '',
  priceMax: '',
  quantityMin: '',
  quantityMax: '',
  status: 'all'
};

// ============================================
// FUNÇÃO PARA ALTERNAR VISIBILIDADE DOS FILTROS
// ============================================

function toggleFiltersVisibility() {
  filtersVisible = !filtersVisible;
  const filtersRow = document.getElementById('filtersRow');
  const toggleIcon = document.getElementById('toggleFiltersIcon');

  if (filtersRow && toggleIcon) {
    if (filtersVisible) {
      filtersRow.style.display = 'grid';
      toggleIcon.className = 'fas fa-chevron-up';
    } else {
      filtersRow.style.display = 'none';
      toggleIcon.className = 'fas fa-chevron-down';
    }
  }
}

// ============================================
// FUNÇÃO PARA APLICAR BUSCA
// ============================================

function applyProductSearch() {
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) {
    productSearchQuery = searchInput.value.toLowerCase().trim();
  }
  currentPage = 1;
  renderProducts();
}

// ============================================
// FUNÇÃO PARA APLICAR FILTROS
// ============================================

function applyProductFilters() {
  const priceMinInput = document.getElementById('filterPriceMin');
  const priceMaxInput = document.getElementById('filterPriceMax');
  const qtyMinInput = document.getElementById('filterQtyMin');
  const qtyMaxInput = document.getElementById('filterQtyMax');
  const statusSelect = document.getElementById('filterStatus');

  productFilters.priceMin = priceMinInput ? priceMinInput.value : '';
  productFilters.priceMax = priceMaxInput ? priceMaxInput.value : '';
  productFilters.quantityMin = qtyMinInput ? qtyMinInput.value : '';
  productFilters.quantityMax = qtyMaxInput ? qtyMaxInput.value : '';
  productFilters.status = statusSelect ? statusSelect.value : 'all';

  currentPage = 1;
  renderProducts();
  showToast('Filtros aplicados!', 'success');
}

// ============================================
// FUNÇÃO PARA LIMPAR FILTROS
// ============================================

function clearProductFilters() {
  productSearchQuery = '';
  productFilters = {
    priceMin: '',
    priceMax: '',
    quantityMin: '',
    quantityMax: '',
    status: 'all'
  };

  const searchInput = document.getElementById('productSearchInput');
  const priceMinInput = document.getElementById('filterPriceMin');
  const priceMaxInput = document.getElementById('filterPriceMax');
  const qtyMinInput = document.getElementById('filterQtyMin');
  const qtyMaxInput = document.getElementById('filterQtyMax');
  const statusSelect = document.getElementById('filterStatus');

  if (searchInput) searchInput.value = '';
  if (priceMinInput) priceMinInput.value = '';
  if (priceMaxInput) priceMaxInput.value = '';
  if (qtyMinInput) qtyMinInput.value = '';
  if (qtyMaxInput) qtyMaxInput.value = '';
  if (statusSelect) statusSelect.value = 'all';

  currentPage = 1;
  renderProducts();
  showToast('Filtros limpos!', 'success');
}

// ============================================
// FUNÇÃO PARA FILTRAR PRODUTOS
// ============================================

function filterProductsClient(productsArray) {
  return productsArray.filter(prod => {
    if (productSearchQuery) {
      const nameMatch = prod.name.toLowerCase().includes(productSearchQuery);
      const descMatch = (prod.description || '').toLowerCase().includes(productSearchQuery);
      if (!nameMatch && !descMatch) return false;
    }

    if (productFilters.priceMin !== '') {
      const minPrice = parseFloat(productFilters.priceMin);
      if (prod.price < minPrice) return false;
    }

    if (productFilters.priceMax !== '') {
      const maxPrice = parseFloat(productFilters.priceMax);
      if (prod.price > maxPrice) return false;
    }

    if (productFilters.quantityMin !== '') {
      const minQty = parseInt(productFilters.quantityMin);
      if ((prod.quantity || 0) < minQty) return false;
    }

    if (productFilters.quantityMax !== '') {
      const maxQty = parseInt(productFilters.quantityMax);
      if ((prod.quantity || 0) > maxQty) return false;
    }

    if (productFilters.status !== 'all') {
      const qty = prod.quantity || 0;
      if (productFilters.status === 'out-of-stock' && qty !== 0) return false;
      if (productFilters.status === 'low-stock' && (qty === 0 || qty > 5)) return false;
      if (productFilters.status === 'in-stock' && qty <= 5) return false;
    }

    return true;
  });
}

// ============================================
// FUNÇÃO PARA CRIAR BARRA DE FERRAMENTAS
// ============================================

function createProductToolbar() {
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;

  const topRow = document.createElement('div');
  topRow.style.cssText = `
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  `;

  // BARRA DE BUSCA COM BOTÃO
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    flex: 1;
    min-width: 250px;
    display: flex;
    gap: 8px;
  `;

  const searchInputWrapper = document.createElement('div');
  searchInputWrapper.style.cssText = `
    flex: 1;
    position: relative;
  `;
  searchInputWrapper.innerHTML = `
    <input 
      type="text" 
      id="productSearchInput" 
      placeholder="Buscar por nome ou descrição..."
      style="
        width: 100%;
        padding: 12px 40px 12px 45px;
        background: #0d0d0d;
        border: 2px solid #333;
        border-radius: 10px;
        color: #fff;
        font-size: 14px;
        transition: all 0.3s ease;
        box-sizing: border-box;
      "
      onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'"
      onblur="this.style.borderColor='#333'; this.style.boxShadow='none'"
    />
    <i class="fas fa-search" style="
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #10b981;
      font-size: 14px;
    "></i>
  `;

  // BOTÃO DE BUSCAR
  const searchButton = document.createElement('button');
  searchButton.innerHTML = '<i class="fas fa-search"></i><span style="margin-left: 8px;">Buscar</span>';
  searchButton.style.cssText = `
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
    border-radius: 10px;
    padding: 12px 20px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    white-space: nowrap;
  `;
  searchButton.onmouseover = function () {
    this.style.background = 'rgba(16, 185, 129, 0.25)';
  };
  searchButton.onmouseout = function () {
    this.style.background = 'rgba(16, 185, 129, 0.15)';
  };
  searchButton.onclick = applyProductSearch;

  searchContainer.appendChild(searchInputWrapper);
  searchContainer.appendChild(searchButton);

  // Adicionar Enter para buscar
  setTimeout(() => {
    const input = document.getElementById('productSearchInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          applyProductSearch();
        }
      });
    }
  }, 100);

  const toggleFiltersBtn = document.createElement('button');
  toggleFiltersBtn.innerHTML = '<i id="toggleFiltersIcon" class="fas fa-chevron-down"></i><span style="margin-left: 8px;">Filtros</span>';
  toggleFiltersBtn.style.cssText = `
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
    border-radius: 10px;
    padding: 12px 18px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    white-space: nowrap;
  `;
  toggleFiltersBtn.onmouseover = function () {
    this.style.background = 'rgba(59, 130, 246, 0.2)';
  };
  toggleFiltersBtn.onmouseout = function () {
    this.style.background = 'rgba(59, 130, 246, 0.1)';
  };
  toggleFiltersBtn.onclick = toggleFiltersVisibility;

  const viewButtonsContainer = document.createElement('div');
  viewButtonsContainer.style.cssText = `
    display: flex;
    gap: 8px;
    background: #0d0d0d;
    padding: 4px;
    border-radius: 10px;
    border: 1px solid #333;
  `;

  const cardsBtn = document.createElement('button');
  cardsBtn.id = 'viewCardsBtn';
  cardsBtn.innerHTML = '<i class="fas fa-th-large"></i><span style="margin-left: 6px;">Cards</span>';
  cardsBtn.style.cssText = `
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid #10b981;
    color: #10b981;
    border-radius: 8px;
    padding: 10px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  `;
  cardsBtn.onclick = () => toggleProductView('cards');

  const listBtn = document.createElement('button');
  listBtn.id = 'viewListBtn';
  listBtn.innerHTML = '<i class="fas fa-list"></i><span style="margin-left: 6px;">Lista</span>';
  listBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333;
    color: #999;
    border-radius: 8px;
    padding: 10px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  `;
  listBtn.onclick = () => toggleProductView('list');

  viewButtonsContainer.appendChild(cardsBtn);
  viewButtonsContainer.appendChild(listBtn);

  topRow.appendChild(searchContainer);
  topRow.appendChild(toggleFiltersBtn);
  topRow.appendChild(viewButtonsContainer);

  const filtersRow = document.createElement('div');
  filtersRow.id = 'filtersRow';
  filtersRow.style.cssText = `
    display: none;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    align-items: end;
    padding-top: 8px;
    border-top: 1px solid #2a2a2a;
  `;

  const priceMinContainer = document.createElement('div');
  priceMinContainer.innerHTML = `
    <label style="color: #999; font-size: 12px; display: block; margin-bottom: 6px; font-weight: 600;">
      <i class="fas fa-dollar-sign" style="margin-right: 4px;"></i>Preço Mínimo
    </label>
    <input 
      type="number" 
      id="filterPriceMin" 
      placeholder="0.00"
      step="0.01"
      style="
        width: 100%;
        padding: 10px 12px;
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        box-sizing: border-box;
      "
    />
  `;

  const priceMaxContainer = document.createElement('div');
  priceMaxContainer.innerHTML = `
    <label style="color: #999; font-size: 12px; display: block; margin-bottom: 6px; font-weight: 600;">
      <i class="fas fa-dollar-sign" style="margin-right: 4px;"></i>Preço Máximo
    </label>
    <input 
      type="number" 
      id="filterPriceMax" 
      placeholder="999.99"
      step="0.01"
      style="
        width: 100%;
        padding: 10px 12px;
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        box-sizing: border-box;
      "
    />
  `;

  const qtyMinContainer = document.createElement('div');
  qtyMinContainer.innerHTML = `
    <label style="color: #999; font-size: 12px; display: block; margin-bottom: 6px; font-weight: 600;">
      <i class="fas fa-boxes" style="margin-right: 4px;"></i>Qtd Mínima
    </label>
    <input 
      type="number" 
      id="filterQtyMin" 
      placeholder="0"
      style="
        width: 100%;
        padding: 10px 12px;
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        box-sizing: border-box;
      "
    />
  `;

  const qtyMaxContainer = document.createElement('div');
  qtyMaxContainer.innerHTML = `
    <label style="color: #999; font-size: 12px; display: block; margin-bottom: 6px; font-weight: 600;">
      <i class="fas fa-boxes" style="margin-right: 4px;"></i>Qtd Máxima
    </label>
    <input 
      type="number" 
      id="filterQtyMax" 
      placeholder="999"
      style="
        width: 100%;
        padding: 10px 12px;
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        box-sizing: border-box;
      "
    />
  `;

  const statusContainer = document.createElement('div');
  statusContainer.innerHTML = `
    <label style="color: #999; font-size: 12px; display: block; margin-bottom: 6px; font-weight: 600;">
      <i class="fas fa-filter" style="margin-right: 4px;"></i>Status
    </label>
    <select 
      id="filterStatus"
      style="
        width: 100%;
        padding: 10px 12px;
        background: #0d0d0d;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        box-sizing: border-box;
      "
    >
      <option value="all">Todos</option>
      <option value="in-stock">Em Estoque</option>
      <option value="low-stock">Estoque Baixo</option>
      <option value="out-of-stock">Sem Estoque</option>
    </select>
  `;

  const filterActionsContainer = document.createElement('div');
  filterActionsContainer.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: end;
  `;

  const applyFiltersBtn = document.createElement('button');
  applyFiltersBtn.innerHTML = '<i class="fas fa-check"></i>';
  applyFiltersBtn.title = 'Aplicar filtros';
  applyFiltersBtn.style.cssText = `
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
    border-radius: 8px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  `;
  applyFiltersBtn.onmouseover = function () {
    this.style.background = 'rgba(16, 185, 129, 0.25)';
  };
  applyFiltersBtn.onmouseout = function () {
    this.style.background = 'rgba(16, 185, 129, 0.15)';
  };
  applyFiltersBtn.onclick = applyProductFilters;

  const clearFiltersBtn = document.createElement('button');
  clearFiltersBtn.innerHTML = '<i class="fas fa-times"></i>';
  clearFiltersBtn.title = 'Limpar filtros';
  clearFiltersBtn.style.cssText = `
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    border-radius: 8px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  `;
  clearFiltersBtn.onmouseover = function () {
    this.style.background = 'rgba(239, 68, 68, 0.2)';
  };
  clearFiltersBtn.onmouseout = function () {
    this.style.background = 'rgba(239, 68, 68, 0.1)';
  };
  clearFiltersBtn.onclick = clearProductFilters;

  filterActionsContainer.appendChild(applyFiltersBtn);
  filterActionsContainer.appendChild(clearFiltersBtn);

  filtersRow.appendChild(priceMinContainer);
  filtersRow.appendChild(priceMaxContainer);
  filtersRow.appendChild(qtyMinContainer);
  filtersRow.appendChild(qtyMaxContainer);
  filtersRow.appendChild(statusContainer);
  filtersRow.appendChild(filterActionsContainer);

  toolbar.appendChild(topRow);
  toolbar.appendChild(filtersRow);

  setTimeout(() => {
    updateViewButtons();
  }, 0);

  return toolbar;
}

// ============================================
// FUNÇÃO PARA ALTERNAR VISUALIZAÇÃO
// ============================================

function toggleProductView(mode) {
  productViewMode = mode;
  updateViewButtons();
  renderProducts();
}

// ============================================
// FUNÇÃO PARA ATUALIZAR VISUAL DOS BOTÕES
// ============================================

function updateViewButtons() {
  const cardsBtn = document.getElementById('viewCardsBtn');
  const listBtn = document.getElementById('viewListBtn');

  if (!cardsBtn || !listBtn) return;

  if (productViewMode === 'cards') {
    cardsBtn.style.background = 'rgba(16, 185, 129, 0.2)';
    cardsBtn.style.borderColor = '#10b981';
    cardsBtn.style.color = '#10b981';

    listBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    listBtn.style.borderColor = '#333';
    listBtn.style.color = '#999';
  } else {
    listBtn.style.background = 'rgba(16, 185, 129, 0.2)';
    listBtn.style.borderColor = '#10b981';
    listBtn.style.color = '#10b981';

    cardsBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    cardsBtn.style.borderColor = '#333';
    cardsBtn.style.color = '#999';
  }
}


// ============================================
// RENDERIZAR COMO CARDS
// ============================================
// ============================================
// RENDERIZAR PRODUTOS COMO CARDS
// ============================================

function renderProductsAsCards(container, productsArray) {
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = `
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    width: 100%;
  `;

  const updateGridLayout = () => {
    if (window.innerWidth >= 1200) {
      gridContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
    } else if (window.innerWidth >= 768) {
      gridContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else {
      gridContainer.style.gridTemplateColumns = '1fr';
    }
  };

  updateGridLayout();
  window.addEventListener('resize', updateGridLayout);

  productsArray.forEach(prod => {
    // ✅ Usar quantidade sempre do array atualizado
    const quantity = prod.quantity !== undefined ? prod.quantity : 0;

    let status = '';
    let statusColor = '';
    let statusBg = '';
    let borderColor = '';
    let statusIcon = '';

    if (quantity === 0) {
      status = 'SEM ESTOQUE';
      statusColor = '#ef4444';
      statusBg = 'rgba(239, 68, 68, 0.15)';
      borderColor = 'rgba(239, 68, 68, 0.4)';
      statusIcon = 'fa-times-circle';
    } else if (quantity <= 5) {
      status = 'ESTOQUE BAIXO';
      statusColor = '#f59e0b';
      statusBg = 'rgba(245, 158, 11, 0.15)';
      borderColor = 'rgba(245, 158, 11, 0.4)';
      statusIcon = 'fa-exclamation-triangle';
    } else if (quantity <= 10) {
      status = 'ATENÇÃO';
      statusColor = '#eab308';
      statusBg = 'rgba(234, 179, 8, 0.15)';
      borderColor = 'rgba(234, 179, 8, 0.4)';
      statusIcon = 'fa-exclamation-circle';
    } else {
      status = 'EM ESTOQUE';
      statusColor = '#10b981';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      borderColor = 'rgba(47, 47, 47, 0.6)';
      statusIcon = 'fa-check-circle';
    }

    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(145deg, #1f1f1f 0%, #1a1a1a 100%);
      border: 2px solid ${borderColor};
      border-radius: 16px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 280px;
    `;

    card.onmouseenter = function () {
      this.style.transform = 'translateY(-4px)';
      this.style.boxShadow = `0 12px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px ${statusColor}40`;
      this.style.borderColor = statusColor;
    };

    card.onmouseleave = function () {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
      this.style.borderColor = borderColor;
    };

    const statusBadge = document.createElement('div');
    statusBadge.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: ${statusBg};
      border: 1px solid ${statusColor};
      color: ${statusColor};
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 2;
      text-transform: uppercase;
    `;
    statusBadge.innerHTML = `<i class="fas ${statusIcon}"></i> ${status}`;

    const cardHeader = document.createElement('div');
    cardHeader.style.cssText = `
      padding-right: 120px;
      flex-shrink: 0;
    `;
    cardHeader.innerHTML = `
      <h3 style="
        color: #f1f1f1;
        font-weight: 700;
        font-size: 17px;
        margin: 0 0 8px 0;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      ">
        ${escapeHtml(prod.name)}
      </h3>
      <p style="
        color: #8b8b8b;
        font-size: 13px;
        margin: 0;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      ">
        ${escapeHtml(prod.description || 'Sem descrição')}
      </p>
    `;

    const infoSection = document.createElement('div');
    infoSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 0;
      border-top: 1px solid #2a2a2a;
      border-bottom: 1px solid #2a2a2a;
      flex: 1;
    `;

    const priceDiv = document.createElement('div');
    priceDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    priceDiv.innerHTML = `
      <i class="fas fa-dollar-sign" style="color: #10b981; font-size: 14px;"></i>
      <span style="color: #4ade80; font-weight: 700; font-size: 20px;">
        R$ ${prod.price.toFixed(2)}
      </span>
    `;

    const stockDiv = document.createElement('div');
    stockDiv.style.cssText = `
      background: #0d0d0d;
      border: 1px solid ${borderColor};
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    stockDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-boxes" style="color: ${statusColor}; font-size: 14px;"></i>
        <span style="color: #999; font-size: 13px; font-weight: 500;">Estoque</span>
      </div>
      <span style="
        color: ${statusColor};
        font-weight: 700;
        font-size: 18px;
        text-shadow: 0 0 10px ${statusColor}40;
      ">
        ${quantity}
      </span>
    `;

    infoSection.appendChild(priceDiv);
    infoSection.appendChild(stockDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: auto;
    `;

    const addStockBtn = document.createElement('button');
    addStockBtn.innerHTML = '<i class="fas fa-plus"></i><span style="margin-left: 6px;">Adicionar</span>';
    addStockBtn.style.cssText = `
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    addStockBtn.onmouseover = function () {
      this.style.background = 'rgba(16, 185, 129, 0.2)';
      this.style.transform = 'scale(1.02)';
    };
    addStockBtn.onmouseout = function () {
      this.style.background = 'rgba(16, 185, 129, 0.1)';
      this.style.transform = 'scale(1)';
    };
    addStockBtn.onclick = function () {
      openStockModal(prod.id, 'add');
    };

    const removeStockBtn = document.createElement('button');
    removeStockBtn.innerHTML = '<i class="fas fa-minus"></i><span style="margin-left: 6px;">Remover</span>';
    removeStockBtn.style.cssText = `
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #f59e0b;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      ${quantity === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    if (quantity > 0) {
      removeStockBtn.onmouseover = function () {
        this.style.background = 'rgba(245, 158, 11, 0.2)';
        this.style.transform = 'scale(1.02)';
      };
      removeStockBtn.onmouseout = function () {
        this.style.background = 'rgba(245, 158, 11, 0.1)';
        this.style.transform = 'scale(1)';
      };
    }
    removeStockBtn.onclick = function () {
      if (quantity === 0) {
        showToast('Não há estoque para remover!', 'error');
        return;
      }
      openStockModal(prod.id, 'remove');
    };

    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<i class="fas fa-edit"></i><span style="margin-left: 6px;">Editar</span>';
    editBtn.style.cssText = `
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #3b82f6;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    editBtn.onmouseover = function () {
      this.style.background = 'rgba(59, 130, 246, 0.2)';
      this.style.transform = 'scale(1.02)';
    };
    editBtn.onmouseout = function () {
      this.style.background = 'rgba(59, 130, 246, 0.1)';
      this.style.transform = 'scale(1)';
    };
    editBtn.onclick = function () {
      openEditModal(prod.id);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i><span style="margin-left: 6px;">Excluir</span>';
    deleteBtn.style.cssText = `
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    deleteBtn.onmouseover = function () {
      this.style.background = 'rgba(239, 68, 68, 0.2)';
      this.style.transform = 'scale(1.02)';
    };
    deleteBtn.onmouseout = function () {
      this.style.background = 'rgba(239, 68, 68, 0.1)';
      this.style.transform = 'scale(1)';
    };
    deleteBtn.onclick = function () {
      deleteProduct(prod.id);
    };

    actionsDiv.appendChild(addStockBtn);
    actionsDiv.appendChild(removeStockBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    card.appendChild(statusBadge);
    card.appendChild(cardHeader);
    card.appendChild(infoSection);
    card.appendChild(actionsDiv);

    gridContainer.appendChild(card);
  });

  container.appendChild(gridContainer);
}

// ============================================
// RENDERIZAR COMO LISTA
// ============================================

function renderProductsAsList(container, productsArray) {
  const listContainer = document.createElement('div');
  listContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  `;

  productsArray.forEach(prod => {
    const quantity = prod.quantity !== undefined ? prod.quantity : 0;

    let statusColor = '';
    let statusBg = '';
    let statusIcon = '';
    let statusText = '';

    if (quantity === 0) {
      statusText = 'SEM ESTOQUE';
      statusColor = '#ef4444';
      statusBg = 'rgba(239, 68, 68, 0.15)';
      statusIcon = 'fa-times-circle';
    } else if (quantity <= 5) {
      statusText = 'ESTOQUE BAIXO';
      statusColor = '#f59e0b';
      statusBg = 'rgba(245, 158, 11, 0.15)';
      statusIcon = 'fa-exclamation-triangle';
    } else if (quantity <= 10) {
      statusText = 'ATENÇÃO';
      statusColor = '#eab308';
      statusBg = 'rgba(234, 179, 8, 0.15)';
      statusIcon = 'fa-exclamation-circle';
    } else {
      statusText = 'EM ESTOQUE';
      statusColor = '#10b981';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      statusIcon = 'fa-check-circle';
    }

    const row = document.createElement('div');
    row.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;
      flex-wrap: wrap;
    `;

    row.onmouseenter = function () {
      this.style.background = '#1f1f1f';
      this.style.borderColor = statusColor;
      this.style.transform = 'translateX(4px)';
    };

    row.onmouseleave = function () {
      this.style.background = '#1a1a1a';
      this.style.borderColor = '#2a2a2a';
      this.style.transform = 'translateX(0)';
    };

    const infoCol = document.createElement('div');
    infoCol.style.cssText = `
      flex: 1;
      min-width: 200px;
    `;
    infoCol.innerHTML = `
      <div style="color: #f1f1f1; font-weight: 700; font-size: 15px; margin-bottom: 6px;">
        ${escapeHtml(prod.name)}
      </div>
      <div style="color: #8b8b8b; font-size: 12px;">
        ${escapeHtml(prod.description || 'Sem descrição')}
      </div>
    `;

    const priceCol = document.createElement('div');
    priceCol.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    priceCol.innerHTML = `
      <i class="fas fa-dollar-sign" style="color: #10b981; font-size: 12px;"></i>
      <span style="color: #4ade80; font-weight: 700; font-size: 16px;">
        R$ ${prod.price.toFixed(2)}
      </span>
    `;

    const stockCol = document.createElement('div');
    stockCol.style.cssText = `
      background: ${statusBg};
      border: 1px solid ${statusColor};
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 140px;
    `;
    stockCol.innerHTML = `
      <i class="fas ${statusIcon}" style="color: ${statusColor}; font-size: 12px;"></i>
      <span style="color: ${statusColor}; font-size: 13px; font-weight: 700;">
        ${quantity} un
      </span>
    `;

    const actionsCol = document.createElement('div');
    actionsCol.style.cssText = `
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    `;

    const addBtn = document.createElement('button');
    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
    addBtn.title = 'Adicionar estoque';
    addBtn.style.cssText = `
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    `;
    addBtn.onmouseover = function () {
      this.style.background = 'rgba(16, 185, 129, 0.2)';
    };
    addBtn.onmouseout = function () {
      this.style.background = 'rgba(16, 185, 129, 0.1)';
    };
    addBtn.onclick = function () {
      openStockModal(prod.id, 'add');
    };

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<i class="fas fa-minus"></i>';
    removeBtn.title = 'Remover estoque';
    removeBtn.style.cssText = `
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #f59e0b;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      ${quantity === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
    `;
    if (quantity > 0) {
      removeBtn.onmouseover = function () {
        this.style.background = 'rgba(245, 158, 11, 0.2)';
      };
      removeBtn.onmouseout = function () {
        this.style.background = 'rgba(245, 158, 11, 0.1)';
      };
    }
    removeBtn.onclick = function () {
      if (quantity === 0) {
        showToast('Não há estoque para remover!', 'error');
        return;
      }
      openStockModal(prod.id, 'remove');
    };

    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.title = 'Editar produto';
    editBtn.style.cssText = `
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #3b82f6;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    `;
    editBtn.onmouseover = function () {
      this.style.background = 'rgba(59, 130, 246, 0.2)';
    };
    editBtn.onmouseout = function () {
      this.style.background = 'rgba(59, 130, 246, 0.1)';
    };
    editBtn.onclick = function () {
      openEditModal(prod.id);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Excluir produto';
    deleteBtn.style.cssText = `
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    `;
    deleteBtn.onmouseover = function () {
      this.style.background = 'rgba(239, 68, 68, 0.2)';
    };
    deleteBtn.onmouseout = function () {
      this.style.background = 'rgba(239, 68, 68, 0.1)';
    };
    deleteBtn.onclick = function () {
      deleteProduct(prod.id);
    };

    actionsCol.appendChild(addBtn);
    actionsCol.appendChild(removeBtn);
    actionsCol.appendChild(editBtn);
    actionsCol.appendChild(deleteBtn);

    row.appendChild(infoCol);
    row.appendChild(priceCol);
    row.appendChild(stockCol);
    row.appendChild(actionsCol);

    listContainer.appendChild(row);
  });

  container.appendChild(listContainer);
}

// ============================================
// FUNÇÃO PRINCIPAL: RENDERIZAR PRODUTOS
// ============================================

function renderProducts() {
  const list = document.getElementById('productsList');
  if (!list) {
    console.log('Elemento productsList não encontrado!');
    return;
  }

  list.innerHTML = '';

  list.appendChild(createProductToolbar());

  if (!products || products.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = `
      text-align: center;
      padding: 60px 20px;
      color: #666;
    `;
    emptyState.innerHTML = `
      <i class="fas fa-box-open" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3; color: #10b981;"></i>
      <p style="font-size: 16px; font-weight: 600; margin: 0;">Nenhum produto cadastrado</p>
      <p style="font-size: 14px; margin: 10px 0 0 0; opacity: 0.7;">Adicione seu primeiro produto para começar</p>
    `;
    list.appendChild(emptyState);
    return;
  }

  const filteredProducts = filterProductsClient(products);

  if (filteredProducts.length === 0) {
    const noResultsState = document.createElement('div');
    noResultsState.style.cssText = `
      text-align: center;
      padding: 60px 20px;
      color: #666;
    `;
    noResultsState.innerHTML = `
      <i class="fas fa-search" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
      <p style="font-size: 16px; font-weight: 600; margin: 0;">Nenhum produto encontrado</p>
      <p style="font-size: 14px; margin: 10px 0 0 0; opacity: 0.7;">Tente ajustar os filtros de busca</p>
    `;
    list.appendChild(noResultsState);
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  if (productViewMode === 'cards') {
    renderProductsAsCards(list, paginatedProducts);
  } else {
    renderProductsAsList(list, paginatedProducts);
  }

  renderPagination(filteredProducts.length);
}

// ===========================
// MODAL DE CONTROLE DE ESTOQUE
// ===========================
function openStockModal(productId, action) {
  // ✅ Buscar produto atualizado do Firebase em tempo real
  database.ref('products')
    .orderByChild('id')
    .equalTo(Number(productId))
    .once('value', (snapshot) => {
      if (!snapshot.exists()) {
        showToast('Produto não encontrado!', 'error');
        return;
      }

      let product = null;
      let firebaseKey = null;

      snapshot.forEach((childSnapshot) => {
        product = childSnapshot.val();
        firebaseKey = childSnapshot.key;
      });

      if (!product) return;

      const isAdd = action === 'add';
      const title = isAdd ? 'Adicionar ao Estoque' : 'Remover do Estoque';
      const icon = isAdd ? 'fa-plus' : 'fa-minus';
      const color = isAdd ? '#10b981' : '#f59e0b';
      const buttonText = isAdd ? 'Adicionar' : 'Remover';

      const overlay = document.createElement('div');
      overlay.id = 'stockModalOverlay';
      overlay.style.cssText = `
        position:fixed;
        top:0;
        left:0;
        width:100%;
        height:100%;
        background:rgba(0,0,0,0.8);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:99999;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#1a1a1a;
        border:2px solid ${color};
        border-radius:16px;
        padding:30px;
        width:90%;
        max-width:400px;
        box-shadow:0 10px 40px rgba(0,0,0,0.8);
      `;

      modal.innerHTML = `
        <h2 style="color:#f1f1f1; font-size:22px; margin:0 0 20px 0;">
          <i class="fas ${icon}" style="color:${color};"></i> ${title}
        </h2>

        <div style="margin-bottom:16px;">
          <label style="display:block; color:#f1f1f1; margin-bottom:8px; font-weight:600;">Produto</label>
          <div style="
            background:#0f0f0f;
            border:1px solid #333;
            border-radius:8px;
            padding:12px;
            color:#aaa;
            font-size:15px;
          ">
            ${escapeHtml(product.name)}
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block; color:#f1f1f1; margin-bottom:8px; font-weight:600;">Estoque Atual</label>
          <div style="
            background:#0f0f0f;
            border:1px solid #333;
            border-radius:8px;
            padding:12px;
            color:#10b981;
            font-size:18px;
            font-weight:700;
          ">
            ${product.quantity || 0} unidades
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <label style="display:block; color:#f1f1f1; margin-bottom:8px; font-weight:600;">Quantidade</label>
          <input type="number" id="stockQuantity" value="1" min="1" ${!isAdd ? `max="${product.quantity || 0}"` : ''} style="
            width:100%;
            background:#0f0f0f;
            border:1px solid #333;
            border-radius:8px;
            padding:12px;
            color:#f1f1f1;
            font-size:15px;
            box-sizing:border-box;
          ">
        </div>

        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button id="cancelStockBtn" style="
            background:#1f1f1f;
            border:1px solid #333;
            color:#ef4444;
            border-radius:8px;
            padding:12px 24px;
            cursor:pointer;
            font-size:15px;
            font-weight:600;
          ">
            Cancelar
          </button>
          <button id="confirmStockBtn" style="
            background:${color};
            border:none;
            color:#fff;
            border-radius:8px;
            padding:12px 24px;
            cursor:pointer;
            font-size:15px;
            font-weight:600;
          ">
            ${buttonText}
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // ✅ Função helper para fechar modal com segurança
      const closeModal = () => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      };

      document.getElementById('cancelStockBtn').onclick = closeModal;

      document.getElementById('confirmStockBtn').onclick = () => {
        const qty = parseInt(document.getElementById('stockQuantity').value);

        if (!qty || qty <= 0) {
          showToast('Quantidade inválida!', 'error');
          return;
        }

        if (!isAdd && qty > (product.quantity || 0)) {
          showToast('Quantidade maior que o estoque disponível!', 'error');
          return;
        }

        updateStock(firebaseKey, qty, isAdd, product);
        closeModal();
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      };
    });
}



// ===========================
// ATUALIZAR ESTOQUE NO FIREBASE
// ===========================
async function updateStock(firebaseKey, quantity, isAdd, product) {
  try {
    if (!firebaseKey) {
      showToast('Chave do produto não encontrada!', 'error');
      return;
    }

    const currentStock = product.quantity || 0;
    const newStock = isAdd ? currentStock + quantity : currentStock - quantity;

    if (newStock < 0) {
      showToast('Estoque não pode ser negativo!', 'error');
      return;
    }

    // ✅ Atualizar no Firebase usando a chave correta
    await database.ref(`products/${firebaseKey}`).update({
      quantity: newStock
    });

    const action = isAdd ? 'adicionado ao' : 'removido do';
    showToast(`${quantity} unidade(s) ${action} estoque!`, 'success');

  } catch (err) {
    console.error('Erro ao atualizar estoque:', err);
    showToast('Erro ao atualizar estoque', 'error');
  }
}

// ===========================
// PAGINAÇÃO
// ===========================
function renderPagination(totalFilteredProducts) {
  const totalPages = Math.ceil(totalFilteredProducts / itemsPerPage);
  const paginationContainer = document.getElementById('pagination');

  if (!paginationContainer || totalPages <= 1) {
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  paginationContainer.innerHTML = '';
  paginationContainer.style.cssText = `
    display:flex;
    justify-content:center;
    align-items:center;
    gap:8px;
    margin-top:20px;
    padding:16px 0;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.style.cssText = `
    background:#1f1f1f;
    border:1px solid #333;
    color:${currentPage === 1 ? '#555' : '#f1f1f1'};
    border-radius:8px;
    padding:8px 12px;
    cursor:${currentPage === 1 ? 'not-allowed' : 'pointer'};
  `;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts();
    }
  };
  paginationContainer.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.style.cssText = `
      background:${i === currentPage ? '#3b82f6' : '#1f1f1f'};
      border:1px solid ${i === currentPage ? '#3b82f6' : '#333'};
      color:#f1f1f1;
      border-radius:8px;
      padding:8px 12px;
      cursor:pointer;
      min-width:36px;
      font-weight:${i === currentPage ? '600' : '400'};
    `;
    pageBtn.onclick = () => {
      currentPage = i;
      renderProducts();
    };
    paginationContainer.appendChild(pageBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.style.cssText = `
    background:#1f1f1f;
    border:1px solid #333;
    color:${currentPage === totalPages ? '#555' : '#f1f1f1'};
    border-radius:8px;
    padding:8px 12px;
    cursor:${currentPage === totalPages ? 'not-allowed' : 'pointer'};
  `;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts();
    }
  };
  paginationContainer.appendChild(nextBtn);
}

// ===========================
// EDITAR PRODUTO
// ===========================
function openEditModal(productId) {
  // ✅ Buscar produto atualizado do Firebase
  database.ref('products')
    .orderByChild('id')
    .equalTo(Number(productId))
    .once('value', (snapshot) => {
      if (!snapshot.exists()) {
        showToast('Produto não encontrado!', 'error');
        return;
      }

      let product = null;
      let firebaseKey = null;

      snapshot.forEach((childSnapshot) => {
        product = childSnapshot.val();
        firebaseKey = childSnapshot.key;
      });

      if (!product) return;

      editingProductId = firebaseKey;

      const overlay = document.createElement('div');
      overlay.id = 'editModalOverlay';
      overlay.style.cssText = `
        position:fixed;
        top:0;
        left:0;
        width:100%;
        height:100%;
        background:rgba(0,0,0,0.8);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:99999;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#1a1a1a;
        border:2px solid #3b82f6;
        border-radius:16px;
        padding:30px;
        width:90%;
        max-width:500px;
        box-shadow:0 10px 40px rgba(0,0,0,0.8);
      `;

      modal.innerHTML = `
        <h2 style="color:#f1f1f1; font-size:24px; margin:0 0 20px 0;">
          <i class="fas fa-edit" style="color:#3b82f6;"></i> Editar Produto
        </h2>
        
        <div style="margin-bottom:16px;">
          <label style="display:block; color:#f1f1f1; margin-bottom:8px; font-weight:600;">Nome</label>
          <input type="text" id="editName" value="${escapeHtml(product.name)}" style="
            width:100%;
            background:#0f0f0f;
            border:1px solid #333;
            border-radius:8px;
            padding:12px;
            color:#f1f1f1;
            font-size:15px;
            box-sizing:border-box;
          ">
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block; color:#f1f1f1; margin-bottom:8px; font-weight:600;">Descrição</label>
          <textarea id="editDesc" rows="3" style="
            width:100%;
            background:#0f0f0f;
            border:1px solid #333;
            border-radius:8px;
            padding:12px;
            color:#f1f1f1;
            font-size:15px;
            box-sizing:border-box;
            font-family:inherit;
            resize:vertical;
          ">${escapeHtml(product.description || '')}</textarea>
        </div>

        <div style="margin-bottom:24px;">
          <label style="display:block; color:#f1f1f1; margin-bottom:8px; font-weight:600;">Preço</label>
          <input type="number" id="editPrice" value="${product.price}" step="0.01" min="0" style="
            width:100%;
            background:#0f0f0f;
            border:1px solid #333;
            border-radius:8px;
            padding:12px;
            color:#f1f1f1;
            font-size:15px;
            box-sizing:border-box;
          ">
        </div>

        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button id="cancelBtn" style="
            background:#1f1f1f;
            border:1px solid #333;
            color:#ef4444;
            border-radius:8px;
            padding:12px 24px;
            cursor:pointer;
            font-size:15px;
            font-weight:600;
          ">
            Cancelar
          </button>
          <button id="saveBtn" style="
            background:#3b82f6;
            border:none;
            color:#fff;
            border-radius:8px;
            padding:12px 24px;
            cursor:pointer;
            font-size:15px;
            font-weight:600;
          ">
            Salvar
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // ✅ Função helper para fechar modal com segurança
      const closeModal = () => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      };

      document.getElementById('cancelBtn').onclick = closeModal;

      document.getElementById('saveBtn').onclick = async () => {
        const name = document.getElementById('editName').value.trim();
        const description = document.getElementById('editDesc').value.trim();
        const price = parseFloat(document.getElementById('editPrice').value);

        if (!name || !price || price <= 0) {
          showToast('Preencha todos os campos corretamente!', 'error');
          return;
        }

        try {
          await database.ref(`products/${firebaseKey}`).update({
            name,
            description,
            price
          });

          showToast('Produto atualizado com sucesso!', 'success');
          closeModal();
        } catch (err) {
          console.error('Erro ao atualizar produto:', err);
          showToast('Erro ao atualizar produto', 'error');
        }
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      };
    });
}



// ===========================
// DELETAR PRODUTO
// ===========================
function deleteProduct(productId) {
  if (!productId) return;

  // ✅ Buscar produto do Firebase primeiro
  database.ref('products')
    .orderByChild('id')
    .equalTo(Number(productId))
    .once('value', (snapshot) => {
      if (!snapshot.exists()) {
        showToast('Produto não encontrado!', 'error');
        return;
      }

      let firebaseKey = null;

      snapshot.forEach((childSnapshot) => {
        firebaseKey = childSnapshot.key;
      });

      if (!firebaseKey) return;

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;
        top:0;
        left:0;
        width:100%;
        height:100%;
        background:rgba(0,0,0,0.8);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:99999;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background:#1a1a1a;
        border:2px solid #ef4444;
        border-radius:16px;
        padding:30px;
        width:90%;
        max-width:400px;
        box-shadow:0 10px 40px rgba(0,0,0,0.8);
      `;

      modal.innerHTML = `
        <h2 style="color:#ef4444; font-size:22px; margin:0 0 16px 0;">
          <i class="fas fa-exclamation-triangle"></i> Confirmar Exclusão
        </h2>
        <p style="color:#f1f1f1; margin:0 0 24px 0; line-height:1.6;">
          Deseja realmente excluir este produto? Esta ação não pode ser desfeita.
        </p>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <button id="cancelDeleteBtn" style="
            background:#1f1f1f;
            border:1px solid #333;
            color:#f1f1f1;
            border-radius:8px;
            padding:12px 24px;
            cursor:pointer;
            font-size:15px;
            font-weight:600;
          ">
            Cancelar
          </button>
          <button id="confirmDeleteBtn" style="
            background:#ef4444;
            border:none;
            color:#fff;
            border-radius:8px;
            padding:12px 24px;
            cursor:pointer;
            font-size:15px;
            font-weight:600;
          ">
            Excluir
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // ✅ Função helper para fechar modal com segurança
      const closeModal = () => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      };

      document.getElementById('cancelDeleteBtn').onclick = closeModal;

      document.getElementById('confirmDeleteBtn').onclick = async () => {
        try {
          await database.ref(`products/${firebaseKey}`).remove();

          products = products.filter(p => p.id !== productId);

          renderProducts();
          populateOSProductSelect();

          showToast('Produto removido com sucesso!', 'success');
          closeModal();
        } catch (err) {
          console.error('Erro ao excluir produto:', err);
          showToast('Erro ao excluir produto', 'error');
        }
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      };
    });
}




// ===========================
// POPULAR SELECT DA OS
// ===========================
function populateOSProductSelect() {
  const select = document.getElementById('osProductSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um produto</option>';

  const availableProducts = products.filter(p => (p.quantity || 0) > 0);

  availableProducts.forEach(prod => {
    const opt = document.createElement('option');
    opt.value = prod.id;
    opt.textContent = `${prod.name} - R$ ${prod.price.toFixed(2)} (Estoque: ${prod.quantity})`;
    select.appendChild(opt);
  });
}

// ===========================
// ADICIONAR PRODUTO À OS
// ===========================
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
    ">
      <div style="
        background: #1f1f1f;
        border: 2px solid #10b981;
        border-radius: 16px;
        width: 100%;
        max-width: 520px;
        max-height: 85vh;
        color: #f5f5f5;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 22px;
          border-bottom: 2px solid #10b981;
          background: #2a2a2a;
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
          ">
            <i class="fas fa-search"></i>
            Selecionar Produto
          </h3>
          <button onclick="fecharModalSelecionarProdutoOS()" style="
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            font-size: 1.2rem;
            cursor: pointer;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
          ">
            <i class="fas fa-times"></i>
          </button>
        </div>

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
              box-sizing: border-box;
              font-weight: 500;
            " oninput="filtrarProdutosOSModal()">
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

        <div id="productOSModalList" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px 22px;
          background: #1a1a1a;
        ">
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  renderizarListaProdutosOSModal();
}

function renderizarListaProdutosOSModal(filtro = '') {
  const container = document.getElementById('productOSModalList');
  if (!container) return;

  const filtroLower = filtro.toLowerCase();

  const produtosFiltrados = products.filter(p => {
    const hasStock = (p.quantity || 0) > 0;
    const matchesFilter = p.name.toLowerCase().includes(filtroLower) ||
      (p.description && p.description.toLowerCase().includes(filtroLower));

    return hasStock && matchesFilter;
  });

  if (produtosFiltrados.length === 0) {
    container.innerHTML = `
      <div style="
        padding: 50px 20px;
        text-align: center;
        color: #666;
      ">
        <i class="fas fa-box-open" style="font-size: 3.5rem; margin-bottom: 14px; color: #10b981; opacity: 0.3;"></i>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">Nenhum produto disponível</p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #555;">
          ${filtro ? 'Nenhum produto com estoque corresponde à busca' : 'Todos os produtos estão sem estoque'}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = produtosFiltrados.map(prod => {
    const stockQuantity = prod.quantity || 0;

    return `
    <div style="
      background: linear-gradient(135deg, #0d0d0d 0%, #121212 100%);
      border: 2px solid #2a2a2a;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 10px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    " onmouseover="this.style.background='linear-gradient(135deg, #1a1a1a 0%, #1f1f1f 100%)'; this.style.borderColor='#10b981'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 18px rgba(16, 185, 129, 0.2)'" onmouseout="this.style.background='linear-gradient(135deg, #0d0d0d 0%, #121212 100%)'; this.style.borderColor='#2a2a2a'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
      
      <div style="
        position: absolute;
        top: 0;
        right: 0;
        width: 50px;
        height: 50px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
        border-radius: 0 0 0 100%;
      "></div>

      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      ">
        <div style="
          width: 7px;
          height: 7px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
          flex-shrink: 0;
        "></div>
        <div style="
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.2px;
        ">
          ${escapeHtml(prod.name)}
        </div>
      </div>

      <div style="
        color: #999;
        font-size: 12px;
        margin-bottom: 10px;
        line-height: 1.4;
        padding-left: 15px;
      ">
        ${escapeHtml(prod.description || 'Sem descrição disponível')}
      </div>

      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-left: 15px;
        gap: 10px;
        flex-wrap: wrap;
      ">
        <div style="display: flex; flex-direction: column; gap: 5px;">
          <div style="
            color: #4ade80;
            font-weight: 800;
            font-size: 17px;
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
          ">
            R$ ${prod.price.toFixed(2)}
          </div>
          <div style="
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 6px;
            padding: 3px 7px;
            color: #10b981;
            font-size: 10px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          ">
            <i class="fas fa-boxes" style="font-size: 9px;"></i>
            Estoque: ${stockQuantity}
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 5px; background: #0d0d0d; border: 2px solid #333; border-radius: 7px; padding: 3px;">
            <button onclick="event.stopPropagation(); alterarQuantidadeModal(${prod.id}, -1)" style="
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.3);
              color: #ef4444;
              width: 26px;
              height: 26px;
              border-radius: 5px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              transition: all 0.2s ease;
            " onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
              <i class="fas fa-minus" style="font-size: 10px;"></i>
            </button>
            
            <input type="number" id="qty_${prod.id}" value="1" min="1" max="${stockQuantity}" style="
              width: 45px;
              background: transparent;
              border: none;
              color: #fff;
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              outline: none;
              cursor: text;
            " onclick="event.stopPropagation(); this.select();" onchange="validarQuantidadeModalOS(${prod.id}, ${stockQuantity})" onblur="validarQuantidadeModalOS(${prod.id}, ${stockQuantity})">
            
            <button onclick="event.stopPropagation(); alterarQuantidadeModal(${prod.id}, 1, ${stockQuantity})" style="
              background: rgba(16, 185, 129, 0.15);
              border: 1px solid rgba(16, 185, 129, 0.3);
              color: #10b981;
              width: 26px;
              height: 26px;
              border-radius: 5px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              transition: all 0.2s ease;
            " onmouseover="this.style.background='rgba(16, 185, 129, 0.25)'" onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'">
              <i class="fas fa-plus" style="font-size: 10px;"></i>
            </button>
          </div>
          
          <button onclick="event.stopPropagation(); selecionarProdutoOSModal(${prod.id})" style="
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            padding: 7px 14px;
            border-radius: 18px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid rgba(16, 185, 129, 0.3);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 5px;
          " onmouseover="this.style.background='rgba(16, 185, 129, 0.25)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'; this.style.transform='scale(1)'">
            <i class="fas fa-plus"></i>
            Adicionar
          </button>
        </div>
      </div>

    </div>
  `;
  }).join('');
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

function alterarQuantidadeModal(productId, delta, maxStock) {
  const input = document.getElementById(`qty_${productId}`);
  if (!input) return;

  let currentValue = parseInt(input.value) || 1;
  let newValue = currentValue + delta;

  if (newValue < 1) newValue = 1;
  if (maxStock && newValue > maxStock) newValue = maxStock;

  input.value = newValue;
}

function validarQuantidadeModalOS(productId, maxStock) {
  const input = document.getElementById(`qty_${productId}`);
  if (!input) return;

  let value = parseInt(input.value) || 1;

  if (value < 1) value = 1;
  if (value > maxStock) value = maxStock;

  input.value = value;
}

function selecionarProdutoOSModal(productId) {
  const product = products.find(p => p.id == productId);
  if (!product) return;

  const qtyInput = document.getElementById(`qty_${productId}`);
  const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

  if (typeof window.adicionarProdutoNaOS === 'function') {
    window.adicionarProdutoNaOS(product, quantity);
    fecharModalSelecionarProdutoOS();
  } else {
    showToast('Erro: função de adicionar produto não encontrada', 'error');
  }
}


// ===========================
// MODAL DE CRIAÇÃO - VALIDAÇÃO E SELEÇÃO
// ===========================
function validarQuantidadeModalOS(prodId, maxStock) {
  const input = document.getElementById(`qty_${prodId}`);
  if (!input) return;

  let valor = parseInt(input.value);

  if (isNaN(valor) || valor < 1) {
    input.value = 1;
  } else if (valor > maxStock) {
    input.value = maxStock;
    showToast(`Quantidade máxima disponível: ${maxStock}`, 'info');
  } else {
    input.value = valor;
  }
}

function alterarQuantidadeModal(productId, delta, maxStock) {
  const input = document.getElementById(`qty_${productId}`);
  if (!input) return;

  let currentValue = parseInt(input.value) || 1;
  let newValue = currentValue + delta;

  if (newValue < 1) newValue = 1;

  if (maxStock && newValue > maxStock) {
    showToast('Quantidade maior que o estoque disponível!', 'error');
    newValue = maxStock;
  }

  input.value = newValue;
}

function selecionarProdutoOSModal(productId) {
  const produto = products.find(p => p.id === productId);
  if (!produto) {
    showToast('Produto não encontrado', 'error');
    return;
  }

  const jaAdicionado = osSelectedProducts.some(p => p.id === productId);
  if (jaAdicionado) {
    showToast('Este produto já foi adicionado à OS', 'error');
    return;
  }

  const qtyInput = document.getElementById(`qty_${productId}`);
  const qty = parseInt(qtyInput?.value) || 1;

  if (qty <= 0) {
    showToast('Quantidade inválida', 'error');
    return;
  }

  const stockAvailable = produto.quantity || 0;
  if (qty > stockAvailable) {
    showToast('Quantidade maior que o estoque disponível!', 'error');
    return;
  }

  osSelectedProducts.push({
    id: produto.id,
    name: produto.name,
    qty: qty,
    price: produto.price
  });

  produto.quantity = (produto.quantity || 0) - qty;
  renderizarListaProdutosOSModal();
  renderOSProducts();
  showToast(`${produto.name} (${qty}x) adicionado com sucesso!`, 'success');
}

// ===========================
// MODAL DE EDIÇÃO - VALIDAÇÃO E SELEÇÃO
// ===========================
function validarQuantidadeEditModalOS(prodId, maxStock) {
  const input = document.getElementById(`qty_edit_${prodId}`);
  if (!input) return;

  let valor = parseInt(input.value);

  if (isNaN(valor) || valor < 1) {
    input.value = 1;
  } else if (valor > maxStock) {
    input.value = maxStock;
    showToast(`Quantidade máxima disponível: ${maxStock}`, 'info');
  } else {
    input.value = valor;
  }
}

function alterarQuantidadeEditModal(productId, delta, maxStock) {
  const input = document.getElementById(`qty_edit_${productId}`);
  if (!input) return;

  let currentValue = parseInt(input.value) || 1;
  let newValue = currentValue + delta;

  if (newValue < 1) newValue = 1;

  if (maxStock && newValue > maxStock) {
    showToast('Quantidade maior que o estoque disponível!', 'error');
    newValue = maxStock;
  }

  input.value = newValue;
}







function abrirModalSelecionarProdutoEditOS() {
  document.body.style.overflow = 'hidden';

  const editModal = document.getElementById('editOSModal');
  if (editModal) editModal.style.display = 'none';

  const modalHtml = `
    <div id="selectProductEditOSModal" class="modal-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.98);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 12px;
      backdrop-filter: blur(10px);
      z-index: 2147483647;
      overflow: auto;
    ">
      <div class="modal-content" style="
        background: linear-gradient(145deg, #1f1f1f 0%, #1a1a1a 100%);
        border: 2px solid #10b981;
        border-radius: 12px;
        width: 100%;
        max-width: 450px;
        max-height: 85vh;
        color: #f5f5f5;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(16, 185, 129, 0.2);
        display: flex;
        flex-direction: column;
        position: relative;
        margin: auto;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 18px;
          border-bottom: 2px solid #10b981;
          background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
          border-radius: 10px 10px 0 0;
          flex-shrink: 0;
        ">
          <h3 style="
            margin: 0;
            font-size: 1.15rem;
            color: #10b981;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: 0.3px;
          ">
            <i class="fas fa-search" style="font-size: 1rem;"></i>
            Adicionar Produto
          </h3>
          <button onclick="closeProductModal()" style="
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            font-size: 1.15rem;
            cursor: pointer;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='#ef4444'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)'">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div style="padding: 16px 18px; border-bottom: 1px solid #2a2a2a; flex-shrink: 0; background: #1a1a1a;">
          <div style="position: relative;">
            <input type="text" id="searchProductEditOSInput" placeholder="Buscar produtos com estoque..." style="
              width: 100%;
              padding: 12px 14px 12px 42px;
              background: #0d0d0d;
              border: 2px solid #333;
              border-radius: 10px;
              color: #fff;
              font-size: 0.9rem;
              transition: all 0.3s ease;
              box-sizing: border-box;
              font-weight: 500;
            " onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'" onblur="this.style.borderColor='#333'; this.style.boxShadow='none'" oninput="filtrarProdutosEditOSModal()">
            <i class="fas fa-search" style="
              position: absolute;
              left: 14px;
              top: 50%;
              transform: translateY(-50%);
              color: #10b981;
              font-size: 15px;
            "></i>
          </div>
        </div>

        <div id="productEditOSModalList" style="
          flex: 1;
          overflow-y: auto;
          padding: 14px 18px;
          background: #1a1a1a;
          min-height: 200px;
        ">
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  renderizarListaProdutosEditOSModal();
  openProductModal();
}

function openProductModal() {
  const modal = document.getElementById('productModal') || document.getElementById('selectProductEditOSModal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeProductModal() {
  const productModal = document.getElementById('productModal');
  const selectModal = document.getElementById('selectProductEditOSModal');

  if (productModal) {
    productModal.classList.remove('active');
  }

  if (selectModal) {
    selectModal.classList.remove('active');

    setTimeout(() => {
      selectModal.remove();
      document.body.style.overflow = '';

      const editModal = document.getElementById('editOSModal');
      if (editModal) editModal.style.display = 'flex';
    }, 300);
  }
}

// ===========================
// RENDER PRODUTOS DA OS
// ===========================
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
      background: #2a2a2a;
      border:2px solid #333;
      border-radius:10px;
      padding:14px 16px;
      margin-bottom:10px;
    `;

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
        "
        title="Remover produto"
      >
        <i class="fas fa-trash-alt"></i>
      </button>
    `;

    list.appendChild(item);
  });

  updateOSProductTotals();
}

// ===========================
// REMOVER PRODUTO DA OS
// ===========================
function removeProductFromOS(id) {
  const produtoRemovido = osSelectedProducts.find(p => p.id === id);

  if (produtoRemovido) {
    // Devolver estoque ao remover
    const produto = products.find(p => p.id === id);
    if (produto) {
      produto.quantity = (produto.quantity || 0) + produtoRemovido.qty;
    }

    osSelectedProducts = osSelectedProducts.filter(p => p.id !== id);
    renderOSProducts();
    showToast(`${produtoRemovido.name} removido com sucesso`, 'success');
  }
}

document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-remove-os-product]');
  if (btn) {
    const productId = parseInt(btn.getAttribute('data-remove-os-product'));
    removeProductFromOS(productId);
  }
});

// ===========================
// CALCULAR TOTAIS + LUCRO
// ===========================
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

// ===========================
// LISTENER LUCRO (%)
// ===========================
document.addEventListener('input', function (e) {
  if (e.target && e.target.id === 'profitPercent') {
    updateOSProductTotals();
  }
});

// ===========================
// FINALIZAR OS - BAIXA NO ESTOQUE
// ===========================
async function finalizarOS(osId) {
  if (!osId) {
    showToast('ID da OS não fornecido', 'error');
    return;
  }

  const os = allOrders.find(o => o.id === osId);
  if (!os) {
    showToast('Ordem de serviço não encontrada', 'error');
    return;
  }

  // Verifica se já está finalizada
  const statusText = (os.status || os.estado || '').toString().toLowerCase();
  if (/conclu|finaliz/i.test(statusText)) {
    showToast('Esta OS já está finalizada', 'info');
    return;
  }

  const produtosDaOS = Array.isArray(os.products) ? os.products : [];

  if (produtosDaOS.length === 0) {
    showToast('Esta OS não possui produtos cadastrados', 'info');
  }

  try {
    // Apenas atualizar status - estoque já foi descontado ao adicionar os produtos
    await firebase.database().ref('orders/' + osId).update({
      status: 'Finalizada',
      dataFinalizacao: new Date().toISOString()
    });

    showToast('OS finalizada com sucesso!', 'success');

    if (typeof loadOrders === 'function') {
      loadOrders();
    }

  } catch (err) {
    console.error('Erro ao finalizar OS:', err);
    showToast('Erro ao finalizar OS', 'error');
  }
}

// ===========================
// UTILS
// ===========================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');

  const colors = {
    success: '#10b981',
    error: '#B32117',
    info: '#D4C29A'
  };

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle'
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #1a1a1a;
    border: 2px solid ${colors[type]};
    color: #F5F5F5;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 400px;
    animation: slideInToast 0.3s ease-out;
  `;

  toast.innerHTML = `
    <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 20px;"></i>
    <span style="font-weight: 500; font-size: 14px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutToast 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}



// ===========================
// VIEW MODE (LIST/CARD)
// ===========================
function toggleView(viewMode) {
  const buttons = document.querySelectorAll('.view-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === viewMode) {
      btn.classList.add('active');
    }
  });

  const ordersList = document.getElementById('ordersList');
  if (ordersList) {
    if (viewMode === 'list') {
      ordersList.classList.add('list-view');
    } else {
      ordersList.classList.remove('list-view');
    }
  }

  localStorage.setItem('ordersViewMode', viewMode);
}

// ===========================
// EXTINTORES
// ===========================
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

// ===========================
// INICIALIZAÇÃO
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  const savedView = localStorage.getItem('ordersViewMode') || 'card';
  toggleView(savedView);
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
                <span class="label">Categoria</span>
                <span class="value" id="modalCategoria">-</span>
              </div>
            </div>
            
            <div class="info-row">
              <i class="fas fa-cube"></i>
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
// IDENTIFICAR CATEGORIA DO ITEM
// ========================================
function identificarCategoria(campo) {
  if (campo.includes('mangueira')) {
    return { categoria: 'Mangueira', icon: 'fa-water', cor: '#3b82f6' };
  } else if (campo.includes('extintor') || campo === 'extintores_validade') {
    return { categoria: 'Extintor', icon: 'fa-fire-extinguisher', cor: '#ef4444' };
  } else if (campo.includes('cert')) {
    return { categoria: 'Certificado', icon: 'fa-certificate', cor: '#f59e0b' };
  } else if (campo.includes('alarme')) {
    return { categoria: 'Alarme de Incêndio', icon: 'fa-bell', cor: '#ec4899' };
  } else if (campo.includes('botoeira')) {
    return { categoria: 'Botoeira', icon: 'fa-circle', cor: '#06b6d4' };
  } else if (campo.includes('central')) {
    return { categoria: 'Central de Alarme', icon: 'fa-microchip', cor: '#8b5cf6' };
  } else if (campo.includes('detector')) {
    return { categoria: 'Detector de Fumaça', icon: 'fa-smoke', cor: '#6366f1' };
  } else if (campo.includes('hidrante')) {
    return { categoria: 'Hidrante', icon: 'fa-hydrant', cor: '#10b981' };
  } else if (campo.includes('iluminacao')) {
    return { categoria: 'Iluminação de Emergência', icon: 'fa-lightbulb', cor: '#fbbf24' };
  } else if (campo.includes('projeto_spda')) {
    return { categoria: 'Projeto SPDA', icon: 'fa-bolt', cor: '#f97316' };
  } else if (campo.includes('sprinklers')) {
    return { categoria: 'Sprinklers', icon: 'fa-spray-can', cor: '#14b8a6' };
  }
  return { categoria: 'Outros', icon: 'fa-cube', cor: '#6b7280' };
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

        // ========== VERIFICA MANGUEIRA ==========
        if (inspecao.mangueira_data_vencimento) {
          const dataValidade = inspecao.mangueira_data_vencimento;
          const diasRestantes = calcularDiasRestantes(dataValidade);

          if (diasRestantes !== null) {
            const status = determinarStatus(diasRestantes);

            if (status !== 'ok') {
              const tipoMangueira = inspecao.mangueira_tipo || 'Mangueira';
              const diametroMangueira = inspecao.mangueira_diametro || '';
              const comprimentoMangueira = inspecao.mangueira_comprimento ? inspecao.mangueira_comprimento + 'm' : '';

              const tipo = `${tipoMangueira} ${diametroMangueira} ${comprimentoMangueira}`.trim();

              itensVencidos.push({
                id: `${id}-mangueira_data_vencimento`,
                tipo: tipo,
                validade: dataValidade,
                diasRestantes: diasRestantes,
                status: status,
                campo: 'mangueira_data_vencimento',
                categoria: 'Mangueira',
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

        // ========== VERIFICA EXTINTORES ==========
        // Campo geral de validade dos extintores
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
                categoria: 'Extintor',
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
                  categoria: 'Extintor',
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

        // ========== VERIFICA CERTIFICADO ==========
        if (inspecao.cert_validade) {
          const dataValidade = inspecao.cert_validade;
          const diasRestantes = calcularDiasRestantes(dataValidade);

          if (diasRestantes !== null) {
            const status = determinarStatus(diasRestantes);

            if (status !== 'ok') {
              const tipo = `Certificado ${inspecao.cert_tipo || ''}`.trim();

              itensVencidos.push({
                id: `${id}-cert_validade`,
                tipo: tipo,
                validade: dataValidade,
                diasRestantes: diasRestantes,
                status: status,
                campo: 'cert_validade',
                categoria: 'Certificado',
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

        // ========== VERIFICA OUTROS CAMPOS ==========
        Object.keys(inspecao).forEach(campo => {
          // Busca apenas campos que terminam com "validade"
          if (campo.endsWith('validade') && 
              !campo.includes('inicio') && 
              !campo.includes('mangueira') && 
              !campo.includes('extintor') &&
              !campo.includes('cert') &&
              inspecao[campo]) {
            
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
                  categoria: identificarCategoria(campo).categoria,
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

// ========================================
// FORMATAR TIPO DE CAMPO
// ========================================
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
        const categoriaInfo = identificarCategoria(item.campo);
        const empresaNomeEscapedItem = empresa.empresa.replace(/'/g, "\\'");
        
        return `
                        <div class="item-card ${item.status}">
                          <div class="item-header">
                            <div class="item-icon"><i class="fas fa-${item.status === 'vencido' ? 'times-circle' : 'exclamation-circle'}"></i></div>
                            <div class="item-info">
                              <div class="item-categoria" style="font-size: 11px; color: #888; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                                <i class="fas ${categoriaInfo.icon}" style="color: ${categoriaInfo.cor};"></i>
                                ${item.categoria}
                              </div>
                              <div class="item-nome">${item.tipo}</div>
                              <div class="item-meta">
                                <span><i class="fas fa-calendar"></i> ${formatarData(item.validade)}</span>
                                <span class="status-text">${item.status === 'vencido' ? 'Vencido' : 'Próximo'}</span>
                              </div>
                            </div>
                            <button 
                              onclick="event.stopPropagation(); abrirModalEdicaoItem('${inspecao.inspectionId}', '${campoEscaped}', '${empresaNomeEscapedItem}', '${tipoEscaped}', '${item.categoria}')" 
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
            inspecaoData: inspecao.dataInspecao
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
  const categoriaInfo = identificarCategoria(vencimento.campo);

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
        .categoria-badge { background: ${categoriaInfo.cor} !important; }
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
                <div class="categoria-badge" style="display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-size: 12px; font-weight: 600; margin: 8px 0;">
                  <i class="fas ${categoriaInfo.icon}"></i> ${vencimento.categoria}
                </div>
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
                <div class="detalhes-linha"><span class="detalhes-label">Categoria:</span><span class="detalhes-valor">${vencimento.categoria}</span></div>
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
function abrirModalEdicaoItem(inspectionId, campo, empresa, tipo, categoria) {
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
      status: status,
      categoria: categoria
    };

    document.getElementById('modalEmpresa').textContent = empresa;
    document.getElementById('modalCategoria').textContent = categoria;
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
// Design Mobile Otimizado + Modal Compacto
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

  const isMobile = window.innerWidth < 768;

  // Estilos base do dia - MOBILE OTIMIZADO
  Object.assign(dayDiv.style, {
    background: '#2a2a2a',
    border: '1px solid #404040',
    borderRadius: isMobile ? '6px' : '8px',
    padding: isMobile ? '6px' : '15px',
    minHeight: isMobile ? '65px' : '110px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: isMobile ? '3px' : '10px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  if (isOtherMonth) {
    dayDiv.style.opacity = '0.3';
    dayDiv.style.pointerEvents = 'none';
  }

  if (isToday) {
    dayDiv.style.border = isMobile ? '1.5px solid #D4C29A' : '2px solid #D4C29A';
    dayDiv.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #3a3a2a 100%)';
  }

  // Hover effect (só desktop)
  if (!isOtherMonth && !isMobile) {
    dayDiv.addEventListener('mouseenter', () => {
      dayDiv.style.borderColor = '#D4C29A';
      dayDiv.style.boxShadow = '0 4px 12px rgba(212, 194, 154, 0.2)';
      dayDiv.style.transform = 'translateY(-2px)';
    });

    dayDiv.addEventListener('mouseleave', () => {
      if (!isToday) {
        dayDiv.style.borderColor = '#404040';
      }
      dayDiv.style.boxShadow = 'none';
      dayDiv.style.transform = 'translateY(0)';
    });
  }

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Filtrar e ordenar inspeções por horário
  const dayInspections = (calendarInspections || []).filter(insp => insp.date === dateStr);
  dayInspections.sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  if (dayInspections.length > 0) {
    dayDiv.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #2a3a2a 100%)';
  }

  // ====================================
  // LAYOUT MOBILE: Mais compacto
  // ====================================
  const topSection = document.createElement('div');
  Object.assign(topSection.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: '0'
  });

  const dayNumber = document.createElement('div');
  dayNumber.textContent = day;
  Object.assign(dayNumber.style, {
    fontSize: isMobile ? '0.95rem' : '1.5rem',
    fontWeight: '700',
    color: '#D4C29A',
    lineHeight: '1'
  });

  topSection.appendChild(dayNumber);

  // Badge contador (se houver inspeções)
  if (dayInspections.length > 0) {
    const badge = document.createElement('div');
    badge.textContent = dayInspections.length;
    Object.assign(badge.style, {
      background: '#D4C29A',
      color: '#1a1a1a',
      fontSize: isMobile ? '0.65rem' : '0.8rem',
      fontWeight: '700',
      padding: isMobile ? '2px 6px' : '5px 12px',
      borderRadius: isMobile ? '8px' : '12px',
      minWidth: isMobile ? '18px' : '30px',
      textAlign: 'center',
      boxShadow: '0 2px 6px rgba(212, 194, 154, 0.3)',
      lineHeight: '1.2'
    });
    topSection.appendChild(badge);
  }

  dayDiv.appendChild(topSection);

  // ====================================
  // CENTRO: Ícone (só se tiver inspeções)
  // ====================================
  if (dayInspections.length > 0) {
    const centerSection = document.createElement('div');
    Object.assign(centerSection.style, {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '0'
    });

    const icon = document.createElement('div');
    icon.innerHTML = '<i class="fas fa-calendar-check"></i>';
    Object.assign(icon.style, {
      fontSize: isMobile ? '1rem' : '1.8rem',
      color: '#D4C29A',
      opacity: '0.6'
    });
    centerSection.appendChild(icon);

    dayDiv.appendChild(centerSection);
  }

  // ====================================
  // RODAPÉ: Botão + (mais compacto no mobile)
  // ====================================
  if (!isOtherMonth) {
    const addBtn = document.createElement('button');
    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
    addBtn.title = 'Agendar';
    Object.assign(addBtn.style, {
      background: 'rgba(212, 194, 154, 0.1)',
      border: '1px dashed #D4C29A',
      color: '#D4C29A',
      padding: isMobile ? '4px' : '8px',
      borderRadius: isMobile ? '4px' : '6px',
      fontSize: isMobile ? '0.7rem' : '0.8rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      flexShrink: '0',
      minHeight: isMobile ? '22px' : 'auto'
    });

    if (!isMobile) {
      addBtn.addEventListener('mouseenter', () => {
        addBtn.style.background = 'rgba(212, 194, 154, 0.2)';
        addBtn.style.borderStyle = 'solid';
      });

      addBtn.addEventListener('mouseleave', () => {
        addBtn.style.background = 'rgba(212, 194, 154, 0.1)';
        addBtn.style.borderStyle = 'dashed';
      });
    }

    addBtn.onclick = (e) => {
      e.stopPropagation();
      if (typeof abrirModalAgendamentoComData === 'function') {
        abrirModalAgendamentoComData(dateStr);
      }
    };

    dayDiv.appendChild(addBtn);
  }

  // Click no dia abre modal
  if (!isOtherMonth) {
    dayDiv.onclick = () => {
      abrirModalInspecoesDia(dateStr, day, month, year, dayInspections);
    };
  }

  return dayDiv;
}

// ========================================
// MODAL DE INSPEÇÕES DO DIA - MOBILE FRIENDLY
// ========================================

function abrirModalInspecoesDia(dateStr, day, month, year, dayInspections) {
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const isMobile = window.innerWidth < 768;

  // Criar modal se não existir
  let modal = document.getElementById('modalInspecoesDia');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalInspecoesDia';
    Object.assign(modal.style, {
      display: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: '10000',
      overflowY: 'auto',
      padding: isMobile ? '10px' : '15px',
      boxSizing: 'border-box'
    });
    document.body.appendChild(modal);
  }

  // Ordenar por horário
  dayInspections.sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  // Conteúdo do modal
  modal.innerHTML = `
    <div style="
      background: #1a1a1a;
      border: 2px solid #D4C29A;
      border-radius: ${isMobile ? '10px' : '12px'};
      padding: ${isMobile ? '15px' : '20px'};
      max-width: ${isMobile ? '100%' : '600px'};
      margin: ${isMobile ? '10px auto' : '20px auto'};
    ">
      <!-- Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: ${isMobile ? '12px' : '20px'};
        padding-bottom: ${isMobile ? '8px' : '12px'};
        border-bottom: 1px solid #D4C29A;
      ">
        <div style="
          font-size: ${isMobile ? '1.1rem' : '1.3rem'};
          color: #D4C29A;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: ${isMobile ? '6px' : '8px'};
        ">
          <i class="fas fa-calendar-day"></i>
          <span>${day} de ${monthNames[month]}</span>
        </div>
        <button onclick="fecharModalInspecoesDia()" style="
          background: none;
          border: none;
          color: #D4C29A;
          font-size: ${isMobile ? '1.3rem' : '1.5rem'};
          cursor: pointer;
          padding: 0;
          width: ${isMobile ? '32px' : '36px'};
          height: ${isMobile ? '32px' : '36px'};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Badge contador -->
      <div style="
        background: rgba(212, 194, 154, 0.15);
        border-left: 3px solid #D4C29A;
        padding: ${isMobile ? '8px' : '10px'};
        border-radius: ${isMobile ? '4px' : '6px'};
        margin-bottom: ${isMobile ? '12px' : '15px'};
        font-size: ${isMobile ? '0.85rem' : '0.95rem'};
        color: #D4C29A;
        font-weight: 600;
      ">
        <i class="fas fa-list"></i> ${dayInspections.length} inspeç${dayInspections.length !== 1 ? 'ões' : 'ão'} agendada${dayInspections.length !== 1 ? 's' : ''}
      </div>

      <!-- Conteúdo -->
      <div style="max-height: ${isMobile ? '60vh' : '50vh'}; overflow-y: auto; margin-bottom: ${isMobile ? '12px' : '15px'};">
        ${dayInspections.length === 0 ? `
          <div style="text-align: center; padding: ${isMobile ? '20px 10px' : '30px 20px'}; color: #999;">
            <i class="fas fa-calendar-times" style="font-size: ${isMobile ? '2rem' : '2.5rem'}; margin-bottom: ${isMobile ? '10px' : '12px'}; color: #D4C29A;"></i>
            <p style="margin-bottom: ${isMobile ? '12px' : '15px'}; font-size: ${isMobile ? '0.9rem' : '1rem'};">Nenhuma inspeção agendada</p>
            <button onclick="fecharModalInspecoesDia(); abrirModalAgendamentoComData('${dateStr}');" style="
              background: #D4C29A;
              color: #1a1a1a;
              border: none;
              padding: ${isMobile ? '10px 16px' : '12px 20px'};
              border-radius: ${isMobile ? '6px' : '8px'};
              font-weight: 600;
              cursor: pointer;
              font-size: ${isMobile ? '0.85rem' : '0.95rem'};
            ">
              <i class="fas fa-plus"></i> Agendar
            </button>
          </div>
        ` : dayInspections.map(inspection => `
          <div style="
            background: #2a2a2a;
            border: 1px solid #404040;
            border-left: 3px solid #D4C29A;
            border-radius: ${isMobile ? '6px' : '8px'};
            padding: ${isMobile ? '10px' : '12px'};
            margin-bottom: ${isMobile ? '8px' : '10px'};
          ">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: ${isMobile ? '8px' : '10px'};
            ">
              <div style="flex: 1; min-width: 0;">
                <div style="
                  font-size: ${isMobile ? '0.95rem' : '1rem'};
                  font-weight: 700;
                  color: #D4C29A;
                  margin-bottom: 4px;
                  word-wrap: break-word;
                  line-height: 1.3;
                ">
                  ${inspection.clientName}
                </div>
                <div style="
                  font-size: ${isMobile ? '0.65rem' : '0.7rem'};
                  color: #999;
                  font-weight: 600;
                  background: rgba(212, 194, 154, 0.1);
                  padding: 2px 6px;
                  border-radius: 3px;
                  display: inline-block;
                ">
                  ${inspection.clientType === 'predio' ? 'PRÉDIO' : 'EMPRESA'}
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: ${isMobile ? '6px' : '8px'}; margin-bottom: ${isMobile ? '8px' : '10px'};">
              <div style="display: flex; align-items: center; gap: 6px; color: #fff; font-size: ${isMobile ? '0.8rem' : '0.85rem'};">
                <i class="fas fa-clock" style="color: #D4C29A; width: 14px; font-size: ${isMobile ? '0.75rem' : '0.85rem'};"></i>
                <span>${inspection.time}</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 6px; color: #fff; font-size: ${isMobile ? '0.8rem' : '0.85rem'};">
                <i class="fas fa-map-marker-alt" style="color: #D4C29A; width: 14px; margin-top: 2px; font-size: ${isMobile ? '0.75rem' : '0.85rem'}; flex-shrink: 0;"></i>
                <span style="word-wrap: break-word; flex: 1; line-height: 1.4;">${inspection.address || 'Endereço não informado'}</span>
              </div>
              ${inspection.notes ? `
              <div style="display: flex; align-items: flex-start; gap: 6px; color: #fff; font-size: ${isMobile ? '0.8rem' : '0.85rem'};">
                <i class="fas fa-sticky-note" style="color: #D4C29A; width: 14px; margin-top: 2px; font-size: ${isMobile ? '0.75rem' : '0.85rem'}; flex-shrink: 0;"></i>
                <span style="word-wrap: break-word; flex: 1; line-height: 1.4;">${inspection.notes}</span>
              </div>
              ` : ''}
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: ${isMobile ? '5px' : '6px'};">
              <button onclick='fecharModalInspecoesDia(); abrirDetalhesInspecao(${JSON.stringify(inspection).replace(/'/g, "&#39;")});' style="
                padding: ${isMobile ? '8px 4px' : '6px'};
                font-size: ${isMobile ? '0.75rem' : '0.8rem'};
                border: none;
                border-radius: ${isMobile ? '5px' : '6px'};
                cursor: pointer;
                background: #D4C29A;
                color: #1a1a1a;
                font-weight: 600;
              ">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick='baixarPDFInspecao(${JSON.stringify(inspection).replace(/'/g, "&#39;")});' style="
                padding: ${isMobile ? '8px 4px' : '6px'};
                font-size: ${isMobile ? '0.75rem' : '0.8rem'};
                border: none;
                border-radius: ${isMobile ? '5px' : '6px'};
                cursor: pointer;
                background: #4CAF50;
                color: #fff;
                font-weight: 600;
              ">
                <i class="fas fa-file-pdf"></i>
              </button>
              <button onclick="deletarInspecao('${inspection.id}')" style="
                padding: ${isMobile ? '8px 4px' : '6px'};
                font-size: ${isMobile ? '0.75rem' : '0.8rem'};
                border: none;
                border-radius: ${isMobile ? '5px' : '6px'};
                cursor: pointer;
                background: #B32117;
                color: #fff;
                font-weight: 600;
              ">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Footer -->
      ${dayInspections.length > 0 ? `
      <button onclick="fecharModalInspecoesDia(); abrirModalAgendamentoComData('${dateStr}');" style="
        width: 100%;
        background: #D4C29A;
        color: #1a1a1a;
        border: none;
        padding: ${isMobile ? '10px' : '12px'};
        border-radius: ${isMobile ? '6px' : '8px'};
        font-weight: 600;
        cursor: pointer;
        font-size: ${isMobile ? '0.85rem' : '0.95rem'};
      ">
        <i class="fas fa-plus"></i> Agendar Nova Inspeção
      </button>
      ` : ''}
    </div>
  `;

  modal.style.display = 'block';

  modal.onclick = (e) => {
    if (e.target === modal) {
      fecharModalInspecoesDia();
    }
  };
}

function fecharModalInspecoesDia() {
  const modal = document.getElementById('modalInspecoesDia');
  if (modal) {
    modal.style.display = 'none';
  }
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
// EVENT LISTENERS
// ========================================



// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function formatarDataBR(dateStr) {
  if (!dateStr) return 'Data não informada';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

async function deletarInspecao(inspectionId) {
  if (!confirm('Tem certeza que deseja excluir esta inspeção?')) {
    return;
  }

  try {
    await database.ref(`scheduled_inspections/${inspectionId}`).remove();
    showToast('Inspeção excluída com sucesso!', 'success');

    fecharModalDetalhes();
    fecharModalInspecoesDia();

    await carregarInspecoesAgendadas();
    renderCalendar();
  } catch (error) {
    console.error('Erro ao excluir inspeção:', error);
    showToast('Erro ao excluir inspeção', 'error');
  }
}

// ========================================
// INICIALIZAR
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalendar);
} else {
  initCalendar();
}

// ========================================
// DELETAR INSPEÇÃO
// ========================================



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

  // 🔒 Remove listeners antigos clonando os botões
  const prevBtn = document.getElementById('prevMonthBtn').cloneNode(true);
  document.getElementById('prevMonthBtn').replaceWith(prevBtn);

  const nextBtn = document.getElementById('nextMonthBtn').cloneNode(true);
  document.getElementById('nextMonthBtn').replaceWith(nextBtn);

  const addBtn = document.getElementById('addScheduleBtn').cloneNode(true);
  document.getElementById('addScheduleBtn').replaceWith(addBtn);

  const exportBtn = document.getElementById('exportMonthPDFBtn').cloneNode(true);
  document.getElementById('exportMonthPDFBtn').replaceWith(exportBtn);

  // ⬅️ Mês anterior
  prevBtn.addEventListener('click', () => {
    currentCalendarDate = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  // ➡️ Próximo mês
  nextBtn.addEventListener('click', () => {
    currentCalendarDate = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  document.getElementById('closeDayListBtn').addEventListener('click', () => {
    document.getElementById('dayInspectionsList').style.display = 'none';
  });

  addBtn.addEventListener('click', abrirModalAgendamento);

  document.getElementById('scheduleForm')
    .addEventListener('submit', salvarAgendamento);

  document.getElementById('scheduleClientSelect')
    .addEventListener('change', function () {
      const selectedOption = this.options[this.selectedIndex];

      if (selectedOption.value) {
        document.getElementById('scheduleClientId').value = selectedOption.value;
        document.getElementById('scheduleClientName').value = selectedOption.dataset.nome || '';
        document.getElementById('scheduleClientType').value = selectedOption.dataset.tipo || 'empresa';
        document.getElementById('scheduleCNPJ').value = selectedOption.dataset.cnpj || '';
        document.getElementById('scheduleAddress').value = selectedOption.dataset.endereco || '';
      }
    });

  exportBtn.addEventListener('click', exportarMesPDF);
}

/* ========== BRIGADA - VARIÁVEIS GLOBAIS ========== */
let brigadaData = {};
let expandedBrigadaCompanies = {};
const membersPerPage = 8;

/* ========== BRIGADA - CARREGAMENTO INICIAL ========== */
async function initBrigada() {
  await loadBrigadaOverview();
  await loadAllBrigadaCompanies();
  setupBrigadaRealtimeListener();
}

/* ========== BRIGADA - LISTENER REALTIME ========== */
function setupBrigadaRealtimeListener() {
  if (!database) return;

  database.ref('brigada').on('value', (snapshot) => {
    brigadaData = snapshot.val() || {};
    updateBrigadaBadge();
    loadAllBrigadaCompanies();
  });
}

/* ========== BRIGADA - CARREGAR OVERVIEW ========== */
async function loadBrigadaOverview() {
  try {
    const brigadaSnapshot = await database.ref('brigada').once('value');
    brigadaData = brigadaSnapshot.val() || {};
    updateBrigadaBadge();
  } catch (error) {
    console.error('Erro ao carregar brigadistas:', error);
  }
}

/* ========== BRIGADA - ATUALIZAR BADGE ========== */
function updateBrigadaBadge() {
  let totalBrigadistas = 0;
  Object.values(brigadaData).forEach(company => {
    const brigadistas = company?.brigadistas || {};
    totalBrigadistas += Object.keys(brigadistas).length;
  });

  const badge = document.getElementById('brigadaBadge');
  if (badge) {
    badge.textContent = totalBrigadistas;
    badge.style.display = totalBrigadistas > 0 ? 'block' : 'none';
  }
}

/* ========== BRIGADA - CARREGAR TODAS AS EMPRESAS ========== */
async function loadAllBrigadaCompanies() {
  try {
    const companiesSnapshot = await database.ref('companies').once('value');
    const companies = companiesSnapshot.val() || {};
    const companiesList = document.getElementById('brigadaCompaniesList');

    if (!companiesList) return;

    companiesList.innerHTML = '';

    if (Object.keys(companies).length === 0) {
      companiesList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px 20px; color: rgba(255, 255, 255, 0.5);">
          <i class="fas fa-building" style="font-size: 40px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
          <p style="margin: 0; font-size: 13px;">Nenhuma empresa cadastrada</p>
        </div>
      `;
      return;
    }

    Object.entries(companies).forEach(([companyKey, company]) => {
      const brigadistaCount = (brigadaData[companyKey]?.brigadistas && Object.keys(brigadaData[companyKey].brigadistas).length) || 0;
      const isExpanded = expandedBrigadaCompanies[companyKey] || false;

      const card = document.createElement('div');
      card.id = `brigada-company-${companyKey}`;
      card.style.cssText = `
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 0;
        transition: all 0.3s ease;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.2);
        transition: all 0.2s;
      `;
      header.onmouseover = () => header.style.background = 'rgba(0, 0, 0, 0.35)';
      header.onmouseout = () => header.style.background = 'rgba(0, 0, 0, 0.2)';

      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #B32117 0%, #8B1810 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
            <i class="fas fa-building"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #fff; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${company.razao_social}</div>
            <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${company.cnpj}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <div style="background: rgba(212, 194, 154, 0.2); color: #D4C29A; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; min-width: 30px; text-align: center;">
            ${brigadistaCount}
          </div>
          <button 
            onclick="downloadBrigadaPDF('${companyKey}')"
            style="
              background: rgba(212, 194, 154, 0.2);
              color: #D4C29A;
              border: 1px solid rgba(212, 194, 154, 0.3);
              width: 28px;
              height: 28px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            "
            onmouseover="this.style.background='rgba(212, 194, 154, 0.35)'"
            onmouseout="this.style.background='rgba(212, 194, 154, 0.2)'"
            title="Baixar PDF"
          >
            <i class="fas fa-download"></i>
          </button>
          <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.5); font-size: 14px; transition: transform 0.3s;">
            <i class="fas fa-chevron-down" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.3s;"></i>
          </div>
        </div>
      `;

      header.onclick = (e) => {
        if (!e.target.closest('button')) {
          toggleBrigadaCompany(companyKey);
        }
      };

      card.appendChild(header);

      if (isExpanded) {
        const content = document.createElement('div');
        content.id = `brigada-content-${companyKey}`;
        content.style.cssText = `
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideDown 0.3s ease;
        `;
        card.appendChild(content);
        renderBrigadaMembers(companyKey, content, company.razao_social);
      }

      companiesList.appendChild(card);
    });
  } catch (error) {
    console.error('Erro ao carregar empresas:', error);
  }
}
/* ========== BRIGADA - TOGGLE LISTA ========== */
function toggleBrigadaList() {
  const body = document.getElementById('brigadaBody');
  const icon = document.querySelector('#brigadaToggleBtn .alerts-toggle-icon');

  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
}


/* ========== BRIGADA - TOGGLE EMPRESA ========== */
function toggleBrigadaCompany(companyKey) {
  expandedBrigadaCompanies[companyKey] = !expandedBrigadaCompanies[companyKey];
  loadAllBrigadaCompanies();
}

/* ========== FUNÇÃO AUXILIAR - VERIFICAR VENCIMENTO ========== */
function verificarVencimento(dataVencimento) {
  if (!dataVencimento) return { vencido: false, dias: null };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);

  const diferenca = Math.floor((vencimento - hoje) / (1000 * 60 * 60 * 24));

  return {
    vencido: diferenca < 0,
    proxAVencer: diferenca >= 0 && diferenca <= 30,
    dias: diferenca
  };
}

/* ========== BRIGADA - RENDERIZAR MEMBROS ========== */
function renderBrigadaMembers(companyKey, container, companyName) {
  const brigadistas = brigadaData[companyKey]?.brigadistas || {};
  const brigadistasArray = Object.entries(brigadistas);

  container.innerHTML = '';

  if (brigadistasArray.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px 12px; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
        <i class="fas fa-users" style="margin-bottom: 8px; display: block; opacity: 0.4;"></i>
        Nenhum brigadista
      </div>
    `;
    addBrigadaBtnToContainer(container, companyKey, companyName);
    return;
  }

  const list = document.createElement('div');
  list.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  `;

  brigadistasArray.slice(0, membersPerPage).forEach(([key, brigadista]) => {
    const statusVencimento = verificarVencimento(brigadista.dataVencimento);

    let borderColor = '#D4C29A';
    let backgroundColor = 'rgba(255, 255, 255, 0.03)';

    if (statusVencimento.vencido) {
      borderColor = '#B32117';
      backgroundColor = 'rgba(179, 33, 23, 0.1)';
    } else if (statusVencimento.proxAVencer) {
      borderColor = '#FFA500';
      backgroundColor = 'rgba(255, 165, 0, 0.1)';
    }

    const item = document.createElement('div');
    item.style.cssText = `
      background: ${backgroundColor};
      border: 1px solid ${borderColor}4D;
      border-left: 2px solid ${borderColor};
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.3s;
    `;

    const dataVencimento = brigadista.dataVencimento ? new Date(brigadista.dataVencimento).toLocaleDateString('pt-BR') : 'S/ vencimento';

    let statusLabel = '';
    if (statusVencimento.vencido) {
      statusLabel = ' <i class="fas fa-exclamation-circle" style="color: #B32117; margin-right: 4px;"></i><span style="color: #B32117; font-weight: 600;">VENCIDO</span>';
    } else if (statusVencimento.proxAVencer) {
      statusLabel = ` <i class="fas fa-clock" style="color: #FFA500; margin-right: 4px;"></i><span style="color: #FFA500; font-weight: 600;">Vence em ${statusVencimento.dias}d</span>`;
    }

    item.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="color: #fff; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${brigadista.nome}</div>
        <div style="color: ${statusVencimento.vencido ? '#B32117' : statusVencimento.proxAVencer ? '#FFA500' : 'rgba(255, 255, 255, 0.5)'}; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${brigadista.funcao} • ${dataVencimento}${statusLabel}</div>
      </div>
      <div style="display: flex; gap: 4px; flex-shrink: 0;">
        <button 
          class="btn-small" 
          onclick="editBrigadaModal('${companyKey}', '${key}')"
          style="
            background: rgba(212, 194, 154, 0.2);
            color: #D4C29A;
            border: 1px solid rgba(212, 194, 154, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='rgba(212, 194, 154, 0.35)'"
          onmouseout="this.style.background='rgba(212, 194, 154, 0.2)'"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button 
          class="btn-small" 
          onclick="deleteBrigadaModal('${companyKey}', '${key}')"
          style="
            background: rgba(179, 33, 23, 0.2);
            color: #B32117;
            border: 1px solid rgba(179, 33, 23, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='rgba(179, 33, 23, 0.35)'"
          onmouseout="this.style.background='rgba(179, 33, 23, 0.2)'"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    list.appendChild(item);
  });

  container.appendChild(list);

  if (brigadistasArray.length > membersPerPage) {
    const viewMoreBtn = document.createElement('button');
    viewMoreBtn.style.cssText = `
      width: 100%;
      padding: 6px;
      background: rgba(212, 194, 154, 0.1);
      border: 1px solid rgba(212, 194, 154, 0.2);
      color: #D4C29A;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;
    `;
    viewMoreBtn.textContent = `Ver todos (${brigadistasArray.length})`;
    viewMoreBtn.onmouseover = () => viewMoreBtn.style.background = 'rgba(212, 194, 154, 0.2)';
    viewMoreBtn.onmouseout = () => viewMoreBtn.style.background = 'rgba(212, 194, 154, 0.1)';
    viewMoreBtn.onclick = () => openBrigadaMembersModal(companyKey, companyName);
    container.appendChild(viewMoreBtn);
  }

  addBrigadaBtnToContainer(container, companyKey, companyName);
}

/* ========== BRIGADA - MODAL VER TODOS ========== */
async function openBrigadaMembersModal(companyKey, companyName) {
  const brigadistas = brigadaData[companyKey]?.brigadistas || {};
  const brigadistasArray = Object.entries(brigadistas);

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.cssText = `
    display: flex !important;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content modal-compact';
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
    border: 2px solid #D4C29A;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid #D4C29A; position: sticky; top: 0; background: #0d0d0d; z-index: 10;">
      <div style="flex: 1;">
        <h2 style="margin: 0; color: #D4C29A; font-size: 16px; font-weight: 700;">Brigadistas</h2>
        <p style="margin: 4px 0 0 0; color: rgba(255, 255, 255, 0.5); font-size: 11px;">${companyName}</p>
      </div>
      <button class="close-modal" onclick="this.closest('.modal').remove()" style="background: none; border: none; color: #D4C29A; font-size: 20px; cursor: pointer; padding: 0; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body" style="padding: 14px; background: #0d0d0d;">
      <div id="modalBrigadistasList" style="display: flex; flex-direction: column; gap: 8px;"></div>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  const listContainer = modal.querySelector('#modalBrigadistasList');
  brigadistasArray.forEach(([key, brigadista]) => {
    const statusVencimento = verificarVencimento(brigadista.dataVencimento);

    let borderColor = '#D4C29A';
    let backgroundColor = 'rgba(255, 255, 255, 0.03)';

    if (statusVencimento.vencido) {
      borderColor = '#B32117';
      backgroundColor = 'rgba(179, 33, 23, 0.1)';
    } else if (statusVencimento.proxAVencer) {
      borderColor = '#FFA500';
      backgroundColor = 'rgba(255, 165, 0, 0.1)';
    }

    const item = document.createElement('div');
    item.style.cssText = `
      background: ${backgroundColor};
      border: 1px solid ${borderColor}4D;
      border-left: 2px solid ${borderColor};
      border-radius: 6px;
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.3s;
    `;

    const dataVencimento = brigadista.dataVencimento ? new Date(brigadista.dataVencimento).toLocaleDateString('pt-BR') : 'S/ vencimento';
    const dataCadastro = new Date(brigadista.dataCadastro).toLocaleDateString('pt-BR');
    const dataInicio = brigadista.dataInicio ? new Date(brigadista.dataInicio).toLocaleDateString('pt-BR') : 'N/A';

    let statusHTML = '';
    if (statusVencimento.vencido) {
      statusHTML = ' <span style="color: #B32117; font-weight: 600; font-size: 10px;"><i class="fas fa-exclamation-circle"></i> VENCIDO</span>';
    } else if (statusVencimento.proxAVencer) {
      statusHTML = ` <span style="color: #FFA500; font-weight: 600; font-size: 10px;"><i class="fas fa-clock"></i> Vence em ${statusVencimento.dias}d</span>`;
    }

    item.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="color: #fff; font-weight: 600; font-size: 12px;">${brigadista.nome}${statusHTML}</div>
        <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px;">${brigadista.funcao}</div>
        <div style="color: rgba(255, 255, 255, 0.4); font-size: 10px; margin-top: 2px; font-family: monospace;">${brigadista.cpf}</div>
        <div style="color: ${statusVencimento.vencido ? '#B32117' : statusVencimento.proxAVencer ? '#FFA500' : 'rgba(212, 194, 154, 0.6)'}; font-size: 10px; margin-top: 4px;"><i class="fas fa-calendar-alt"></i> Início: ${dataInicio} | Cadastro: ${dataCadastro} | Vencimento: ${dataVencimento}</div>
      </div>
      <div style="display: flex; gap: 4px; flex-shrink: 0;">
        <button 
          onclick="editBrigadaModal('${companyKey}', '${key}')"
          style="
            background: rgba(212, 194, 154, 0.2);
            color: #D4C29A;
            border: 1px solid rgba(212, 194, 154, 0.3);
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='rgba(212, 194, 154, 0.35)'"
          onmouseout="this.style.background='rgba(212, 194, 154, 0.2)'"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button 
          onclick="deleteBrigadaModal('${companyKey}', '${key}')"
          style="
            background: rgba(179, 33, 23, 0.2);
            color: #B32117;
            border: 1px solid rgba(179, 33, 23, 0.3);
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='rgba(179, 33, 23, 0.35)'"
          onmouseout="this.style.background='rgba(179, 33, 23, 0.2)'"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    listContainer.appendChild(item);
  });
}

/* ========== BRIGADA - ADICIONAR BOTÃO ========== */
function addBrigadaBtnToContainer(container, companyKey, companyName) {
  const btnDiv = document.createElement('div');
  btnDiv.style.marginTop = '8px';

  const btn = document.createElement('button');
  btn.style.cssText = `
    width: 100%;
    padding: 8px;
    background: linear-gradient(135deg, #B32117 0%, #8B1810 100%);
    border: none;
    color: white;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  `;
  btn.innerHTML = '<i class="fas fa-plus"></i> Adicionar';
  btn.onmouseover = () => btn.style.filter = 'brightness(1.1)';
  btn.onmouseout = () => btn.style.filter = 'brightness(1)';
  btn.onclick = () => openAddBrigadaModal(companyKey, companyName);

  btnDiv.appendChild(btn);
  container.appendChild(btnDiv);
}

/* ========== BRIGADA - ADICIONAR MODAL ========== */
async function openAddBrigadaModal(companyKey, companyName) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.cssText = `
    display: flex !important;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content modal-compact';
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
    border: 2px solid #D4C29A;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid #D4C29A;">
      <h2 style="margin: 0; color: #D4C29A; font-size: 16px; font-weight: 700;"><i class="fas fa-plus-circle" style="margin-right: 8px;"></i>Novo Brigadista</h2>
      <button onclick="this.closest('.modal').remove()" style="background: none; border: none; color: #D4C29A; font-size: 20px; cursor: pointer; padding: 0;">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="modal-body" style="padding: 16px; background: #0d0d0d;">
      <div style="background: rgba(212, 194, 154, 0.1); border-left: 2px solid #D4C29A; padding: 10px; border-radius: 6px; margin-bottom: 14px; font-size: 11px; color: #999;">
        <strong style="color: #D4C29A;"><i class="fas fa-building" style="margin-right: 6px;"></i>${companyName}</strong>
      </div>

      <form id="formAddBrigada" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Nome *</label>
          <input type="text" id="brigadaNome" required placeholder="Nome completo" style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">CPF *</label>
          <input type="text" id="brigadaCPF" required placeholder="000.000.000-00" style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Função *</label>
          <select id="brigadaFuncao" required style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
            <option value="">-- Selecione --</option>
            <option value="Chefe da Brigada">Chefe da Brigada</option>
            <option value="Vice-Chefe">Vice-Chefe</option>
            <option value="Brigadista">Brigadista</option>
            <option value="Primeiro Socorrista">Primeiro Socorrista</option>
            <option value="Responsável por Equipamento">Responsável por Equipamento</option>
          </select>
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Data de Início</label>
          <input type="date" id="brigadaDataInicio" style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Data de Vencimento</label>
          <input type="date" id="brigadaDataVencimento" style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button type="submit" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #B32117 0%, #8B1810 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='brightness(1)'">
            <i class="fas fa-check" style="margin-right: 6px;"></i>Adicionar
          </button>
          <button type="button" onclick="this.closest('.modal').remove()" style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #ccc; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  document.getElementById('formAddBrigada').onsubmit = async (e) => {
    e.preventDefault();

    const nome = document.getElementById('brigadaNome').value.trim();
    const cpf = document.getElementById('brigadaCPF').value.trim();
    const funcao = document.getElementById('brigadaFuncao').value;
    const dataInicio = document.getElementById('brigadaDataInicio').value;
    const dataVencimento = document.getElementById('brigadaDataVencimento').value;

    if (!nome || !cpf || !funcao) {
      showNotification('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';

    try {
      const brigadaKey = Date.now().toString();
      await database.ref(`brigada/${companyKey}/brigadistas/${brigadaKey}`).set({
        nome,
        cpf,
        funcao,
        dataInicio: dataInicio ? new Date(dataInicio).toISOString() : null,
        dataVencimento: dataVencimento ? new Date(dataVencimento).toISOString() : null,
        dataCadastro: new Date().toISOString()
      });

      modal.remove();
      showNotification('Brigadista adicionado com sucesso!', 'success');
    } catch (error) {
      showNotification('Erro ao adicionar brigadista', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Adicionar';
    }
  };
}

/* ========== BRIGADA - EDITAR MODAL ========== */
async function editBrigadaModal(companyKey, brigadistaKey) {
  const brigadista = brigadaData[companyKey]?.brigadistas[brigadistaKey];
  if (!brigadista) return;

  const companies = (await database.ref('companies').once('value')).val() || {};
  const companyName = companies[companyKey]?.razao_social || 'Empresa';

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.cssText = `
    display: flex !important;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content modal-compact';
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
    border: 2px solid #D4C29A;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  `;

  const dataInicioFormatada = brigadista.dataInicio ? new Date(brigadista.dataInicio).toISOString().split('T')[0] : '';
  const dataVencimentoFormatada = brigadista.dataVencimento ? new Date(brigadista.dataVencimento).toISOString().split('T')[0] : '';

  modalContent.innerHTML = `
    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 2px solid #D4C29A;">
      <h2 style="margin: 0; color: #D4C29A; font-size: 16px; font-weight: 700;"><i class="fas fa-edit" style="margin-right: 8px;"></i>Editar Brigadista</h2>
      <button onclick="this.closest('.modal').remove()" style="background: none; border: none; color: #D4C29A; font-size: 20px; cursor: pointer; padding: 0;">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="modal-body" style="padding: 16px; background: #0d0d0d;">
      <div style="background: rgba(212, 194, 154, 0.1); border-left: 2px solid #D4C29A; padding: 10px; border-radius: 6px; margin-bottom: 14px; font-size: 11px; color: #999;">
        <strong style="color: #D4C29A;"><i class="fas fa-building" style="margin-right: 6px;"></i>${companyName}</strong>
      </div>

      <form id="formEditBrigada" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Nome *</label>
          <input type="text" id="editBrigadaNome" value="${brigadista.nome}" required style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">CPF *</label>
          <input type="text" id="editBrigadaCPF" value="${brigadista.cpf}" required style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Função *</label>
          <select id="editBrigadaFuncao" required style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
            <option value="Chefe da Brigada" ${brigadista.funcao === 'Chefe da Brigada' ? 'selected' : ''}>Chefe da Brigada</option>
            <option value="Vice-Chefe" ${brigadista.funcao === 'Vice-Chefe' ? 'selected' : ''}>Vice-Chefe</option>
            <option value="Brigadista" ${brigadista.funcao === 'Brigadista' ? 'selected' : ''}>Brigadista</option>
            <option value="Primeiro Socorrista" ${brigadista.funcao === 'Primeiro Socorrista' ? 'selected' : ''}>Primeiro Socorrista</option>
            <option value="Responsável por Equipamento" ${brigadista.funcao === 'Responsável por Equipamento' ? 'selected' : ''}>Responsável por Equipamento</option>
          </select>
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Data de Início</label>
          <input type="date" id="editBrigadaDataInicio" value="${dataInicioFormatada}" style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="color: #D4C29A; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Data de Vencimento</label>
          <input type="date" id="editBrigadaDataVencimento" value="${dataVencimentoFormatada}" style="width: 100%; padding: 8px; background: #1a1a1a; border: 2px solid #D4C29A; border-radius: 6px; color: #fff; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button type="submit" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #B32117 0%, #8B1810 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter='brightness(1)'">
            <i class="fas fa-save" style="margin-right: 6px;"></i>Salvar
          </button>
          <button type="button" onclick="this.closest('.modal').remove()" style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #ccc; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  document.getElementById('formEditBrigada').onsubmit = async (e) => {
    e.preventDefault();

    const nome = document.getElementById('editBrigadaNome').value.trim();
    const cpf = document.getElementById('editBrigadaCPF').value.trim();
    const funcao = document.getElementById('editBrigadaFuncao').value;
    const dataInicio = document.getElementById('editBrigadaDataInicio').value;
    const dataVencimento = document.getElementById('editBrigadaDataVencimento').value;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
      await database.ref(`brigada/${companyKey}/brigadistas/${brigadistaKey}`).update({
        nome,
        cpf,
        funcao,
        dataInicio: dataInicio ? new Date(dataInicio).toISOString() : null,
        dataVencimento: dataVencimento ? new Date(dataVencimento).toISOString() : null
      });
      modal.remove();
      showNotification('Brigadista atualizado com sucesso!', 'success');
    } catch (error) {
      showNotification('Erro ao atualizar brigadista', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
  };
}

/* ========== BRIGADA - DELETAR MODAL ========== */
function deleteBrigadaModal(companyKey, brigadistaKey) {
  const brigadista = brigadaData[companyKey]?.brigadistas[brigadistaKey];
  if (!brigadista) return;

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.cssText = `
    display: flex !important;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
    border: 2px solid #B32117;
    border-radius: 12px;
    padding: 20px;
    max-width: 380px;
    width: 100%;
    text-align: center;
  `;

  modalContent.innerHTML = `
    <div style="width: 50px; height: 50px; background: rgba(179, 33, 23, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; color: #B32117;">
      <i class="fas fa-exclamation-triangle"></i>
    </div>

    <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">Confirmar Exclusão</h2>

    <p style="color: rgba(255, 255, 255, 0.5); margin: 0 0 6px 0; font-size: 12px;">Deseja remover:</p>

    <p style="color: #D4C29A; margin: 0 0 14px 0; font-size: 13px; font-weight: 600;">${brigadista.nome}</p>

    <div style="display: flex; gap: 8px;">
      <button 
        onclick="deleteBrigada('${companyKey}', '${brigadistaKey}'); this.closest('.modal').remove();"
        style="flex: 1; padding: 10px; background: linear-gradient(135deg, #B32117 0%, #8B1810 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
        onmouseover="this.style.filter='brightness(1.1)'"
        onmouseout="this.style.filter='brightness(1)'"
      >
        <i class="fas fa-trash"></i> Deletar
      </button>
      <button 
        onclick="this.closest('.modal').remove()"
        style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #ccc; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
        onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'"
        onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'"
      >
        Cancelar
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

/* ========== BRIGADA - DELETAR BRIGADISTA ========== */
async function deleteBrigada(companyKey, brigadistaKey) {
  try {
    await database.ref(`brigada/${companyKey}/brigadistas/${brigadistaKey}`).remove();
    showNotification('Brigadista removido com sucesso!', 'success');
  } catch (error) {
    showNotification('Erro ao remover brigadista', 'error');
  }
}


/* ========== BRIGADA - DOWNLOAD PDF ========== */
async function downloadBrigadaPDF(companyKey) {
  try {
    const companies = (await database.ref('companies').once('value')).val() || {};
    const company = companies[companyKey];
    const brigadistas = brigadaData[companyKey]?.brigadistas || {};

    if (!company) {
      showNotification('Empresa não encontrada', 'error');
      return;
    }

    const dataHoraCompleta = new Date().toLocaleString('pt-BR');
    const totalBrigadistas = Object.keys(brigadistas).length;

    if (totalBrigadistas === 0) {
      showNotification('Nenhum brigadista cadastrado', 'warning');
      return;
    }

    showNotification(`Iniciando geração do PDF da Brigada...`, 'info');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Dividir brigadistas em páginas (20 por página)
    const brigadistasArray = Object.entries(brigadistas).map(([k, b], idx) => ({
      numero: idx + 1,
      ...b
    }));

    const brigadistasPorPagina = 20;
    const totalPaginas = Math.ceil(brigadistasArray.length / brigadistasPorPagina);

    for (let paginaAtual = 0; paginaAtual < totalPaginas; paginaAtual++) {
      const inicio = paginaAtual * brigadistasPorPagina;
      const fim = inicio + brigadistasPorPagina;
      const brigadistasPagina = brigadistasArray.slice(inicio, fim);

      const paginaHTML = gerarPaginaBrigadistaListaHTML({
        company,
        brigadistas: brigadistasPagina,
        dataHoraCompleta,
        totalBrigadistas,
        paginaAtual: paginaAtual + 1,
        totalPaginas
      });

      await renderizarPaginaBrigadaNoPDF(pdf, paginaHTML, paginaAtual > 0);
    }

    const nomeEmpresaLimpo = company.razao_social.replace(/[^a-zA-Z0-9]/g, '_');
    const dataAtualFormatada = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Brigada_${nomeEmpresaLimpo}_${dataAtualFormatada}.pdf`;

    showNotification(`Baixando: ${company.razao_social}...`, 'info');
    pdf.save(nomeArquivo);

    showNotification(`PDF gerado com sucesso!`, 'success');

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    showNotification('❌ Erro ao gerar PDF: ' + error.message, 'error');
  }
}

function gerarPaginaBrigadistaListaHTML(opcoes) {
  const {
    company,
    brigadistas,
    dataHoraCompleta,
    totalBrigadistas,
    paginaAtual = 1,
    totalPaginas = 1
  } = opcoes;

  const dataVencimentoEmpresa = company.dataVencimento ? new Date(company.dataVencimento).toLocaleDateString('pt-BR') : 'S/ vencimento';

  // Gerar HTML dos brigadistas
  const brigadistasHTML = brigadistas.map(b => {
    const dataInicioBrigadista = b.dataInicio ? new Date(b.dataInicio).toLocaleDateString('pt-BR') : 'N/A';
    const dataVencimentoBrigadista = b.dataVencimento ? new Date(b.dataVencimento).toLocaleDateString('pt-BR') : 'S/ vencimento';
    return `
      <div class="brigadista-item">
        <div class="numero-badge">${b.numero}</div>
        <div class="brigadista-nome">${b.nome}</div>
        <div class="brigadista-funcao">${b.funcao}</div>
        <div class="detail-value">${b.cpf}</div>
        <div class="detail-value">${dataInicioBrigadista}</div>
        <div class="detail-value">${dataVencimentoBrigadista}</div>
      </div>
    `;
  }).join('');

  const empresaCardHTML = paginaAtual === 1 ? `
    <div class="empresa-card">
      <div class="empresa-card-header">
        <div class="empresa-icon"><i class="fas fa-building"></i></div>
        <div class="empresa-header-info">
          <div class="empresa-nome">${company.razao_social.toUpperCase()}</div>
          <div class="empresa-cnpj"><i class="fas fa-id-card"></i> ${company.cnpj}</div>
        </div>
      </div>
      <div class="empresa-card-grid">
        <div class="empresa-info-item">
          <div class="empresa-info-label"><i class="fas fa-map-marker-alt"></i>Endereço</div>
          <div class="empresa-info-value">${company.endereco || 'N/A'}</div>
        </div>
        <div class="empresa-info-item">
          <div class="empresa-info-label"><i class="fas fa-phone-alt"></i>Telefone</div>
          <div class="empresa-info-value">${company.telefone || 'N/A'}</div>
        </div>
        <div class="empresa-info-item">
          <div class="empresa-info-label"><i class="fas fa-user"></i>Responsável</div>
          <div class="empresa-info-value">${company.responsavel || 'N/A'}</div>
        </div>

      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; width: 100%; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; color: #1f2937; }
        
        .pdf-page { width: 210mm; height: 297mm; background: white; display: flex; flex-direction: column; }
        
        /* HEADER */
        .pdf-header { background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); color: white; padding: 16px 25px; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; }
        .header-title { text-align: center; flex: 1; }
        .header-title h1 { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
        .header-title h2 { font-size: 12px; font-weight: 600; opacity: 0.95; }
        .header-divider { height: 1px; background: rgba(255,255,255,0.3); margin: 8px 0; }
        .header-info { display: flex; align-items: center; font-size: 10px; gap: 20px; padding-top: 8px; }
        .header-info-left { display: flex; gap: 20px; align-items: center; }
        .header-info-item { display: flex; align-items: center; gap: 5px; white-space: nowrap; }

        /* BODY */
        .pdf-body { flex: 1; padding: 18px 25px; overflow-y: auto; }

        /* Card Empresa */
        .empresa-card { background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%); border-left: 5px solid #6b7280; border-radius: 10px; padding: 14px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
        .empresa-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .empresa-icon { background: #6b7280; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .empresa-header-info { flex: 1; }
        .empresa-nome { font-size: 14px; font-weight: 800; color: #1f2937; margin-bottom: 2px; }
        .empresa-cnpj { font-size: 10px; color: #6b7280; font-weight: 600; }

        .empresa-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        .empresa-info-item { font-size: 9px; }
        .empresa-info-label { color: #9ca3af; font-weight: 600; margin-bottom: 1px; display: flex; align-items: center; gap: 4px; }
        .empresa-info-value { color: #1f2937; font-weight: 600; font-size: 9px; }

        /* Lista de Brigadistas */
        .brigadistas-section { }
        .section-titulo { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; padding: 11px 14px; border-radius: 8px 8px 0 0; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 8px; text-align: center; justify-content: center; }
        
        .brigadistas-header { background: linear-gradient(135deg, #b32117 0%, #dc2626 100%); color: white; padding: 10px 12px; display: grid; grid-template-columns: 25px 1.3fr 1fr 0.85fr 0.8fr 0.8fr; gap: 8px; align-items: center; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
        .header-col { text-align: center; }
        
        .brigadistas-list { background: white; border: 2px solid #b32117; border-top: none; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); overflow: hidden; }
        
        .brigadista-item { 
          padding: 7px 12px;
          border-bottom: 1px solid #e5e7eb;
          display: grid;
          grid-template-columns: 25px 1.3fr 1fr 0.85fr 0.8fr 0.8fr;
          gap: 8px;
          align-items: center;
          font-size: 8px;
        }
        .brigadista-item:last-child { border-bottom: none; }
        
        .numero-badge { color: #1f2937; font-weight: 700; font-size: 9px; text-align: center; }
        .brigadista-nome { font-weight: 700; color: #1f2937; text-align: center; }
        .brigadista-funcao { color: #6b7280; font-weight: 600; text-align: center; font-size: 7.5px; }
        
        .detail-value { color: #1f2937; font-weight: 600; font-size: 8px; text-align: center; }

        /* Numeração de Páginas */
        .page-number { font-size: 8px; color: #9ca3af; text-align: center; }

        /* FOOTER */
        .pdf-footer { padding: 12px 25px; border-top: 2px solid #6b7280; text-align: center; background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%); }
        .footer-brand { font-size: 12px; font-weight: 800; color: #b32117; margin-bottom: 4px; }
        .footer-info { font-size: 8px; color: #6b7280; margin-bottom: 2px; }
        .footer-timestamp { font-size: 8px; color: #9ca3af; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <div class="pdf-header">
          <div class="header-top">
            <div class="logo-text">EXTINMAIS</div>
            <div class="header-title">
              <h1><i class="fas fa-users"></i> RELAÇÃO DE BRIGADISTAS</h1>
              <h2>Lista Completa</h2>
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
          </div>
        </div>

        <div class="pdf-body">
          ${empresaCardHTML}

          <div class="brigadistas-section">
            <div class="section-titulo">
              <i class="fas fa-list"></i> Brigadistas (${totalBrigadistas}) - Página ${paginaAtual}/${totalPaginas}
            </div>
            <div class="brigadistas-header">
              <div class="header-col">#</div>
              <div class="header-col">Nome</div>
              <div class="header-col">Função</div>
              <div class="header-col">CPF</div>
              <div class="header-col">Início</div>
              <div class="header-col">Vencimento</div>
            </div>
            <div class="brigadistas-list">
              ${brigadistasHTML}
            </div>
          </div>
        </div>

        <div class="pdf-footer">
          <div class="footer-brand"><i class="fas fa-fire-extinguisher"></i> EXTINMAIS</div>
          <div class="footer-info">CNPJ: 52.026.476/0001-03 | Tel: (15) 99137-1232 | Email: extinmaiss@outlook.com | ${totalBrigadistas} Brigadista(s)</div>
          <div class="footer-timestamp">Documento gerado em ${dataHoraCompleta} | Página ${paginaAtual}/${totalPaginas}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function renderizarPaginaBrigadaNoPDF(pdf, htmlString, isNovaPagem = false) {
  return new Promise((resolve, reject) => {
    if (isNovaPagem) {
      pdf.addPage();
    }

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





/* ========== BRIGADA - INICIALIZAR ========== */
window.addEventListener('load', initBrigada);

