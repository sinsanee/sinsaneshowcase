# Admin.html JavaScript Additions

Add these JavaScript functions to your existing <script> section in admin.html:

## 1. ADD GLOBAL VARIABLES (at the top of your script section)

```javascript
let loadoutItems = [];
let users = [];
let changelogEntries = [];
let selectedUsers = new Set();
let loadoutScreenshots = [];
```

## 2. UPDATE checkAuth() function

Add these lines after `loadPosts();`:

```javascript
loadLoadoutItems();
loadUsers();
loadChangelog();
```

## 3. ADD LOADOUT MANAGEMENT FUNCTIONS

```javascript
// ==================== LOADOUT ITEMS ====================
async function loadLoadoutItems() {
    try {
        const response = await fetch('/api/admin/loadout');
        const data = await response.json();
        loadoutItems = data.items || [];
        renderLoadoutItems();
    } catch (error) {
        console.error('Failed to load loadout items:', error);
    }
}

function renderLoadoutItems() {
    const tbody = document.getElementById('loadout-table-body');
    if (loadoutItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No loadout items yet.</td></tr>';
        return;
    }
    tbody.innerHTML = loadoutItems.map(item => `
        <tr>
            <td><strong>${escapeHtml(item.weapon_name)}</strong></td>
            <td>${escapeHtml(item.skin_name)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td><span style="color: ${item.side === 't' ? '#F4A460' : item.side === 'ct' ? '#5B9BD5' : '#666'}">${item.side.toUpperCase()}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editLoadout(${item.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteLoadout(${item.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddLoadoutModal() {
    document.getElementById('loadout-modal-title').textContent = 'Add New Loadout Item';
    document.getElementById('loadout-form').reset();
    document.getElementById('loadout-id').value = '';
    loadoutScreenshots = [];
    renderLoadoutScreenshots();
    document.getElementById('loadout-modal').classList.add('active');
}

function editLoadout(id) {
    const item = loadoutItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('loadout-modal-title').textContent = 'Edit Loadout Item';
    document.getElementById('loadout-id').value = item.id;
    document.getElementById('loadout-weapon').value = item.weapon_name;
    document.getElementById('loadout-skin').value = item.skin_name;
    document.getElementById('loadout-category').value = item.category;
    document.getElementById('loadout-side').value = item.side;
    document.getElementById('loadout-float').value = item.float_value || '';
    document.getElementById('loadout-stattrak').checked = item.stattrak === 1;
    document.getElementById('loadout-description').value = item.description || '';
    loadoutScreenshots = item.screenshots || [];
    renderLoadoutScreenshots();
    document.getElementById('loadout-modal').classList.add('active');
}

async function deleteLoadout(id) {
    if (!confirm('Delete this loadout item?')) return;
    try {
        const response = await fetch(`/api/admin/loadout/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Loadout item deleted!');
            loadLoadoutItems();
        } else {
            alert('Failed to delete item');
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
}

function closeLoadoutModal() {
    document.getElementById('loadout-modal').classList.remove('active');
    document.getElementById('loadout-form-error').classList.remove('show');
}

function renderLoadoutScreenshots() {
    const container = document.getElementById('loadout-screenshots');
    container.innerHTML = loadoutScreenshots.map((path, index) => `
        <div class="screenshot-item">
            <img src="/${path}" alt="Screenshot ${index + 1}">
            <button type="button" class="screenshot-remove" onclick="removeScreenshot(${index})">&times;</button>
        </div>
    `).join('');
}

function removeScreenshot(index) {
    loadoutScreenshots.splice(index, 1);
    renderLoadoutScreenshots();
}

document.getElementById('loadout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        weapon_name: document.getElementById('loadout-weapon').value,
        skin_name: document.getElementById('loadout-skin').value,
        category: document.getElementById('loadout-category').value,
        side: document.getElementById('loadout-side').value,
        description: document.getElementById('loadout-description').value,
        float_value: document.getElementById('loadout-float').value,
        stattrak: document.getElementById('loadout-stattrak').checked,
        screenshots: loadoutScreenshots
    };
    const itemId = document.getElementById('loadout-id').value;
    const url = itemId ? `/api/admin/loadout/${itemId}` : '/api/admin/loadout';
    const method = itemId ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (response.ok) {
            alert(itemId ? 'Loadout item updated!' : 'Loadout item created!');
            closeLoadoutModal();
            loadLoadoutItems();
        } else {
            const data = await response.json();
            showError('loadout-form-error', data.error || 'Failed to save item');
        }
    } catch (error) {
        console.error('Submit failed:', error);
        showError('loadout-form-error', 'Network error');
    }
});
```

## 4. ADD USER MANAGEMENT FUNCTIONS

```javascript
// ==================== USER MANAGEMENT ====================
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        users = data.users || [];
        renderUsers();
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function renderUsers() {
    const tbody = document.getElementById('users-table-body');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No users yet.</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(user => `
        <tr>
            <td><input type="checkbox" class="select-checkbox user-checkbox" data-user-id="${user.id}"></td>
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td>${user.is_admin ? 'Yes' : 'No'}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateUserSelection);
    });
}

function updateUserSelection() {
    selectedUsers.clear();
    document.querySelectorAll('.user-checkbox:checked').forEach(checkbox => {
        selectedUsers.add(parseInt(checkbox.dataset.userId));
    });
    const bulkBtn = document.getElementById('bulk-delete-btn');
    if (selectedUsers.size > 0) {
        bulkBtn.classList.add('show');
    } else {
        bulkBtn.classList.remove('show');
    }
}

document.getElementById('select-all-users').addEventListener('change', function() {
    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.checked = this.checked;
    });
    updateUserSelection();
});

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-modal').classList.add('active');
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
        const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('User deleted!');
            loadUsers();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
}

async function bulkDeleteUsers() {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Delete ${selectedUsers.size} user(s)?`)) return;
    try {
        const response = await fetch('/api/admin/users/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: Array.from(selectedUsers) })
        });
        if (response.ok) {
            const data = await response.json();
            alert(data.message);
            selectedUsers.clear();
            loadUsers();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete users');
        }
    } catch (error) {
        console.error('Bulk delete failed:', error);
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    document.getElementById('user-form-error').classList.remove('show');
}

document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('user-id').value;
    const formData = {
        username: document.getElementById('user-username').value
    };
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (response.ok) {
            alert('User updated!');
            closeUserModal();
            loadUsers();
        } else {
            const data = await response.json();
            showError('user-form-error', data.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Submit failed:', error);
        showError('user-form-error', 'Network error');
    }
});
```

## 5. ADD CHANGELOG FUNCTIONS

```javascript
// ==================== CHANGELOG ====================
async function loadChangelog() {
    try {
        const response = await fetch('/api/admin/changelog');
        const data = await response.json();
        changelogEntries = data.entries || [];
        renderChangelog();
    } catch (error) {
        console.error('Failed to load changelog:', error);
    }
}

function renderChangelog() {
    const tbody = document.getElementById('changelog-table-body');
    if (changelogEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No changelog entries yet.</td></tr>';
        return;
    }
    tbody.innerHTML = changelogEntries.map(entry => `
        <tr>
            <td><strong>${escapeHtml(entry.version)}</strong></td>
            <td>${new Date(entry.date).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editChangelog(${entry.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteChangelog(${entry.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddChangelogModal() {
    document.getElementById('changelog-modal-title').textContent = 'Add New Changelog';
    document.getElementById('changelog-form').reset();
    document.getElementById('changelog-id').value = '';
    document.getElementById('changelog-date').valueAsDate = new Date();
    document.getElementById('changelog-modal').classList.add('active');
}

function editChangelog(id) {
    const entry = changelogEntries.find(e => e.id === id);
    if (!entry) return;
    document.getElementById('changelog-modal-title').textContent = 'Edit Changelog';
    document.getElementById('changelog-id').value = entry.id;
    document.getElementById('changelog-version').value = entry.version;
    document.getElementById('changelog-date').value = entry.date;
    document.getElementById('changelog-added').value = entry.added || '';
    document.getElementById('changelog-changed').value = entry.changed || '';
    document.getElementById('changelog-fixed').value = entry.fixed || '';
    document.getElementById('changelog-removed').value = entry.removed || '';
    document.getElementById('changelog-modal').classList.add('active');
}

async function deleteChangelog(id) {
    if (!confirm('Delete this changelog entry?')) return;
    try {
        const response = await fetch(`/api/admin/changelog/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('Changelog entry deleted!');
            loadChangelog();
        } else {
            alert('Failed to delete entry');
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
}

function closeChangelogModal() {
    document.getElementById('changelog-modal').classList.remove('active');
    document.getElementById('changelog-form-error').classList.remove('show');
}

document.getElementById('changelog-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        version: document.getElementById('changelog-version').value,
        date: document.getElementById('changelog-date').value,
        added: document.getElementById('changelog-added').value,
        changed: document.getElementById('changelog-changed').value,
        fixed: document.getElementById('changelog-fixed').value,
        removed: document.getElementById('changelog-removed').value
    };
    const entryId = document.getElementById('changelog-id').value;
    const url = entryId ? `/api/admin/changelog/${entryId}` : '/api/admin/changelog';
    const method = entryId ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (response.ok) {
            alert(entryId ? 'Changelog updated!' : 'Changelog created!');
            closeChangelogModal();
            loadChangelog();
        } else {
            const data = await response.json();
            showError('changelog-form-error', data.error || 'Failed to save changelog');
        }
    } catch (error) {
        console.error('Submit failed:', error);
        showError('changelog-form-error', 'Network error');
    }
});
```

## 6. ADD FILE UPLOAD FUNCTIONS

```javascript
// ==================== FILE UPLOAD ====================
function setupFileUpload(uploadAreaId, fileInputId, uploadType, callback) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files, uploadType, callback);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files, uploadType, callback);
        }
    });
}

async function handleFileUpload(files, uploadType, callback) {
    const file = files[0];
    const formData = new FormData();
    formData.append('image', file);
    formData.append('uploadType', uploadType);
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            callback(data.path);
        } else {
            alert('Failed to upload file');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        alert('Network error during upload');
    }
}

async function handleMultipleFileUpload(files, uploadType, callback) {
    for (let file of files) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('uploadType', uploadType);
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                const data = await response.json();
                callback(data.path);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }
    }
}

// Setup file uploads - call this at the end of your script
setupFileUpload('post-thumbnail-upload', 'post-thumbnail-file', 'article', (path) => {
    document.getElementById('post-thumbnail').value = path;
    document.getElementById('post-thumbnail-preview').innerHTML = 
        `<div class="uploaded-file">Uploaded: ${path}</div>`;
});

setupFileUpload('loadout-screenshot-upload', 'loadout-screenshot-file', 'skin', (path) => {
    loadoutScreenshots.push(path);
    renderLoadoutScreenshots();
});

document.getElementById('loadout-screenshot-file').addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        await handleMultipleFileUpload(e.target.files, 'skin', (path) => {
            loadoutScreenshots.push(path);
            renderLoadoutScreenshots();
        });
    }
});
```

## 7. ADD UTILITY FUNCTION

```javascript
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

That's all the JavaScript you need to add!
