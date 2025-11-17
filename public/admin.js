// Admin Panel JavaScript
let currentEditUser = null;
let currentDeleteUser = null;
let selectedRoleId = null;
let allRoles = [];
let allPermissions = [];

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    // Admin yetkisi kontrolü
    const sessionCheck = await fetch('/api/auth/session', { credentials: 'include' });
    const sessionData = await sessionCheck.json();
    
    if (!sessionData.authenticated || sessionData.user.role !== 'admin') {
        showMessage('Bu sayfaya erişim yetkiniz yok', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }

    // Verileri yükle
    await loadStats();
    await loadRoles();
    await loadPermissions();
    await loadUsers();

    // Event listener'ları ayarla
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Tab değiştirme
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });

    // Form submit
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordSubmit);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Tab değiştirme
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// İstatistikleri yükle
async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats', { credentials: 'include' });
        const result = await response.json();

        if (result.success) {
            document.getElementById('totalUsers').textContent = result.data.total_users;
            document.getElementById('totalRoles').textContent = result.data.total_roles;
            document.getElementById('totalPermissions').textContent = result.data.total_permissions;
        }
    } catch (error) {
        console.error('İstatistik yükleme hatası:', error);
    }
}

// Rolleri yükle
async function loadRoles() {
    try {
        const response = await fetch('/api/admin/roles', { credentials: 'include' });
        const result = await response.json();

        if (result.success) {
            allRoles = result.data;
            
            // Rol dropdown'unu doldur
            const roleSelect = document.getElementById('roleId');
            roleSelect.innerHTML = '<option value="">Seçiniz...</option>';
            result.data.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = `${role.rol_adi} - ${role.aciklama}`;
                roleSelect.appendChild(option);
            });

            // Rol listesini göster
            displayRolesList(result.data);
        }
    } catch (error) {
        console.error('Rol yükleme hatası:', error);
    }
}

// İzinleri yükle
async function loadPermissions() {
    try {
        const response = await fetch('/api/admin/permissions', { credentials: 'include' });
        const result = await response.json();

        if (result.success) {
            allPermissions = result.data;
        }
    } catch (error) {
        console.error('İzin yükleme hatası:', error);
    }
}

// Kullanıcıları yükle
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', { credentials: 'include' });
        const result = await response.json();

        if (result.success) {
            displayUsers(result.data);
        }
    } catch (error) {
        console.error('Kullanıcı yükleme hatası:', error);
        showMessage('Kullanıcılar yüklenemedi', 'error');
    }
}

