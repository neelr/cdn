// Login page HTML
export function loginPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cdn.</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
    input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; }
    button { width: 100%; padding: 10px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #333; }
    .error { color: red; display: none; }
  </style>
</head>
<body>
    <h1>cdn.</h1>
  <input type="password" id="token" placeholder="enter token">
  <button onclick="login()">login</button>
  <p class="error" id="error">invalid token</p>
  <script>
    // Redirect if already logged in
    if (localStorage.getItem('token')) {
      window.location.href = '/dash';
    }
    async function login() {
      const token = document.getElementById('token').value;
      const res = await fetch('/api/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', token);
        localStorage.setItem('isAdmin', data.isAdmin ? '1' : '0');
        window.location.href = '/dash';
      } else {
        document.getElementById('error').style.display = 'block';
      }
    }
    document.getElementById('token').addEventListener('keypress', e => {
      if (e.key === 'Enter') login();
    });
  </script>
</body>
</html>`;
}

// Dashboard page HTML
export function dashboardPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>dash.</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; }
    .filename { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
    input[type="file"] { margin: 10px 0; }
    select { padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin-right: 10px; }
    button { padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #333; }
    button:disabled { background: #ccc; }
    .upload-section { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    a { color: #0066cc; }
    .logout { float: right; background: #666; }
    .admin-btn { float: right; background: #0066cc; margin-right: 10px; display: none; }
    .admin-btn:hover { background: #0052a3; }
    .empty { color: #666; font-style: italic; }
    .delete-btn { padding: 5px 10px; background: #c00; font-size: 12px; }
    .delete-btn:hover { background: #900; }
    .edit-btn { padding: 5px 10px; background: #666; font-size: 12px; margin-right: 5px; }
    .edit-btn:hover { background: #444; }
    .filename-cell { display: flex; align-items: center; gap: 8px; }
    .filename-input { flex: 1; padding: 4px 8px; border: 1px solid #0066cc; border-radius: 4px; font-size: 14px; }
    .save-btn { padding: 5px 10px; background: #28a745; font-size: 12px; }
    .save-btn:hover { background: #218838; }
    .cancel-btn { padding: 5px 10px; background: #666; font-size: 12px; }
    .cancel-btn:hover { background: #444; }
    #search { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 14px; }
    footer a { color: #666; }
    .upload-success { font-family: monospace; background: #e0ffe0; padding: 10px; border-radius: 4px; margin-top: 10px; word-break: break-all; display: none; }
    .upload-success a { color: #0066cc; }
    .copy-btn { padding: 5px 10px; margin-left: 10px; font-size: 12px; background: #28a745; }
    .copy-btn:hover { background: #218838; }
  </style>
</head>
<body>
  <button class="logout" onclick="logout()">logout</button>
  <button class="admin-btn" id="adminBtn" onclick="window.location.href='/admin'">admin</button>
    <h1>cdn.</h1>

  <div class="upload-section">
    <input type="file" id="file">
    <select id="expiry">
      <option value="">never expires</option>
      <option value="3600000">1 hour</option>
      <option value="86400000">1 day</option>
      <option value="604800000">7 days</option>
      <option value="2592000000">30 days</option>
    </select>
    <button onclick="upload()" id="uploadBtn">upload</button>
    <div class="progress-container" id="progressContainer" style="display: none; margin-top: 10px;">
      <div style="background: #eee; border-radius: 4px; height: 20px; overflow: hidden;">
        <div id="progressBar" style="background: #4caf50; height: 100%; width: 0%; transition: width 0.3s;"></div>
      </div>
      <div id="progressText" style="text-align: center; margin-top: 5px; font-size: 14px;">0%</div>
    </div>
    <div class="upload-success" id="uploadSuccess"></div>
  </div>

  <input type="text" id="search" placeholder="search files..." oninput="filterFiles()">

  <table>
    <thead>
      <tr>
        <th>name</th>
        <th>size</th>
        <th>uploaded</th>
        <th>expires</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="files"></tbody>
  </table>

  <script>
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/';

    // Show admin button if user is admin
    if (localStorage.getItem('isAdmin') === '1') {
      document.getElementById('adminBtn').style.display = 'block';
    }

    let allFiles = [];

    async function loadFiles() {
      const res = await fetch('/api/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) {
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      allFiles = data.files;
      renderFiles(allFiles);
    }

    function filterFiles() {
      const query = document.getElementById('search').value.toLowerCase();
      const filtered = allFiles.filter(f => f.originalName.toLowerCase().includes(query));
      renderFiles(filtered, query.length > 0);
    }

    function renderFiles(files, isFiltered = false) {
      const tbody = document.getElementById('files');
      if (files.length === 0) {
        const msg = isFiltered ? 'no matching files' : 'no files uploaded yet';
        tbody.innerHTML = '<tr><td colspan="5" class="empty">' + msg + '</td></tr>';
        return;
      }
      tbody.innerHTML = files.map(f => \`
        <tr data-key="\${f.url.substring(1)}">
          <td class="filename-cell" data-original="\${escapeHtml(f.originalName)}">
            <a href="\${f.url}" target="_blank" class="filename" title="\${escapeHtml(f.originalName)}">\${escapeHtml(f.originalName)}</a>
            <button class="edit-btn" onclick="startEdit(this)" title="edit name">✎</button>
          </td>
          <td>\${formatSize(f.size)}</td>
          <td>\${new Date(f.uploaded).toLocaleString()}</td>
          <td>\${f.expires ? new Date(f.expires).toLocaleString() : 'never'}</td>
          <td><button class="delete-btn" onclick="deleteFile('\${f.url}')">✕</button></td>
        </tr>
      \`).join('');
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function startEdit(btn) {
      const cell = btn.closest('.filename-cell');
      const originalName = cell.dataset.original;
      const key = btn.closest('tr').dataset.key;
      cell.innerHTML = \`
        <input type="text" class="filename-input" value="\${escapeHtml(originalName)}" onkeydown="handleEditKey(event, this)">
        <button class="save-btn" onclick="saveEdit(this)">✓</button>
        <button class="cancel-btn" onclick="cancelEdit(this, '\${escapeHtml(originalName)}')">✕</button>
      \`;
      cell.querySelector('.filename-input').focus();
      cell.querySelector('.filename-input').select();
    }

    function handleEditKey(event, input) {
      if (event.key === 'Enter') {
        saveEdit(input);
      } else if (event.key === 'Escape') {
        const cell = input.closest('.filename-cell');
        cancelEdit(input, cell.dataset.original);
      }
    }

    function cancelEdit(el, originalName) {
      const cell = el.closest('.filename-cell');
      const key = el.closest('tr').dataset.key;
      cell.innerHTML = \`
        <a href="/\${key}" target="_blank" class="filename" title="\${escapeHtml(originalName)}">\${escapeHtml(originalName)}</a>
        <button class="edit-btn" onclick="startEdit(this)" title="edit name">✎</button>
      \`;
    }

    async function saveEdit(el) {
      const cell = el.closest('.filename-cell');
      const input = cell.querySelector('.filename-input');
      const newName = input.value.trim();
      const originalName = cell.dataset.original;
      const key = el.closest('tr').dataset.key;

      if (!newName) {
        alert('name cannot be empty');
        return;
      }

      if (newName === originalName) {
        cancelEdit(el, originalName);
        return;
      }

      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, key, newName })
      });
      const data = await res.json();

      if (data.success) {
        cell.dataset.original = newName;
        // Update in allFiles array
        const file = allFiles.find(f => f.url === '/' + key);
        if (file) file.originalName = newName;
        cancelEdit(el, newName);
      } else {
        alert('rename failed: ' + data.error);
      }
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks (below 100MB Worker limit)

    function updateProgress(percent, text) {
      document.getElementById('progressContainer').style.display = 'block';
      document.getElementById('progressBar').style.width = percent + '%';
      document.getElementById('progressText').textContent = text || percent + '%';
    }

    function hideProgress() {
      document.getElementById('progressContainer').style.display = 'none';
      document.getElementById('progressBar').style.width = '0%';
    }

    async function upload() {
      const file = document.getElementById('file').files[0];
      if (!file) return alert('select a file');

      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      const expiry = document.getElementById('expiry').value;

      // Use multipart upload for files > 50MB
      if (file.size > CHUNK_SIZE) {
        btn.textContent = 'initializing...';
        try {
          await multipartUpload(file, expiry);
        } catch (err) {
          hideProgress();
          btn.disabled = false;
          btn.textContent = 'upload';
          alert('upload failed: ' + err.message);
          return;
        }
      } else {
        btn.textContent = 'uploading...';
        const formData = new FormData();
        formData.append('token', token);
        formData.append('file', file);
        if (expiry) formData.append('expiry', expiry);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        btn.disabled = false;
        btn.textContent = 'upload';

        if (data.success) {
          document.getElementById('file').value = '';
          const fullUrl = window.location.origin + data.url;
          const successDiv = document.getElementById('uploadSuccess');
          successDiv.innerHTML = \`<a href="\${data.url}" target="_blank">\${fullUrl}</a><button class="copy-btn" onclick="copyLink('\${fullUrl}', this)">copy</button>\`;
          successDiv.style.display = 'block';
          loadFiles();
        } else {
          alert('upload failed: ' + data.error);
        }
        return;
      }

      btn.disabled = false;
      btn.textContent = 'upload';
    }

    async function multipartUpload(file, expiry) {
      // Initialize multipart upload
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size
        })
      });
      const initData = await initRes.json();
      if (!initData.success) throw new Error(initData.error);

      const { uploadId, key } = initData;
      const parts = [];
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      updateProgress(0, 'uploading 0/' + totalChunks + ' chunks');

      try {
        // Upload each chunk
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          const partNumber = i + 1;

          const partRes = await fetch('/api/upload/part', {
            method: 'POST',
            headers: {
              'X-Token': token,
              'X-Upload-Id': uploadId,
              'X-Upload-Key': key,
              'X-Part-Number': partNumber.toString()
            },
            body: chunk
          });
          const partData = await partRes.json();
          if (!partData.success) throw new Error(partData.error);

          parts.push({ partNumber: partData.partNumber, etag: partData.etag });

          const percent = Math.round(((i + 1) / totalChunks) * 100);
          updateProgress(percent, 'uploading ' + (i + 1) + '/' + totalChunks + ' chunks');
        }

        // Complete the upload
        updateProgress(100, 'finalizing...');
        const completeRes = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            uploadId,
            key,
            parts,
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            expiry
          })
        });
        const completeData = await completeRes.json();
        if (!completeData.success) throw new Error(completeData.error);

        hideProgress();
        document.getElementById('file').value = '';
        const fullUrl = window.location.origin + completeData.url;
        const successDiv = document.getElementById('uploadSuccess');
        successDiv.innerHTML = \`<a href="\${completeData.url}" target="_blank">\${fullUrl}</a><button class="copy-btn" onclick="copyLink('\${fullUrl}', this)">copy</button>\`;
        successDiv.style.display = 'block';
        loadFiles();

      } catch (err) {
        // Abort the upload on error
        await fetch('/api/upload/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, uploadId, key })
        }).catch(() => {});
        throw err;
      }
    }

    async function deleteFile(url) {
      if (!confirm('delete this file? this cannot be undone.')) return;
      const key = url.substring(1); // remove leading /
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, key })
      });
      const data = await res.json();
      if (data.success) {
        loadFiles();
      } else {
        alert('delete failed: ' + data.error);
      }
    }

    function copyLink(url, btn) {
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = 'copied!';
        setTimeout(() => btn.textContent = 'copy', 2000);
      });
    }

    function logout() {
      localStorage.clear();
      window.location.href = '/';
    }

    loadFiles();
  </script>
  <footer><a href="/api">api docs</a> | <a href="https://github.com/neelr/cdn">source</a></footer>
</body>
</html>`;
}

