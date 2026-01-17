import { loginPage, dashboardPage, adminPage, apiDocsPage } from './pages.js';
import { handleScheduled } from './cron.js';
import * as api from './api.js';

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

    // API docs
    if (path === '/api' && request.method === 'GET') {
      return new Response(apiDocsPage(), { headers: { 'Content-Type': 'text/plain' } });
    }

    // Admin API routes
    if (path === '/api/admin/tokens' && request.method === 'POST') {
      return api.handleAdminTokens(request, env);
    }
    if (path === '/api/admin/update' && request.method === 'POST') {
      return api.handleAdminUpdate(request, env);
    }
    if (path === '/api/admin/create' && request.method === 'POST') {
      return api.handleAdminCreate(request, env);
    }
    if (path === '/api/admin/refresh' && request.method === 'POST') {
      return api.handleAdminRefresh(request, env);
    }
    if (path === '/api/admin/delete' && request.method === 'POST') {
      return api.handleAdminDelete(request, env);
    }

    // File API routes
    if (path === '/api/list' && request.method === 'POST') {
      return api.handleList(request, env);
    }
    if (path === '/api/upload/init' && request.method === 'POST') {
      return api.handleUploadInit(request, env);
    }
    if (path === '/api/upload/part' && request.method === 'POST') {
      return api.handleUploadPart(request, env);
    }
    if (path === '/api/upload/complete' && request.method === 'POST') {
      return api.handleUploadComplete(request, env);
    }
    if (path === '/api/upload/abort' && request.method === 'POST') {
      return api.handleUploadAbort(request, env);
    }
    if (path === '/api/upload' && request.method === 'POST') {
      return api.handleUpload(request, env);
    }
    if (path === '/api/delete' && request.method === 'POST') {
      return api.handleDelete(request, env);
    }

    // Serve files (GET requests to /{key})
    if (request.method === 'GET') {
      const key = path.slice(1);
      if (!key) {
        return new Response(loginPage(), { headers: { 'Content-Type': 'text/html' } });
      }
      return api.handleServeFile(request, env, key);
    }

    return new Response('Not Found', { status: 404 });
  },

  scheduled: handleScheduled
};
