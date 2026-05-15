// core/http.js — fetch wrappers with CSRF + JSON parsing
//
// Reads CSRF token from <meta name="csrf-token" content="..."> if the
// template includes one (Flask-WTF pattern). POST/DELETE always carry it
// when present; GET is safe without.
//
// All responses are auto-parsed: JSON if content-type matches, else text.
// Non-2xx responses throw `HttpError` with `.status` and `.body`.

export class HttpError extends Error {
    constructor(status, statusText, body) {
        super(`HTTP ${status}: ${statusText}`);
        this.status = status;
        this.body = body;
    }
}

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

function buildHeaders(sendJson) {
    const h = { 'X-Requested-With': 'XMLHttpRequest' };
    if (sendJson) h['Content-Type'] = 'application/json';
    const tok = csrfToken();
    if (tok) h['X-CSRFToken'] = tok;
    return h;
}

async function parse(res) {
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new HttpError(res.status, res.statusText, body);
    return body;
}

export function get(url, params = null) {
    if (params) {
        const qs = new URLSearchParams(params).toString();
        url += (url.includes('?') ? '&' : '?') + qs;
    }
    return fetch(url, { headers: buildHeaders(false) }).then(parse);
}

export function post(url, data = {}) {
    return fetch(url, {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify(data),
    }).then(parse);
}

export function del(url) {
    return fetch(url, {
        method: 'DELETE',
        headers: buildHeaders(false),
    }).then(parse);
}
