// Simple hash for owner identification
export function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = ((hash << 5) - hash) + token.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate 6-char base64-like ID
export function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get file extension
export function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// Check if token is valid (from D1)
export async function isValidToken(token, db) {
  const result = await db.prepare('SELECT 1 FROM tokens WHERE token = ?').bind(token).first();
  return !!result;
}

// Check if token is admin
export async function isAdmin(token, db) {
  const result = await db.prepare('SELECT is_admin FROM tokens WHERE token = ?').bind(token).first();
  return result?.is_admin === 1;
}

// Generate 24-char token
export function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Format bytes to human readable (unified version with GB support)
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Generate unique key for file (checks DB for collisions)
export async function generateUniqueKey(db, ext) {
  let key, attempts = 0;
  do {
    key = generateId() + (ext ? '.' + ext : '');
    const existing = await db.prepare('SELECT 1 FROM files WHERE key = ?').bind(key).first();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new Error('Could not generate unique ID');
  }
  return key;
}

// Auth helper - validates token and returns owner hash
export async function requireAuth(token, db) {
  if (!await isValidToken(token, db)) {
    return { authorized: false, response: Response.json({ success: false, error: 'Invalid token' }, { status: 401 }) };
  }
  return { authorized: true, owner: hashToken(token) };
}

// Admin auth helper
export async function requireAdmin(token, db) {
  if (!await isAdmin(token, db)) {
    return { authorized: false, response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }
  return { authorized: true };
}
