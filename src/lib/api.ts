/**
 * Shared fetch wrapper that automatically attaches the JWT token
 * stored in localStorage to every request.
 * 
 * Usage:
 *   const data = await apiFetch('/api/petitions');
 *   const data = await apiFetch('/api/petitions', { method: 'POST', body: JSON.stringify({...}) });
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('token');
    // Priority: Env Var > Hardcoded Render Backend > Relative Path (for Proxy)
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-petiton.onrender.com';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    // Only set default JSON content type if it's not FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(fullUrl, { ...options, headers });

    if (res.status === 401) {
        // Token expired or invalid — clear storage and reload to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 405) {
            throw new Error(`API Error (405): Method Not Allowed. This usually means VITE_API_BASE_URL is not configured correctly in your deployment.`);
        }
        throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
}
