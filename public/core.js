// --- GLOBAL UTILITIES ---
const safeGet = (id) => document.getElementById(id);

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // SET THIS
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // SET THIS

// Dynamically load Supabase client if not already present
if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    document.head.appendChild(script);
}

let _supabase = null;
function getSupabase() {
    if (!_supabase && window.supabase) {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _supabase;
}

// --- SHARED DATA & AUTH ---
let customers = [];
window.chitGroups = [];

const state = {
    user: JSON.parse(localStorage.getItem('finagent_user')) || null,
};

async function saveData() {
    // Keep local storage as a cache
    localStorage.setItem('finagent_customers', JSON.stringify(customers));
    localStorage.setItem('finagent_chitGroups', JSON.stringify(window.chitGroups));
    
    // Sync to Supabase
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        // Simple approach: Store the entire customers array as a JSON blob in a single row for quick migration
        // In a real production app, we would normalize this into tables.
        const { error } = await supabase
            .from('app_state')
            .upsert({ id: 'global_state', customers: customers, groups: window.chitGroups });
            
        if (error) console.error("Error syncing to Supabase:", error.message);
    } catch (err) {
        console.error("Supabase sync failed:", err);
    }
}

function mergeDuplicates() {
    const merged = {};
    customers.forEach(c => {
        const phone = (c.phone || '').trim();
        if (!phone) return; // Skip if no phone
        if (!merged[phone]) {
            merged[phone] = { ...c, financeAccounts: [...(c.financeAccounts || [])], transactions: [...(c.transactions || [])] };
        } else {
            // Merge accounts and transactions
            const target = merged[phone];
            (c.financeAccounts || []).forEach(acc => {
                // Avoid direct duplicates if necessary, but usually accounts are unique per setup
                target.financeAccounts.push(acc);
            });
            (c.transactions || []).forEach(tx => {
                target.transactions.push(tx);
            });
            // Update name/address if target is missing them
            if (!target.name && c.name) target.name = c.name;
            if (!target.address && c.address) target.address = c.address;
        }
    });
    customers = Object.values(merged);
    saveData();
}

async function loadData() {
    // 1. Try to load from Supabase first
    const supabase = getSupabase();
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('app_state')
                .select('*')
                .eq('id', 'global_state')
                .single();
            
            if (data && !error) {
                customers = data.customers || [];
                window.chitGroups = data.groups || [];
                // Update cache
                localStorage.setItem('finagent_customers', JSON.stringify(customers));
                localStorage.setItem('finagent_chitGroups', JSON.stringify(window.chitGroups));
            }
        } catch (err) {
            console.error("Failed to load from Supabase:", err);
        }
    }

    // 2. Fallback to Local Storage if Supabase failed or returned nothing
    if (customers.length === 0) {
        const savedCustomers = localStorage.getItem('finagent_customers');
        const savedGroups    = localStorage.getItem('finagent_chitGroups');
        customers  = savedCustomers ? JSON.parse(savedCustomers) : [];
        window.chitGroups = savedGroups ? JSON.parse(savedGroups) : [];
    }
    
    // Automatically merge any duplicates found in the saved data
    if (customers.length > 0) mergeDuplicates();

    // --- Sync Session User with Latest Data ---
    if (state.user && state.user.role === 'customer') {
        // Try to find by UID first, fallback to phone for old sessions
        const latest = customers.find(c => (state.user.uid && c.uid === state.user.uid) || c.phone === state.user.phone);
        if (latest) {
            // Ensure UID is saved if it was missing in the session
            if (!state.user.uid && latest.uid) state.user.uid = latest.uid;
            
            // Update state and localStorage session with latest details
            state.user.name = latest.name;
            state.user.phone = latest.phone; 
            localStorage.setItem('finagent_user', JSON.stringify(state.user));
        }
    }

    window.chitGroups = savedGroups ? JSON.parse(savedGroups) : [];
}

function logout() {
    localStorage.removeItem('finagent_user');
    window.location.href = 'index.html';
}

function checkAuth(role) {
    if (!state.user) {
        window.location.href = 'index.html';
        return false;
    }
    if (role && state.user.role !== role) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// --- MODAL INJECTOR ---
async function injectModals() {
    try {
        const response = await fetch('modals.html');
        const html = await response.text();
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div);
    } catch (err) {
        console.error("Failed to inject modals:", err);
    }
}

// Wait for data to load before continuing
(async () => {
    await loadData();
    // Automatically merge any duplicates found
    if (customers.length > 0) mergeDuplicates();

    // --- Sync Session User with Latest Data ---
    if (state.user && state.user.role === 'customer') {
        const latest = customers.find(c => (state.user.uid && c.uid === state.user.uid) || c.phone === state.user.phone);
        if (latest) {
            if (!state.user.uid && latest.uid) state.user.uid = latest.uid;
            state.user.name = latest.name;
            state.user.phone = latest.phone; 
            localStorage.setItem('finagent_user', JSON.stringify(state.user));
        }
    }

    // Inject modals and other DOM dependent things
    document.addEventListener('DOMContentLoaded', () => {
        injectModals();
        // Check if index.html or admin dashboard needs refresh
        if (typeof loadAdminData === 'function') loadAdminData();
        if (typeof updateCategorizedLists === 'function') updateCategorizedLists();
    });
})();

// --- POPUP SYSTEM ---
window.showPopup = function(options) {
    return new Promise((resolve) => {
        const modal = safeGet('custom-popup-modal');
        if (!modal) {
            // Fallback to native if modal not injected yet
            if (options.type === 'alert') {
                alert(options.message);
                resolve(true);
            } else {
                resolve(confirm(options.message));
            }
            return;
        }
        
        const titleEl = safeGet('popup-title');
        const msgEl = safeGet('popup-message');
        const iconEl = safeGet('popup-icon');
        const confirmBtn = safeGet('popup-confirm-btn');
        const cancelBtn = safeGet('popup-cancel-btn');
        
        titleEl.innerText = options.title || (options.type === 'alert' ? 'Notification' : 'Confirm Action');
        msgEl.innerText = options.message || '';
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
            cancelBtn.onclick = null;
            resolve(result);
        };
        
        confirmBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        
        modal.classList.remove('hidden');
    });
};

window.showPrompt = function(title, defaultValue) {
    return new Promise((resolve) => {
        const modal = safeGet('custom-prompt-modal');
        if (!modal) {
            resolve(prompt(title, defaultValue));
            return;
        }
        
        const titleEl = safeGet('prompt-title');
        const inputEl = safeGet('prompt-input');
        const confirmBtn = safeGet('prompt-confirm-btn');
        const cancelBtn = safeGet('prompt-cancel-btn');
        
        titleEl.innerText = title || 'Enter Value';
        inputEl.value = defaultValue || '';
        
        const cleanup = (result) => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(result);
        };
        
        confirmBtn.onclick = () => cleanup(inputEl.value);
        cancelBtn.onclick = () => cleanup(null);
        
        modal.classList.remove('hidden');
        inputEl.focus();
        inputEl.select();
    });
};