// Kullanıcıları göster
function displayUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${user.kullanici_adi}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${user.tam_ad}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${user.eposta || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.roles?.rol_adi)}">
                    ${user.roles?.rol_adi || 'Rol Yok'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.aktif ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${user.son_giris ? new Date(user.son_giris).toLocaleDateString('tr-TR') : '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="editUser(${user.id})" class="text-blue-600 hover:text-blue-900">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="changeUserPassword(${user.id}, '${user.kullanici_adi}')" class="text-purple-600 hover:text-purple-900">
                    <i class="fas fa-key"></i>
                </button>
                <button onclick="deleteUser(${user.id}, '${user.kullanici_adi}')" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Rol badge class
function getRoleBadgeClass(role) {
    switch(role) {
        case 'admin': return 'bg-red-100 text-red-800';
        case 'president': return 'bg-purple-100 text-purple-800';
        case 'principal': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Rolleri göster
function displayRolesList(roles) {
    const container = document.getElementById('rolesList');
    container.innerHTML = '';

    roles.forEach(role => {
        const div = document.createElement('div');
        div.className = `p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition ${selectedRoleId === role.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200'}`;
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-semibold text-gray-900">${role.rol_adi}</h4>
                    <p class="text-sm text-gray-600">${role.aciklama}</p>
                </div>
                <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
        `;
        div.onclick = () => selectRole(role.id, role.rol_adi);
        container.appendChild(div);
    });
}

// Rol seç
async function selectRole(roleId, roleName) {
    selectedRoleId = roleId;
    displayRolesList(allRoles);
    
    document.getElementById('selectedRoleName').textContent = `${roleName} Rolünün İzinleri`;
    
    try {
        const response = await fetch(`/api/admin/roles/${roleId}/permissions`, { credentials: 'include' });
        const result = await response.json();

        if (result.success) {
            displayRolePermissions(result.data);
        }
    } catch (error) {
        console.error('Rol izinleri yükleme hatası:', error);
    }
}

// Rol izinlerini göster
function displayRolePermissions(rolePermissions) {
    const container = document.getElementById('rolePermissions');
    container.innerHTML = '';

    // İzinleri kategoriye göre grupla
    const grouped = {};
    allPermissions.forEach(perm => {
        if (!grouped[perm.kategori]) {
            grouped[perm.kategori] = [];
        }
        grouped[perm.kategori].push(perm);
    });

    // Her kategori için göster
    Object.keys(grouped).forEach(kategori => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-4';
        categoryDiv.innerHTML = `<h4 class="font-medium text-gray-700 mb-2 capitalize">${kategori}</h4>`;
        
        const permList = document.createElement('div');
        permList.className = 'space-y-1 pl-4';

        grouped[kategori].forEach(perm => {
            const hasPermission = rolePermissions.some(rp => rp.id === perm.id);
            const permDiv = document.createElement('div');
            permDiv.className = 'flex items-center text-sm';
            permDiv.innerHTML = `
                <input 
                    type="checkbox" 
                    id="perm-${perm.id}" 
                    ${hasPermission ? 'checked' : ''}
                    onchange="toggleRolePermission(${selectedRoleId}, ${perm.id}, this.checked)"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="perm-${perm.id}" class="ml-2 text-gray-700">
                    ${perm.aciklama || perm.izin_adi}
                </label>
            `;
            permList.appendChild(permDiv);
        });

        categoryDiv.appendChild(permList);
        container.appendChild(categoryDiv);
    });
}

// Rol izni değiştir
async function toggleRolePermission(roleId, permissionId, checked) {
    try {
        let response;
        if (checked) {
            // İzin ekle
            response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ izin_id: permissionId })
            });
        } else {
            // İzin kaldır
            response = await fetch(`/api/admin/roles/${roleId}/permissions/${permissionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
        }

        const result = await response.json();
        if (result.success) {
            showMessage(result.message, 'success');
        } else {
            showMessage(result.message || 'İşlem başarısız', 'error');
            // Checkbox'ı geri döndür
            document.getElementById(`perm-${permissionId}`).checked = !checked;
        }
    } catch (error) {
        console.error('İzin değiştirme hatası:', error);
        showMessage('İzin değiştirilemedi', 'error');
        // Checkbox'ı geri döndür
        document.getElementById(`perm-${permissionId}`).checked = !checked;
    }
}

// Kullanıcı modal göster
function showAddUserModal() {
    currentEditUser = null;
    document.getElementById('userModalTitle').textContent = 'Yeni Kullanıcı Ekle';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordField').style.display = 'block';
    document.getElementById('password').required = true;
    document.getElementById('userModal').classList.remove('hidden');
    document.getElementById('userModal').classList.add('flex');
}

function hideUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    document.getElementById('userModal').classList.remove('flex');
}

// Kullanıcı düzenle
async function editUser(userId) {
    try {
        const response = await fetch('/api/admin/users', { credentials: 'include' });
        const result = await response.json();

        if (result.success) {
            const user = result.data.find(u => u.id === userId);
            if (user) {
                currentEditUser = user;
                document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle';
                document.getElementById('userId').value = user.id;
                document.getElementById('username').value = user.kullanici_adi;
                document.getElementById('firstName').value = user.tam_ad;
                document.getElementById('email').value = user.eposta || '';
                document.getElementById('roleId').value = user.roles?.id || '';
                document.getElementById('aktif').checked = user.aktif;
                document.getElementById('passwordField').style.display = 'none';
                document.getElementById('password').required = false;
                document.getElementById('userModal').classList.remove('hidden');
                document.getElementById('userModal').classList.add('flex');
            }
        }
    } catch (error) {
        console.error('Kullanıcı yükleme hatası:', error);
        showMessage('Kullanıcı bilgileri yüklenemedi', 'error');
    }
}

// Kullanıcı form submit
async function handleUserSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const formData = {
        kullanici_adi: document.getElementById('username').value.trim(),
        tam_ad: document.getElementById('firstName').value.trim(),
        eposta: document.getElementById('email').value.trim() || null,
        rol_id: parseInt(document.getElementById('roleId').value),
        aktif: document.getElementById('aktif').checked
    };

    if (!userId) {
        // Yeni kullanıcı
        formData.sifre = document.getElementById('password').value;
    }

    try {
        const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
        const method = userId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            hideUserModal();
            await loadUsers();
            await loadStats();
        } else {
            showMessage(result.message || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Kullanıcı kaydetme hatası:', error);
        showMessage('Kullanıcı kaydedilemedi', 'error');
    }
}

// Şifre değiştirme modalını göster
function changeUserPassword(userId, username) {
    document.getElementById('passwordUserId').value = userId;
    document.getElementById('passwordUserName').textContent = `Kullanıcı: ${username}`;
    document.getElementById('newPassword').value = '';
    document.getElementById('passwordModal').classList.remove('hidden');
    document.getElementById('passwordModal').classList.add('flex');
}

function hidePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
    document.getElementById('passwordModal').classList.remove('flex');
}

// Şifre değiştirme
async function handlePasswordSubmit(e) {
    e.preventDefault();

    const userId = document.getElementById('passwordUserId').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const response = await fetch(`/api/admin/users/${userId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ yeni_sifre: newPassword })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            hidePasswordModal();
        } else {
            showMessage(result.message || 'Şifre değiştirilemedi', 'error');
        }
    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        showMessage('Şifre değiştirilemedi', 'error');
    }
}

// Kullanıcı sil
function deleteUser(userId, username) {
    currentDeleteUser = userId;
    document.getElementById('userToDelete').textContent = username;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
    
    document.getElementById('confirmDeleteButton').onclick = async () => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                showMessage(result.message, 'success');
                hideDeleteModal();
                await loadUsers();
                await loadStats();
            } else {
                showMessage(result.message || 'Kullanıcı silinemedi', 'error');
            }
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            showMessage('Kullanıcı silinemedi', 'error');
        }
    };
}

function hideDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
}

// Logout
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            localStorage.removeItem('isLoggedIn');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/login.html';
    }
}

// Mesaj göster
function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    messageDiv.className = `${bgColor} text-white px-6 py-4 rounded-lg shadow-lg mb-4 flex items-center justify-between`;
    messageDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}