// Admin page HTML
export function adminPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>admin.</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; max-width: 1000px; margin: 20px auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; }
    button { padding: 8px 16px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin: 2px; }
    button:hover { background: #333; }
    button.danger { background: #c00; }
    button.danger:hover { background: #900; }
    .logout { float: right; background: #666; }
    .dash-btn { float: right; background: #0066cc; margin-right: 10px; }
    .dash-btn:hover { background: #0052a3; }
    .create-section { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 10px 0; resize: vertical; }
    .token-display { font-family: monospace; background: #e0ffe0; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; display: none; }
    .empty { color: #666; font-style: italic; }
    code { background: #eee; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .note-input { width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px; }
    .admin-check { width: 18px; height: 18px; cursor: pointer; }
  </style>
</head>
<body>
  <button class="logout" onclick="logout()">logout</button>
  <button class="dash-btn" onclick="window.location.href='/dash'">dash</button>
  <h1>admin.</h1>

  <div class="create-section">
    <h3>create token</h3>
    <textarea id="note" placeholder="note (e.g. who this token is for)" rows="2"></textarea>
    <button onclick="createToken()">create token</button>
    <div class="token-display" id="newToken"></div>
  </div>

  <h3>tokens</h3>
  <table>
    <thead>
      <tr>
        <th>token</th>
        <th>note</th>
        <th>admin</th>
        <th>usage</th>
        <th>created</th>
        <th>actions</th>
      </tr>
    </thead>
    <tbody id="tokens"></tbody>
  </table>

  <script>
    const token = localStorage.getItem('token');
    if (!token) window.location.href = '/';

    async function loadTokens() {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) {
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      const tokens = await res.json();
      const tbody = document.getElementById('tokens');
      if (tokens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">no tokens yet</td></tr>';
        return;
      }
      tbody.innerHTML = tokens.map(t => \`
        <tr data-token="\${t.token}">
          <td><code>\${t.token.slice(0, 6)}...</code></td>
          <td><input type="text" class="note-input" value="\${t.note || ''}" onchange="updateToken('\${t.token}', this.value, this.closest('tr').querySelector('.admin-check').checked)"></td>
          <td><input type="checkbox" class="admin-check" \${t.isAdmin ? 'checked' : ''} onchange="updateToken('\${t.token}', this.closest('tr').querySelector('.note-input').value, this.checked)"></td>
          <td>\${formatSize(t.usage)}</td>
          <td>\${new Date(t.created).toLocaleDateString()}</td>
          <td>
            <button onclick="refreshToken('\${t.token}')">refresh</button>
            <button class="danger" onclick="deleteToken('\${t.token}')">delete</button>
          </td>
        </tr>
      \`).join('');
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    async function updateToken(targetToken, note, isAdmin) {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, targetToken, note, isAdmin })
      });
      if (!res.ok) alert('failed to update');
    }

    async function createToken() {
      const note = document.getElementById('note').value;
      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, note })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('note').value = '';
        document.getElementById('newToken').style.display = 'block';
        document.getElementById('newToken').textContent = 'new token: ' + data.newToken;
        loadTokens();
      } else {
        alert('failed: ' + data.error);
      }
    }

    async function refreshToken(oldToken) {
      if (!confirm('generate new token? the old one will stop working.')) return;
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, targetToken: oldToken })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('newToken').style.display = 'block';
        document.getElementById('newToken').textContent = 'new token: ' + data.newToken;
        loadTokens();
      } else {
        alert('failed: ' + data.error);
      }
    }

    async function deleteToken(targetToken) {
      if (!confirm('delete this token and all its files? this cannot be undone.')) return;
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, targetToken })
      });
      const data = await res.json();
      if (data.success) {
        loadTokens();
      } else {
        alert('failed: ' + data.error);
      }
    }

    function logout() {
      localStorage.clear();
      window.location.href = '/';
    }

    loadTokens();
  </script>
</body>
</html>`;
}

// API documentation
export function apiDocsPage() {
  return `cdn api

all endpoints require a valid token.

POST /api/upload
  upload a file (< 100MB)
  body: multipart/form-data
    - token: string (required)
    - file: file (required)
    - expiry: number (optional, ms until expiration: 3600000=1h, 86400000=1d, 604800000=7d, 2592000000=30d)
  response: { success: true, url: "/abc123.png" }

MULTIPART UPLOAD (for files > 100MB, up to 5TB):

POST /api/upload/init
  initialize multipart upload
  body: { "token": "...", "filename": "video.mp4", "contentType": "video/mp4", "size": 1234567890 }
  response: { success: true, uploadId: "...", key: "abc123.mp4" }

POST /api/upload/part
  upload a chunk (max 100MB per chunk)
  headers: X-Token, X-Upload-Id, X-Upload-Key, X-Part-Number
  body: raw binary chunk data
  response: { success: true, partNumber: 1, etag: "..." }

POST /api/upload/complete
  complete multipart upload
  body: { "token": "...", "uploadId": "...", "key": "...", "parts": [{ partNumber, etag }], "filename": "...", "contentType": "...", "size": 123, "expiry": "..." }
  response: { success: true, url: "/abc123.mp4" }

POST /api/upload/abort
  abort multipart upload (cleanup)
  body: { "token": "...", "uploadId": "...", "key": "..." }
  response: { success: true }

POST /api/list
  list your files
  body: { "token": "your-token" }
  response: { files: [{ url, originalName, size, uploaded, expires }], isAdmin: bool }

POST /api/delete
  delete a file
  body: { "token": "your-token", "key": "abc123.png" }
  response: { success: true }

POST /api/rename
  rename a file (update display name)
  body: { "token": "your-token", "key": "abc123.png", "newName": "my-photo.png" }
  response: { success: true }
`;
}
