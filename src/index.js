// Simple hash for owner identification
function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash) + token.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate 6-char base64-like ID
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get file extension
function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// Check if token is valid (from D1)
async function isValidToken(token, db) {
  const result = await db.prepare('SELECT 1 FROM tokens WHERE token = ?').bind(token).first();
  return !!result;
}

// Check if token is admin
async function isAdmin(token, db) {
  const result = await db.prepare('SELECT is_admin FROM tokens WHERE token = ?').bind(token).first();
  return result?.is_admin === 1;
}

// Generate 24-char token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Login page HTML
function loginPage() {
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
    if (sessionStorage.getItem('token')) {
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
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('isAdmin', data.isAdmin ? '1' : '0');
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
function dashboardPage() {
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
  </div>

  <table>
    <thead>
      <tr>
        <th>url</th>
        <th>original name</th>
        <th>size</th>
        <th>uploaded</th>
      </tr>
    </thead>
    <tbody id="files"></tbody>
  </table>

  <script>
    const token = sessionStorage.getItem('token');
    if (!token) window.location.href = '/';

    // Show admin button if user is admin
    if (sessionStorage.getItem('isAdmin') === '1') {
      document.getElementById('adminBtn').style.display = 'block';
    }

    async function loadFiles() {
      const res = await fetch('/api/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) {
        sessionStorage.clear();
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      const files = data.files;
      const tbody = document.getElementById('files');
      if (files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">no files uploaded yet</td></tr>';
        return;
      }
      tbody.innerHTML = files.map(f => \`
        <tr>
          <td><a href="\${f.url}" target="_blank">\${f.url}</a></td>
          <td>\${f.originalName}</td>
          <td>\${formatSize(f.size)}</td>
          <td>\${new Date(f.uploaded).toLocaleString()}</td>
        </tr>
      \`).join('');
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function upload() {
      const file = document.getElementById('file').files[0];
      if (!file) return alert('select a file');

      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      btn.textContent = 'uploading...';

      const expiry = document.getElementById('expiry').value;
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
        loadFiles();
      } else {
        alert('upload failed: ' + data.error);
      }
    }

    function logout() {
      sessionStorage.clear();
      window.location.href = '/';
    }

    loadFiles();
  </script>
</body>
</html>`;
}

// Admin page HTML
function adminPage() {
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
    const token = sessionStorage.getItem('token');
    if (!token) window.location.href = '/';

    async function loadTokens() {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) {
        sessionStorage.clear();
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
      sessionStorage.clear();
      window.location.href = '/';
    }

    loadTokens();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Login page
    if (path === '/' && request.method === 'GET') {
      return new Response(loginPage(), { headers: { 'Content-Type': 'text/html' } });
    }

    // Dashboard
    if (path === '/dash' && request.method === 'GET') {
      return new Response(dashboardPage(), { headers: { 'Content-Type': 'text/html' } });
    }

    // Admin page
    if (path === '/admin' && request.method === 'GET') {
      return new Response(adminPage(), { headers: { 'Content-Type': 'text/html' } });
    }

    // API: Admin - list tokens with usage
    if (path === '/api/admin/tokens' && request.method === 'POST') {
      const { token } = await request.json();
      if (!await isAdmin(token, env.DB)) {
        return new Response('Unauthorized', { status: 401 });
      }

      const { results: tokens } = await env.DB.prepare(
        'SELECT token, note, is_admin, created FROM tokens'
      ).all();

      const tokensWithUsage = await Promise.all(tokens.map(async (t) => {
        const owner = hashToken(t.token);
        const usage = await env.DB.prepare(
          'SELECT COALESCE(SUM(size), 0) as total FROM files WHERE owner = ?'
        ).bind(owner).first();
        return {
          token: t.token,
          note: t.note,
          isAdmin: t.is_admin === 1,
          created: t.created,
          usage: usage?.total || 0
        };
      }));

      return Response.json(tokensWithUsage);
    }

    // API: Admin - update token (note, is_admin)
    if (path === '/api/admin/update' && request.method === 'POST') {
      const { token, targetToken, note, isAdmin: makeAdmin } = await request.json();
      if (!await isAdmin(token, env.DB)) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      await env.DB.prepare(
        'UPDATE tokens SET note = ?, is_admin = ? WHERE token = ?'
      ).bind(note, makeAdmin ? 1 : 0, targetToken).run();

      return Response.json({ success: true });
    }

    // API: Admin - create token
    if (path === '/api/admin/create' && request.method === 'POST') {
      const { token, note } = await request.json();
      if (!await isAdmin(token, env.DB)) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      const newToken = generateToken();
      await env.DB.prepare(
        'INSERT INTO tokens (token, note) VALUES (?, ?)'
      ).bind(newToken, note || null).run();

      return Response.json({ success: true, newToken });
    }

    // API: Admin - refresh token
    if (path === '/api/admin/refresh' && request.method === 'POST') {
      const { token, targetToken } = await request.json();
      if (!await isAdmin(token, env.DB)) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      const oldOwner = hashToken(targetToken);
      const newToken = generateToken();
      const newOwner = hashToken(newToken);

      // Update token
      await env.DB.prepare(
        'UPDATE tokens SET token = ? WHERE token = ?'
      ).bind(newToken, targetToken).run();

      // Update files owner
      await env.DB.prepare(
        'UPDATE files SET owner = ? WHERE owner = ?'
      ).bind(newOwner, oldOwner).run();

      return Response.json({ success: true, newToken });
    }

    // API: Admin - delete token and files
    if (path === '/api/admin/delete' && request.method === 'POST') {
      const { token, targetToken } = await request.json();
      if (!await isAdmin(token, env.DB)) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      const owner = hashToken(targetToken);

      // Get all files for this token
      const { results: files } = await env.DB.prepare(
        'SELECT key FROM files WHERE owner = ?'
      ).bind(owner).all();

      // Delete from R2
      for (const file of files) {
        await env.CDN_BUCKET.delete(file.key);
      }

      // Delete from DB
      await env.DB.prepare('DELETE FROM files WHERE owner = ?').bind(owner).run();
      await env.DB.prepare('DELETE FROM tokens WHERE token = ?').bind(targetToken).run();

      return Response.json({ success: true });
    }

    // API: List files
    if (path === '/api/list' && request.method === 'POST') {
      const { token } = await request.json();
      if (!await isValidToken(token, env.DB)) {
        return new Response('Unauthorized', { status: 401 });
      }

      const owner = hashToken(token);
      const { results } = await env.DB.prepare(
        'SELECT key, original_name, size, uploaded FROM files WHERE owner = ? ORDER BY uploaded DESC'
      ).bind(owner).all();

      const files = results.map(r => ({
        url: '/' + r.key,
        originalName: r.original_name,
        size: r.size,
        uploaded: r.uploaded
      }));

      const admin = await isAdmin(token, env.DB);
      return Response.json({ files, isAdmin: admin });
    }

    // API: Upload file
    if (path === '/api/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const token = formData.get('token');
      const file = formData.get('file');
      const expiryMs = formData.get('expiry');

      if (!await isValidToken(token, env.DB)) {
        return Response.json({ success: false, error: 'Invalid token' }, { status: 401 });
      }

      if (!file || !file.name) {
        return Response.json({ success: false, error: 'No file' }, { status: 400 });
      }

      const ext = getExtension(file.name);
      const owner = hashToken(token);
      const expires = expiryMs ? new Date(Date.now() + parseInt(expiryMs)).toISOString() : null;
      let key, attempts = 0;

      // Generate unique key (check DB instead of R2)
      do {
        key = generateId() + (ext ? '.' + ext : '');
        const existing = await env.DB.prepare('SELECT 1 FROM files WHERE key = ?').bind(key).first();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return Response.json({ success: false, error: 'Could not generate unique ID' }, { status: 500 });
      }

      // Upload to R2 (pure blob, no metadata)
      await env.CDN_BUCKET.put(key, file.stream());

      // Insert into DB
      await env.DB.prepare(
        'INSERT INTO files (key, owner, original_name, content_type, size, expires) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(key, owner, file.name, file.type || 'application/octet-stream', file.size, expires).run();

      return Response.json({ success: true, url: '/' + key });
    }

    // Serve files
    if (request.method === 'GET') {
      const key = path.slice(1);
      if (!key) {
        return new Response(loginPage(), { headers: { 'Content-Type': 'text/html' } });
      }

      // Get metadata from DB first
      const fileInfo = await env.DB.prepare(
        'SELECT original_name, content_type FROM files WHERE key = ?'
      ).bind(key).first();

      if (!fileInfo) {
        return new Response('Not Found', { status: 404 });
      }

      const object = await env.CDN_BUCKET.get(key);
      if (!object) {
        return new Response('Not Found', { status: 404 });
      }

      const headers = new Headers();
      headers.set('Content-Type', fileInfo.content_type);
      headers.set('Content-Disposition', `inline; filename="${fileInfo.original_name}"`);

      return new Response(object.body, { headers });
    }

    return new Response('Not Found', { status: 404 });
  },

  // Cron handler to delete expired files
  async scheduled(event, env, ctx) {
    const now = new Date().toISOString();

    // Get all expired files
    const { results: expiredFiles } = await env.DB.prepare(
      'SELECT key FROM files WHERE expires IS NOT NULL AND expires < ?'
    ).bind(now).all();

    if (expiredFiles.length === 0) return;

    // Delete from R2 and DB
    for (const file of expiredFiles) {
      await env.CDN_BUCKET.delete(file.key);
      await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(file.key).run();
    }

    console.log(`Deleted ${expiredFiles.length} expired files`);
  }
};
