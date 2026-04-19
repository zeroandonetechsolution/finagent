// --- GLOBAL UTILITIES ---
const safeGet = (id) => document.getElementById(id);

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://qrrblhuuutqrhgsowsrkr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycmJsaHV1dHFyaGdzb3dzcmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDAxNzQsImV4cCI6MjA5MDM3NjE3NH0.Sz77MlxoVSTpHJIS5VVDnGU3DPx-KlFYEGMkv2SLWw4';

let _supabase = null;

function initSupabase() {
    if (_supabase) return;
    if (window.supabase) { _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => { _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); };
    document.head.appendChild(script);
}
initSupabase();

// --- SHARED DATA & AUTH ---
let customers = [];
window.chitGroups = [];

const state = { user: JSON.parse(localStorage.getItem('finagent_user')) || null };

// Load from localStorage immediately (synchronous)
function loadData() {
    const savedCustomers = localStorage.getItem('finagent_customers');
    const savedGroups    = localStorage.getItem('finagent_chitGroups');
    customers         = savedCustomers ? JSON.parse(savedCustomers) : [];
    window.chitGroups = savedGroups   ? JSON.parse(savedGroups)    : [];
    if (customers.length > 0) mergeDuplicates();
    if (state.user && state.user.role === 'customer') {
        const latest = customers.find(c => (state.user.uid && c.uid === state.user.uid) || c.phone === state.user.phone);
        if (latest) {
            if (!state.user.uid && latest.uid) state.user.uid = latest.uid;
            state.user.name  = latest.name;
            state.user.phone = latest.phone;
            localStorage.setItem('finagent_user', JSON.stringify(state.user));
        }
    }
}

// Save to localStorage immediately + sync Supabase in background
async function saveData() {
    localStorage.setItem('finagent_customers',  JSON.stringify(customers));
    localStorage.setItem('finagent_chitGroups', JSON.stringify(window.chitGroups));
    if (!_supabase) return;
    try {
        const { error } = await _supabase
            .from('app_state')
            .upsert({ id: 'global_state', customers: customers, groups: window.chitGroups });
        if (error) console.warn('Supabase sync error:', error.message);
    } catch (err) { console.warn('Supabase sync failed:', err); }
}

// Pull from Supabase silently after page ready
async function syncFromSupabase() {
    if (!_supabase) return;
    try {
        const { data, error } = await _supabase
            .from('app_state').select('*').eq('id', 'global_state').single();
        if (data && !error) {
            const rc = data.customers || [], rg = data.groups || [];
            if (rc.length > customers.length || rg.length > window.chitGroups.length) {
                customers = rc; window.chitGroups = rg;
                localStorage.setItem('finagent_customers',  JSON.stringify(customers));
                localStorage.setItem('finagent_chitGroups', JSON.stringify(window.chitGroups));
                if (typeof loadAdminData          === 'function') loadAdminData();
                if (typeof updateCategorizedLists === 'function') updateCategorizedLists();
            }
        }
    } catch (err) { console.warn('Supabase background sync failed:', err); }
}

function mergeDuplicates() {
    const merged = {};
    customers.forEach(c => {
        const phone = (c.phone || '').trim();
        if (!phone) return;
        if (!merged[phone]) {
            merged[phone] = { ...c, financeAccounts: [...(c.financeAccounts || [])], transactions: [...(c.transactions || [])] };
        } else {
            const target = merged[phone];
            (c.financeAccounts || []).forEach(acc => target.financeAccounts.push(acc));
            (c.transactions    || []).forEach(tx  => target.transactions.push(tx));
            if (!target.name    && c.name)    target.name    = c.name;
            if (!target.address && c.address) target.address = c.address;
        }
    });
    customers = Object.values(merged);
    localStorage.setItem('finagent_customers', JSON.stringify(customers));
}

function logout() { localStorage.removeItem('finagent_user'); window.location.href = 'index.html'; }

function checkAuth(role) {
    if (!state.user) { window.location.href = 'index.html'; return false; }
    if (role && state.user.role !== role) { window.location.href = 'index.html'; return false; }
    return true;
}

