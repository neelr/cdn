import { loginPage, dashboardPage, adminPage, apiDocsPage } from './pages.js';
import { handleScheduled } from './cron.js';
import * as api from './api.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Token, X-Upload-Id, X-Upload-Key, X-Part-Number',
};

function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Login page
    if (path === '/' && request.method === 'GET') {
      return addCorsHeaders(new Response(loginPage(), { headers: { 'Content-Type': 'text/html' } }));
    }

    // Dashboard
    if (path === '/dash' && request.method === 'GET') {
      return addCorsHeaders(new Response(dashboardPage(), { headers: { 'Content-Type': 'text/html' } }));
    }

    // Admin page
    if (path === '/admin' && request.method === 'GET') {
      return addCorsHeaders(new Response(adminPage(), { headers: { 'Content-Type': 'text/html' } }));
    }

    // API docs
    if (path === '/api' && request.method === 'GET') {
      return addCorsHeaders(new Response(apiDocsPage(), { headers: { 'Content-Type': 'text/plain' } }));
    }

    // Admin API routes
    if (path === '/api/admin/tokens' && request.method === 'POST') {
      return addCorsHeaders(await api.handleAdminTokens(request, env));
    }
    if (path === '/api/admin/update' && request.method === 'POST') {
      return addCorsHeaders(await api.handleAdminUpdate(request, env));
    }
    if (path === '/api/admin/create' && request.method === 'POST') {
      return addCorsHeaders(await api.handleAdminCreate(request, env));
    }
    if (path === '/api/admin/refresh' && request.method === 'POST') {
      return addCorsHeaders(await api.handleAdminRefresh(request, env));
    }
    if (path === '/api/admin/delete' && request.method === 'POST') {
      return addCorsHeaders(await api.handleAdminDelete(request, env));
    }

    // File API routes
    if (path === '/api/list' && request.method === 'POST') {
      return addCorsHeaders(await api.handleList(request, env));
    }
    if (path === '/api/upload/init' && request.method === 'POST') {
      return addCorsHeaders(await api.handleUploadInit(request, env));
    }
    if (path === '/api/upload/part' && request.method === 'POST') {
      return addCorsHeaders(await api.handleUploadPart(request, env));
    }
    if (path === '/api/upload/complete' && request.method === 'POST') {
      return addCorsHeaders(await api.handleUploadComplete(request, env));
    }
    if (path === '/api/upload/abort' && request.method === 'POST') {
      return addCorsHeaders(await api.handleUploadAbort(request, env));
    }
    if (path === '/api/upload' && request.method === 'POST') {
      return addCorsHeaders(await api.handleUpload(request, env));
    }
    if (path === '/api/delete' && request.method === 'POST') {
      return addCorsHeaders(await api.handleDelete(request, env));
    }
    if (path === '/api/rename' && request.method === 'POST') {
      return addCorsHeaders(await api.handleRename(request, env));
    }

    // Serve files (GET requests to /{key})
    if (request.method === 'GET') {
      const key = path.slice(1);
      if (!key) {
        return addCorsHeaders(new Response(loginPage(), { headers: { 'Content-Type': 'text/html' } }));
      }
      return addCorsHeaders(await api.handleServeFile(request, env, key));
    }

    return addCorsHeaders(new Response('Not Found', { status: 404 }));
  },

  scheduled: handleScheduled
};
