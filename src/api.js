import {
  hashToken,
  generateToken,
  getExtension,
  generateUniqueKey,
  requireAuth,
  requireAdmin,
  isValidToken,
  isAdmin
} from './utils.js';

// Admin - list tokens with usage
export async function handleAdminTokens(request, env) {
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

// Admin - update token (note, is_admin)
export async function handleAdminUpdate(request, env) {
  const { token, targetToken, note, isAdmin: makeAdmin } = await request.json();
  const auth = await requireAdmin(token, env.DB);
  if (!auth.authorized) return auth.response;

  await env.DB.prepare(
    'UPDATE tokens SET note = ?, is_admin = ? WHERE token = ?'
  ).bind(note, makeAdmin ? 1 : 0, targetToken).run();

  return Response.json({ success: true });
}

// Admin - create token
export async function handleAdminCreate(request, env) {
  const { token, note } = await request.json();
  const auth = await requireAdmin(token, env.DB);
  if (!auth.authorized) return auth.response;

  const newToken = generateToken();
  await env.DB.prepare(
    'INSERT INTO tokens (token, note) VALUES (?, ?)'
  ).bind(newToken, note || null).run();

  return Response.json({ success: true, newToken });
}

// Admin - refresh token
export async function handleAdminRefresh(request, env) {
  const { token, targetToken } = await request.json();
  const auth = await requireAdmin(token, env.DB);
  if (!auth.authorized) return auth.response;

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

// Admin - delete token and files
export async function handleAdminDelete(request, env) {
  const { token, targetToken } = await request.json();
  const auth = await requireAdmin(token, env.DB);
  if (!auth.authorized) return auth.response;

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

// List files
export async function handleList(request, env) {
  const { token } = await request.json();
  if (!await isValidToken(token, env.DB)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const owner = hashToken(token);
  const { results } = await env.DB.prepare(
    'SELECT key, original_name, size, uploaded, expires FROM files WHERE owner = ? ORDER BY uploaded DESC'
  ).bind(owner).all();

  const files = results.map(r => ({
    url: '/' + r.key,
    originalName: r.original_name,
    size: r.size,
    uploaded: r.uploaded,
    expires: r.expires
  }));

  const admin = await isAdmin(token, env.DB);
  return Response.json({ files, isAdmin: admin });
}

// Multipart upload - Initialize
export async function handleUploadInit(request, env) {
  const { token, filename, contentType } = await request.json();

  const auth = await requireAuth(token, env.DB);
  if (!auth.authorized) return auth.response;

  if (!filename) {
    return Response.json({ success: false, error: 'No filename' }, { status: 400 });
  }

  const ext = getExtension(filename);
  let key;
  try {
    key = await generateUniqueKey(env.DB, ext);
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }

  // Create multipart upload
  const multipartUpload = await env.CDN_BUCKET.createMultipartUpload(key, {
    httpMetadata: { contentType: contentType || 'application/octet-stream' }
  });

  return Response.json({
    success: true,
    uploadId: multipartUpload.uploadId,
    key
  });
}

// Multipart upload - Upload part
export async function handleUploadPart(request, env) {
  const uploadId = request.headers.get('X-Upload-Id');
  const key = request.headers.get('X-Upload-Key');
  const partNumber = parseInt(request.headers.get('X-Part-Number'));
  const token = request.headers.get('X-Token');

  const auth = await requireAuth(token, env.DB);
  if (!auth.authorized) return auth.response;

  if (!uploadId || !key || !partNumber) {
    return Response.json({ success: false, error: 'Missing upload parameters' }, { status: 400 });
  }

  // Resume the multipart upload and upload this part
  const multipartUpload = env.CDN_BUCKET.resumeMultipartUpload(key, uploadId);
  const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);

  return Response.json({
    success: true,
    partNumber: uploadedPart.partNumber,
    etag: uploadedPart.etag
  });
}

// Multipart upload - Complete
export async function handleUploadComplete(request, env) {
  const { token, uploadId, key, parts, filename, contentType, size, expiry } = await request.json();

  const auth = await requireAuth(token, env.DB);
  if (!auth.authorized) return auth.response;

  if (!uploadId || !key || !parts || !Array.isArray(parts)) {
    return Response.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  }

  // Complete the multipart upload
  const multipartUpload = env.CDN_BUCKET.resumeMultipartUpload(key, uploadId);
  await multipartUpload.complete(parts);

  // Insert into DB
  const owner = hashToken(token);
  const expires = expiry ? new Date(Date.now() + parseInt(expiry)).toISOString() : null;

  await env.DB.prepare(
    'INSERT INTO files (key, owner, original_name, content_type, size, expires) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(key, owner, filename || key, contentType || 'application/octet-stream', size || 0, expires).run();

  return Response.json({ success: true, url: '/' + key });
}

// Multipart upload - Abort
export async function handleUploadAbort(request, env) {
  const { token, uploadId, key } = await request.json();

  const auth = await requireAuth(token, env.DB);
  if (!auth.authorized) return auth.response;

  if (!uploadId || !key) {
    return Response.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  }

  // Abort the multipart upload
  const multipartUpload = env.CDN_BUCKET.resumeMultipartUpload(key, uploadId);
  await multipartUpload.abort();

  return Response.json({ success: true });
}

// Upload file (for small files < 100MB)
export async function handleUpload(request, env) {
  const formData = await request.formData();
  const token = formData.get('token');
  const file = formData.get('file');
  const expiryMs = formData.get('expiry');

  const auth = await requireAuth(token, env.DB);
  if (!auth.authorized) return auth.response;

  if (!file || !file.name) {
    return Response.json({ success: false, error: 'No file' }, { status: 400 });
  }

  const ext = getExtension(file.name);
  const expires = expiryMs ? new Date(Date.now() + parseInt(expiryMs)).toISOString() : null;

  let key;
  try {
    key = await generateUniqueKey(env.DB, ext);
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }

  // Upload to R2 (pure blob, no metadata)
  await env.CDN_BUCKET.put(key, file.stream());

  // Insert into DB
  await env.DB.prepare(
    'INSERT INTO files (key, owner, original_name, content_type, size, expires) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(key, auth.owner, file.name, file.type || 'application/octet-stream', file.size, expires).run();

  return Response.json({ success: true, url: '/' + key });
}

// Delete file
export async function handleDelete(request, env) {
  const { token, key } = await request.json();

  const auth = await requireAuth(token, env.DB);
  if (!auth.authorized) return auth.response;

  const file = await env.DB.prepare(
    'SELECT key FROM files WHERE key = ? AND owner = ?'
  ).bind(key, auth.owner).first();

  if (!file) {
    return Response.json({ success: false, error: 'File not found' }, { status: 404 });
  }

  await env.CDN_BUCKET.delete(key);
  await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(key).run();

  return Response.json({ success: true });
}

// Serve file with caching headers
export async function handleServeFile(request, env, key) {
  // Get metadata from DB first (including expires for cache calculation)
  const fileInfo = await env.DB.prepare(
    'SELECT original_name, content_type, expires FROM files WHERE key = ?'
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
  headers.set('Content-Disposition', `inline; filename="${fileInfo.original_name.replace(/"/g, '\\"')}"`);

  // Caching headers
  if (fileInfo.expires) {
    // File has expiry - cache until expiry or max 1 day
    const expiresDate = new Date(fileInfo.expires);
    const now = new Date();
    const maxAge = Math.min(
      Math.max(0, Math.floor((expiresDate - now) / 1000)),
      86400  // Max 1 day for expiring files
    );
    headers.set('Cache-Control', `public, max-age=${maxAge}`);
    headers.set('Expires', expiresDate.toUTCString());
  } else {
    // Permanent file - aggressive caching (1 year, immutable)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Add ETag from R2 object if available
  if (object.etag) {
    headers.set('ETag', object.etag);
  }

  return new Response(object.body, { headers });
}