// Load data immediately
loadData();

// --- MODAL INJECTOR ---
// Inject modals NOW (as soon as body is available) so they are ready before any click
async function injectModals() {
    try {
        const response = await fetch('modals.html');
        const html     = await response.text();
        const div      = document.createElement('div');
        div.innerHTML  = html;
        // Wait for body if not ready yet
        if (document.body) {
            document.body.appendChild(div);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.body.appendChild(div));
        }
    } catch (err) { console.error('Failed to inject modals:', err); }
}

// Start injecting modals immediately - do not wait for DOMContentLoaded
injectModals();

// --- BACKGROUND SHAPE INJECTOR ---
function injectBackgroundShapes() {
    const shapesHTML = `
        <div class="bg-shape shape-1"></div>
        <div class="bg-shape shape-2"></div>
        <div class="bg-shape shape-3"></div>
    `;
    const div = document.createElement('div');
    div.innerHTML = shapesHTML;
    if (document.body) {
        document.body.prepend(div);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.prepend(div));
    }
}
injectBackgroundShapes();

// After DOM ready: run page-specific UI + background Supabase sync
document.addEventListener('DOMContentLoaded', () => {
    if (typeof loadAdminData          === 'function') loadAdminData();
    if (typeof updateCategorizedLists === 'function') updateCategorizedLists();
    setTimeout(syncFromSupabase, 1500);
});

// --- POPUP SYSTEM ---
window.showPopup = function(options) {
    return new Promise((resolve) => {
        const modal = safeGet('custom-popup-modal');
        if (!modal) {
            if (options.type === 'alert') { alert(options.message); resolve(true); }
            else resolve(confirm(options.message));
            return;
        }
        const titleEl    = safeGet('popup-title');
        const msgEl      = safeGet('popup-message');
        const iconEl     = safeGet('popup-icon');
        const confirmBtn = safeGet('popup-confirm-btn');
        const cancelBtn  = safeGet('popup-cancel-btn');
        titleEl.innerText    = options.title || (options.type === 'alert' ? 'Notification' : 'Confirm Action');
        msgEl.innerText      = options.message || '';
        confirmBtn.innerText = options.confirmText || (options.type === 'alert' ? 'OK' : 'Confirm');
        if (options.type === 'alert') {
            cancelBtn.classList.add('hidden');
            iconEl.innerHTML = '<i class="fa-solid fa-circle-info" style="color: var(--primary-color)"></i>';
            confirmBtn.style.background = 'var(--primary-color)';
        } else {
            cancelBtn.classList.remove('hidden');
            cancelBtn.innerText = options.cancelText || 'Cancel';
            if (options.isDanger) {
                iconEl.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: var(--danger-color)"></i>';
                confirmBtn.style.background = 'var(--danger-color)';
            } else {
                iconEl.innerHTML = '<i class="fa-solid fa-circle-question" style="color: var(--primary-color)"></i>';
                confirmBtn.style.background = 'var(--primary-color)';
            }
        }
        const cleanup = (result) => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick  = null;
            resolve(result);
        };
        confirmBtn.onclick = () => cleanup(true);
        cancelBtn.onclick  = () => cleanup(false);
        modal.classList.remove('hidden');
    });
};

window.showPrompt = function(title, defaultValue) {
    return new Promise((resolve) => {
        const modal = safeGet('custom-prompt-modal');
        if (!modal) { resolve(prompt(title, defaultValue)); return; }
        const titleEl    = safeGet('prompt-title');
        const inputEl    = safeGet('prompt-input');
        const confirmBtn = safeGet('prompt-confirm-btn');
        const cancelBtn  = safeGet('prompt-cancel-btn');
        titleEl.innerText = title || 'Enter Value';
        inputEl.value     = defaultValue || '';
        const cleanup = (result) => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick  = null;
            resolve(result);
        };
        confirmBtn.onclick = () => cleanup(inputEl.value);
        cancelBtn.onclick  = () => cleanup(null);
        modal.classList.remove('hidden');
        inputEl.focus();
        inputEl.select();
    });
};
