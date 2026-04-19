// FinAgent Pro - Main Script (Multi-page Edition)


// --- NAVIGATION ---
function showAdminSection(sectionId) {
    const routes = {
        'chit-customers': 'chitfundcust.html',
        'weekly-customers': 'weeklycust.html',
        'monthly-customers': 'monthlycust.html',
        'overview': 'admin.html',
        'customers': 'admin.html' // Default for now
    };
    if (routes[sectionId]) {
        window.location.href = routes[sectionId];
    }
}

// --- ADMIN DASHBOARD DATA ---
function loadAdminData() {
    const dashboardStats = safeGet('stat-total-samples');
    if (dashboardStats) {
        // --- OVERALL METRICS ---
        let collectedDues = 0;
        let totalSpends = 0;
        customers.forEach(c => {
            (c.transactions || []).forEach(t => {
                if (t.type === 'Payout' || t.type === 'Disbursement') {
                    totalSpends += (parseFloat(t.amount) || 0);
                } else {
                    collectedDues += (parseFloat(t.amount) || 0);
                }
            });
            let hasPayouts = (c.transactions || []).some(t => t.type === 'Payout' || t.type === 'Disbursement');
            
            const allAccounts = [...(c.financeAccounts || []), ...(c.pastAccounts || [])];
            allAccounts.forEach(acc => {
                let accInterest = 0;
                if(acc.payments) {
                    Object.values(acc.payments).forEach(p => {
                        if(p.interest) accInterest += (parseFloat(p.interest) || 0);
                    });
                }
                
                if (!hasPayouts && (c.financeAccounts || []).includes(acc)) {
                    totalSpends += parseFloat(acc.loanAmount || 0);
                }
                totalSpends += accInterest;
            });
        });
        
        const formatMoney = (val) => {
            if(val >= 100000) return `₹${(val/100000).toFixed(2)}L`;
            if(val >= 1000) return `₹${(val/1000).toFixed(1)}K`;
            return `₹${val.toLocaleString()}`;
        };

        if (safeGet('stat-total-samples')) safeGet('stat-total-samples').innerText = customers.length;
        if (safeGet('stat-total-spends')) safeGet('stat-total-spends').innerText = formatMoney(totalSpends);
        if (safeGet('stat-collected-dues')) safeGet('stat-collected-dues').innerText = formatMoney(collectedDues);
        if (safeGet('stat-current-balance')) safeGet('stat-current-balance').innerText = formatMoney(totalSpends - collectedDues);

        let financePrincipal = 0, weeklyCurrentDue = 0, monthlyCurrentDue = 0, financeCount = 0;
        let weeklyTotalValue = 0, monthlyTotalValue = 0, monthlyInterestTotalValue = 0, weeklyInterestTotalValue = 0;
        let savingsPrincipal = 0, savingsDues = 0, savingsCount = 0;
        let normalPrincipal = 0, normalDues = 0, normalCount = 0;
        let monthlyInterestCurrentDue = 0, weeklyInterestCurrentDue = 0;

        // Date helpers
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        // Next Sunday calculation
        const dayOfWeek = today.getDay();
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const nextSunday = new Date(today);
        nextSunday.setDate(today.getDate() + daysUntilSunday);
        const sundayStr = nextSunday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const monthStr = today.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Helper for Sunday-aligned period calculation
        function getPassedPeriods(acc, comparisonDate) {
            const start = new Date(acc.startDate);
            const dayOfWeek = start.getDay();
            const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
            const firstDue = new Date(start);
            firstDue.setDate(start.getDate() + daysUntilNextSunday);
            
            if (comparisonDate < firstDue) return 0;
            
            const total = parseInt(acc.duration) || 0;
            let passed = 0;
            
            if (acc.type === 'Weekly Finance' || acc.type === 'Rice Account' || acc.type === 'Weekly Interest') {
                passed = Math.floor(Math.abs(comparisonDate - firstDue) / (1000 * 60 * 60 * 24 * 7)) + 1;
            } else {
                passed = (comparisonDate.getFullYear() - firstDue.getFullYear()) * 12 + (comparisonDate.getMonth() - firstDue.getMonth());
                // If today is on or after the day-of-month of the first due date, count this month
                if (comparisonDate.getDate() >= firstDue.getDate()) passed += 1;
            }
            return Math.min(passed, total);
        }

        customers.forEach(cust => {
            let hasFinance = false, hasSavings = false, hasNormal = false;
            (cust.financeAccounts || []).forEach(acc => {
                const total = parseInt(acc.duration) || 0;
                const amt = parseFloat(acc.monthlyDue || acc.weeklyDue || 0);
                const passed = getPassedPeriods(acc, today);

                let accInterest = 0;
                if(acc.payments) {
                    Object.values(acc.payments).forEach(p => {
                        if(p.interest) accInterest += (parseFloat(p.interest) || 0);
                    });
                }

                // Finance Category
                if (acc.type === 'Weekly Finance' || acc.type === 'Monthly Finance' || acc.type === 'Monthly Interest') {
                    hasFinance = true;
                    if (acc.type === 'Weekly Finance') {
                        weeklyTotalValue += parseFloat(acc.loanAmount || 0) + accInterest;
                        if (passed > 0) { // If at least the first Sunday has arrived/passed
                            // For dashboard "Current Due", we show the amount due this week
                            weeklyCurrentDue += amt;
                        }
                    } else {
                        monthlyTotalValue += parseFloat(acc.loanAmount || 0) + accInterest;
                        if (passed > 0) {
                            monthlyCurrentDue += amt;
                        }
                    }
                    financePrincipal += parseFloat(acc.loanAmount || 0) + accInterest;
                }
                // Savings Category
                else if (['Diwali Chit', 'Pongal Chit', 'Monthly Chit'].includes(acc.type)) {
                    hasSavings = true;
                    savingsPrincipal += parseFloat(acc.loanAmount || 0) + accInterest;
                    savingsDues += ((total - Math.min(passed, total)) * amt);
                }
                // Normal Due Category
                else if (acc.type === 'Rice Account') {
                    hasNormal = true;
                    normalPrincipal += parseFloat(acc.loanAmount || 0) + accInterest;
                    normalDues += ((total - Math.min(passed, total)) * amt);
                }
                // Interest Based Accounts (Weekly/Monthly)
                else if (acc.type === 'Monthly Interest' || acc.type === 'Weekly Interest') {
                    if (acc.type === 'Monthly Interest') {
                        monthlyInterestTotalValue += parseFloat(acc.loanAmount || 0);
                        if (passed > 0) monthlyInterestCurrentDue += amt;
                    } else {
                        weeklyInterestTotalValue += parseFloat(acc.loanAmount || 0);
                        if (passed > 0) weeklyInterestCurrentDue += amt;
                    }
                }
            });
            if (hasFinance) financeCount++;
            if (hasSavings) savingsCount++;
            if (hasNormal) normalCount++;
        });

        const weeklyStatValue = safeGet('stat-weekly-dues');
        if (weeklyStatValue) {
            weeklyStatValue.innerText = formatMoney(weeklyCurrentDue);
            const parent = weeklyStatValue.closest('.stat-card');
            if (parent) {
                const existingDate = parent.querySelector('.date-info');
                if (existingDate) existingDate.innerHTML = `Sunday: ${sundayStr}`;
                else weeklyStatValue.insertAdjacentHTML('afterend', `<small class="date-info" style="font-size:0.75rem; opacity:0.6; display:block; margin-top:5px;">Sunday: ${sundayStr}</small>`);
            }
        }

        const monthlyStatValue = safeGet('stat-monthly-dues');
        if (monthlyStatValue) {
            monthlyStatValue.innerText = formatMoney(monthlyCurrentDue);
            const parent = monthlyStatValue.closest('.stat-card');
            if (parent) {
                const existingDate = parent.querySelector('.date-info');
                if (existingDate) existingDate.innerHTML = `${monthStr}`;
                else monthlyStatValue.insertAdjacentHTML('afterend', `<small class="date-info" style="font-size:0.75rem; opacity:0.6; display:block; margin-top:5px;">${monthStr}</small>`);
            }
        }

        if (safeGet('stat-finance-customers')) safeGet('stat-finance-customers').innerText = financeCount;
        if (safeGet('stat-weekly-customers')) safeGet('stat-weekly-customers').innerText = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Weekly Finance')).length;
        if (safeGet('stat-monthly-customers')) safeGet('stat-monthly-customers').innerText = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Monthly Finance')).length;
        if (safeGet('stat-monthlyinterest-customers')) safeGet('stat-monthlyinterest-customers').innerText = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Monthly Interest')).length;
        if (safeGet('stat-weeklyinterest-customers')) safeGet('stat-weeklyinterest-customers').innerText = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Weekly Interest')).length;
        
        if (safeGet('stat-weekly-value')) safeGet('stat-weekly-value').innerText = formatMoney(weeklyTotalValue);
        if (safeGet('stat-monthly-value')) safeGet('stat-monthly-value').innerText = formatMoney(monthlyTotalValue);
        if (safeGet('stat-monthlyinterest-value')) safeGet('stat-monthlyinterest-value').innerText = formatMoney(monthlyInterestTotalValue);
        if (safeGet('stat-monthlyinterest-dues')) safeGet('stat-monthlyinterest-dues').innerText = formatMoney(monthlyInterestCurrentDue);
        if (safeGet('stat-weeklyinterest-value')) safeGet('stat-weeklyinterest-value').innerText = formatMoney(weeklyInterestTotalValue);
        if (safeGet('stat-weeklyinterest-dues')) safeGet('stat-weeklyinterest-dues').innerText = formatMoney(weeklyInterestCurrentDue);

        if (safeGet('stat-savings-customers')) safeGet('stat-savings-customers').innerText = savingsCount;
        if (safeGet('stat-savings-value')) safeGet('stat-savings-value').innerText = formatMoney(savingsPrincipal);
        if (safeGet('stat-savings-dues')) safeGet('stat-savings-dues').innerText = formatMoney(savingsDues);

        if (safeGet('stat-normal-customers')) safeGet('stat-normal-customers').innerText = normalCount;
        if (safeGet('stat-normal-value')) safeGet('stat-normal-value').innerText = formatMoney(normalPrincipal);
        if (safeGet('stat-normal-dues')) safeGet('stat-normal-dues').innerText = formatMoney(normalDues);
    }
}

// --- TABLES ---
function updateCategorizedLists() {
    const weeklyCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Weekly Finance'));
    const monthlyCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Monthly Finance'));
    const diwaliCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Diwali Chit'));
    const pongalCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Pongal Chit'));
    const monthlyInterestCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Monthly Interest'));
    const weeklyInterestCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Weekly Interest'));
    const riceCusts = customers.filter(c => (c.financeAccounts || []).some(a => a.type === 'Rice Account'));

    renderBasicTable('weekly-customer-table-body', weeklyCusts, 'Weekly Finance');
    renderBasicTable('monthly-customer-table-body', monthlyCusts, 'Monthly Finance');
    renderBasicTable('diwali-customer-table-body', diwaliCusts, 'Diwali Chit');
    renderBasicTable('pongal-customer-table-body', pongalCusts, 'Pongal Chit');
    renderBasicTable('monthly-chit-customer-table-body', monthlyChitCusts, 'Monthly Chit');
    renderBasicTable('monthly-interest-customer-table-body', monthlyInterestCusts, 'Monthly Interest');
    renderBasicTable('weekly-interest-customer-table-body', weeklyInterestCusts, 'Weekly Interest');
    renderBasicTable('rice-customer-table-body', riceCusts, 'Rice Account');
}

// Finance type → icon + label map
const FINANCE_BTN_MAP = {
    'Weekly Finance':  { icon: 'fa-calendar-week',  title: 'Update Weekly Finance' },
    'Monthly Finance': { icon: 'fa-calendar-days',  title: 'Update Monthly Finance' },
    'Diwali Chit':     { icon: 'fa-burst',           title: 'Update Diwali Finance' },
    'Pongal Chit':     { icon: 'fa-bowl-rice',      title: 'Update Pongal Finance' },
    'Monthly Chit':    { icon: 'fa-calendar-check',  title: 'Update Monthly Finance' },
    'Monthly Interest': { icon: 'fa-hand-holding-dollar', title: 'Update Monthly Interest' },
    'Weekly Interest':  { icon: 'fa-hand-dots',           title: 'Update Weekly Interest' },
    'Rice Account':    { icon: 'fa-bucket',          title: 'Update Rice Account' },
};

function renderBasicTable(targetId, pool, pageType) {
    const tbody = safeGet(targetId);
    if (!tbody) return;
    tbody.innerHTML = pool.length === 0 ? `<tr><td colspan="5" style="text-align:center; color: #94a3b8; padding: 20px;">No customers found.</td></tr>` : '';
    
    pool.forEach(cust => {
        const index = customers.findIndex(c => c.phone === cust.phone);
        
        // Get ALL matching accounts for display info (but render only ONE row per customer)
        let matchingAccounts = [];
        if (pageType) {
            (cust.financeAccounts || []).forEach((acc, accIdx) => {
                if (acc.type === pageType) matchingAccounts.push({ acc, accIdx });
            });
        }

        // Finance action button — always ONE button per type; handleFinanceClick deals with multi-account picker
        let financeBtns = '';
        if (pageType) {
            const cfg = FINANCE_BTN_MAP[pageType];
            if (cfg) {
                // Pass accIdx of first matching account; if multiple, handleFinanceClick shows picker
                const firstAccIdx = matchingAccounts.length > 0 ? matchingAccounts[0].accIdx : 0;
                financeBtns = `<button class="secondary-btn" title="${cfg.title}" onclick="handleFinanceClick(${index}, ${firstAccIdx}, '${pageType}')"><i class="fa-solid ${cfg.icon}"></i></button>`;
            }
        } else {
            financeBtns = (cust.financeAccounts || []).map((a, i) => {
                const cfg = FINANCE_BTN_MAP[a.type];
                if (!cfg) return '';
                return `<button class="secondary-btn" title="${a.type} (₹${(parseFloat(a.loanAmount)||0).toLocaleString()})" onclick="handleFinanceClick(${index}, ${i}, '${a.type}')"><i class="fa-solid ${cfg.icon}"></i></button>`;
            }).join('');
        }

        // Account info: if multiple accounts of same type, show combined summary
        let accountInfo = '<span style="opacity:0.4">N/A</span>';
        if (matchingAccounts.length === 1) {
            const activeAcc = matchingAccounts[0].acc;
            const p = activeAcc.payments?.['PRINCIPAL'];
            const isPaid = p === 'paid' || p?.status === 'paid';
            const amount = isPaid ? '0' : parseFloat(activeAcc.loanAmount || 0).toLocaleString();
            const due = parseFloat(activeAcc.weeklyDue || activeAcc.monthlyDue || 0).toLocaleString();
            const period = activeAcc.type.includes('Weekly') || activeAcc.type.includes('Rice') ? 'wk' : 'mo';
            accountInfo = `<div><b style="${isPaid ? 'color:#10b981' : ''}">${isPaid ? '<i class="fa-solid fa-flag-checkered"></i> Settled' : '₹' + amount}</b></div><div style="font-size:0.75rem; opacity:0.7;">${isPaid ? 'Principal Paid' : '₹' + due + '/' + period}</div>`;
        } else if (matchingAccounts.length > 1) {
            // Multiple accounts of same type — show total + count badge
            const totalLoan = matchingAccounts.reduce((sum, { acc }) => sum + (parseFloat(acc.loanAmount) || 0), 0);
            const totalDue = matchingAccounts.reduce((sum, { acc }) => sum + parseFloat(acc.weeklyDue || acc.monthlyDue || 0), 0);
            const period = pageType && (pageType.includes('Weekly') || pageType.includes('Rice')) ? 'wk' : 'mo';
            accountInfo = `<div><b>₹${totalLoan.toLocaleString()}</b> <span style="font-size:0.7rem; background:rgba(124,58,237,0.2); color:var(--primary-color); padding:2px 6px; border-radius:10px; margin-left:4px;">${matchingAccounts.length} accounts</span></div><div style="font-size:0.75rem; opacity:0.7;">₹${totalDue.toLocaleString()}/${period} total</div>`;
        } else if (!pageType && cust.financeAccounts && cust.financeAccounts.length > 0) {
            const totalLoan = cust.financeAccounts.reduce((sum, a) => sum + (parseFloat(a.loanAmount) || 0), 0);
            accountInfo = `<div><b>₹${totalLoan.toLocaleString()}</b></div><div style="font-size:0.75rem; opacity:0.7;">${cust.financeAccounts.length} Active Accounts</div>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${cust.name}</b><br><small>${cust.address || ''}</small></td>
            <td>${cust.phone}</td>
            <td>${accountInfo}</td>
            <td>
                <button class="secondary-btn" title="Send Money" onclick="window.location.href='admin-payout.html?cust=${cust.phone}'" style="color:var(--primary-color)"><i class="fa-solid fa-paper-plane"></i></button>
                <button class="secondary-btn" title="Edit" onclick="openEditModal(${index})"><i class="fa-solid fa-pen"></i></button>
                <button class="secondary-btn" title="Details" onclick="viewCustomerDetails(${index})"><i class="fa-solid fa-circle-info"></i></button>
                ${financeBtns}
                <button class="secondary-btn" title="Delete" onclick="deleteCustomer(${index})" style="color:var(--danger-color)"><i class="fa-solid fa-trash"></i></button>
            </td>
            <td>
              <div style="display:flex; gap:8px;">
                <button class="secondary-btn small" onclick="window.markUserActivity(${index}, 'active')" style="font-size:0.75rem; padding: 4px 8px; border-color:var(--success-color); color:var(--success-color)"><i class="fa-solid fa-check-circle" style="margin-right:2px;"></i> Active</button>
                <button class="secondary-btn small" onclick="window.markUserActivity(${index}, 'inactive')" style="font-size:0.75rem; padding: 4px 8px; border-color:var(--danger-color); color:var(--danger-color)"><i class="fa-solid fa-times-circle" style="margin-right:2px;"></i> Inactive</button>
              </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


function renderChitGroups() {
    const list = safeGet('chit-groups-list');
    if (!list) return;
    list.innerHTML = '';
    chitGroups.forEach(group => {
        const div = document.createElement('div');
        div.className = 'chit-card';
        div.innerHTML = `<h4>${group.name}</h4><p>${group.description}</p>`;
        list.appendChild(div);
    });
}


// --- MODALS ---
function openModal(id) { safeGet(id)?.classList.remove('hidden'); }
function closeModal(id) { safeGet(id)?.classList.add('hidden'); }

// Open Add Customer modal and optionally set a default finance type
function openAddCustomerModal(defaultType) {
    // Reset form
    const form = safeGet('add-customer-form');
    if (form) form.reset();
    // Set defaultType hidden field
    const typeField = safeGet('add-customer-default-type');
    if (typeField) typeField.value = defaultType || '';
    ['altPhone', 'whatsapp', 'gpay'].forEach(f => {
        const c = safeGet(`add-sync-${f}`);
        if (c) c.checked = false;
    });

    // Reset password to default
    const passInput = safeGet('add-password');
    const passCheck = safeGet('add-use-default-password');
    if (passInput) {
        passInput.value = "123456";
        passInput.readOnly = true;
        passInput.style.opacity = "0.7";
    }
    if (passCheck) passCheck.checked = true;

    openModal('add-customer-modal');
}

window.toggleDefaultPassword = function() {
    const check = safeGet('add-use-default-password');
    const input = safeGet('add-password');
    if (!check || !input) return;
    
    check.checked = !check.checked;
    if (check.checked) {
        input.value = "123456";
        input.readOnly = true;
        input.style.opacity = "0.7";
    } else {
        input.readOnly = false;
        input.style.opacity = "1";
        input.value = "";
        input.focus();
    }
};

// --- BUSINESS LOGIC ---
async function handleAddCustomer(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const defaultType = data.defaultType || '';
    delete data.defaultType; 

    // Look for existing customer by phone
    const existingIndex = customers.findIndex(c => (c.phone || '').trim() === (data.phone || '').trim());
    let targetIndex;

    if (existingIndex > -1) {
        // Update existing customer info but keep accounts
        const existing = customers[existingIndex];
        if (data.name) existing.name = data.name;
        if (data.address) existing.address = data.address;
        if (data.password) existing.password = data.password;
        if (data.altPhone) existing.altPhone = data.altPhone;
        if (data.whatsapp) existing.whatsapp = data.whatsapp;
        if (data.gpay) existing.gpay = data.gpay;
        if (data.accountNo) existing.accountNo = data.accountNo;
        if (data.ifsc) existing.ifsc = data.ifsc;
        targetIndex = existingIndex;
    } else {
        // Create new customer
        data.uid = 'cust_' + Date.now();
        data.financeAccounts = [];
        data.transactions = [];
        customers.push(data);
        targetIndex = customers.length - 1;
    }

    saveData();
    closeModal('add-customer-modal');
    
    // NEW: Handle adding to a specific Chit Group context
    if (window.isAddingToGroupContext) {
        const phone = customers[targetIndex].phone;
        const groupId = window.isAddingToGroupContext;
        window.isAddingToGroupContext = null; // Reset
        window.addCustomerToGroup(phone);
        return;
    }
    
    if (defaultType) {
        // Auto-open finance setup for this type
        openFinanceSetup(targetIndex, defaultType);
    } else {
        location.reload();
    }
}

async function deleteCustomer(index) {
    const ok = await window.showPopup({
        title: 'Delete Customer',
        message: 'Are you sure you want to delete this customer? All their data will be lost.',
        isDanger: true,
        confirmText: 'Delete'
    });
    if (ok) {
        customers.splice(index, 1);
        await saveData();
        location.reload();
    }
}

function openEditModal(index) {
    const c = customers[index];
    if (!c) return;
    safeGet('edit-index').value = index;
    safeGet('edit-name').value = c.name || '';
    safeGet('edit-phone').value = c.phone || '';
    safeGet('edit-altPhone').value = c.altPhone || '';
    safeGet('edit-whatsapp').value = c.whatsapp || '';
    safeGet('edit-gpay').value = c.gpay || '';
    safeGet('edit-address').value = c.address || '';
    safeGet('edit-accountNo').value = c.accountNo || '';
    safeGet('edit-ifsc').value = c.ifsc || '';
    safeGet('edit-password').value = c.password || '';
    // Reset individual sync checkboxes
    ['altPhone', 'whatsapp', 'gpay'].forEach(f => {
        const chk = safeGet(`edit-sync-${f}`);
        if (chk) chk.checked = false;
    });
    // Clear any previous IFSC info
    const info = safeGet('edit-ifsc-info');
    if (info) info.innerText = '';
    
    openModal('edit-customer-modal');
}

async function handleEditCustomer(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const index = parseInt(data.index);
    if (isNaN(index) || !customers[index]) return;

    customers[index].name = data.name;
    customers[index].phone = data.phone;
    customers[index].altPhone = data.altPhone;
    customers[index].whatsapp = data.whatsapp;
    customers[index].gpay = data.gpay;
    customers[index].address = data.address;
    customers[index].accountNo = data.accountNo;
    customers[index].ifsc = data.ifsc;
    customers[index].password = data.password;

    await saveData();
    closeModal('edit-customer-modal');
    location.reload();
}

function openFinanceSetup(index, type) {
    safeGet('setup-cust-index').value = index;
    safeGet('setup-finance-type').value = type;
    safeGet('finance-setup-title').innerText = `Setup ${type}`;
    
    // Change Loan Amount label based on type
    const form = safeGet('finance-setup-form');
    let loanInput = null;
    if (form) {
        loanInput = form.querySelector('input[name="loanAmount"]');
        if (loanInput && loanInput.previousElementSibling) {
            loanInput.previousElementSibling.innerText = type === 'Rice Account' ? 'Total Rice Amount (₹)' : 
                (['Diwali Chit', 'Pongal Chit', 'Monthly Chit'].includes(type) ? 'Chit Value (Savings Goal)' : 'Loan Amount (Principal)');
        }
    }

    if (type === 'Diwali Chit' || type === 'Pongal Chit') {
        if (loanInput) {
            loanInput.value = 10400;
            loanInput.readOnly = true;
            loanInput.style.background = 'rgba(255,255,255,0.05)';
        }
        safeGet('dynamic-fields').innerHTML = `
            <div class="form-group"><label>Weekly Due (₹)</label><input type="number" name="weeklyDue" value="200" required oninput="window.generatePreview && window.generatePreview()"></div>
            <div class="form-group"><label>Weeks (Duration)</label><input type="number" name="duration" value="52" required oninput="window.generatePreview && window.generatePreview()"></div>
            <div class="form-group"><label>Estimated Interest (auto-calculated) (₹)</label><input type="number" name="expectedInterest" value="1600" readonly style="background:rgba(255,255,255,0.05); color: var(--success-color); font-weight: bold;"></div>
        `;
    } else if (type === 'Monthly Chit') {
        if (loanInput) loanInput.value = 50000;
        safeGet('dynamic-fields').innerHTML = `
            <div class="form-group"><label>Total Customers (Group Size)</label><input type="number" name="totalCustomers" value="20" required oninput="this.form.duration.value = this.value; window.generatePreview && window.generatePreview()"></div>
            <div class="form-group"><label>Monthly Due (₹) <small style="color:var(--text-secondary)">(Chit Value ÷ Members)</small></label><input type="number" name="monthlyDue" value="2500" required oninput="window.generatePreview && window.generatePreview()"></div>
            <div class="form-group" style="opacity:0.6; pointer-events:none;">
                <label>Months Duration <small style="color:#f59e0b;">⚡ Auto = Total Customers</small></label>
                <input type="number" name="duration" value="20" required readonly style="border-color:rgba(245,158,11,0.4); background:rgba(245,158,11,0.05);">
                <small style="color:#f59e0b; margin-top:4px; display:block;">Each customer wins the chit once — so no. of months = no. of members</small>
            </div>
        `;
    } else if (type === 'Rice Account') {
        safeGet('dynamic-fields').innerHTML = `
            <div class="form-group"><label>Rice Brand Name</label><input type="text" name="riceBrand" required></div>
            <div class="form-group"><label>Kg of Rice</label><input type="number" name="riceKg" required></div>
            <div class="form-group"><label>Duration (Weeks)</label><input type="number" name="duration" required oninput="window.generatePreview && window.generatePreview()"></div>
            <div class="form-group"><label>Weekly Due Payment (₹)</label><input type="number" name="weeklyDue" required oninput="window.generatePreview && window.generatePreview()"></div>
        `;
    } else if (type === 'Monthly Interest' || type === 'Weekly Interest') {
        safeGet('dynamic-fields').innerHTML = `
            <div class="form-group"><label>${type} Payment (₹)</label><input type="number" name="monthlyDue" required oninput="window.generatePreview && window.generatePreview()"></div>
            <div class="form-group"><label>Duration (Predicted)</label><input type="number" name="duration" required oninput="window.generatePreview && window.generatePreview()"></div>
        `;
    } else {
        const isWeekly = type.includes('Weekly');
        safeGet('dynamic-fields').innerHTML = isWeekly ? 
            `<div class="form-group"><label>Weekly Due</label><input type="number" name="weeklyDue" required oninput="window.generatePreview && window.generatePreview()"></div><div class="form-group"><label>Weeks</label><input type="number" name="duration" required oninput="window.generatePreview && window.generatePreview()"></div>` :
            `<div class="form-group"><label>Monthly Due</label><input type="number" name="monthlyDue" required oninput="window.generatePreview && window.generatePreview()"></div><div class="form-group"><label>Months</label><input type="number" name="duration" required oninput="window.generatePreview && window.generatePreview()"></div>`;
    }

    // Reset preview
    const previewContainer = safeGet('finance-preview-container');
    if(previewContainer) previewContainer.style.display = 'none';

    openModal('finance-setup-modal');
}

window.generatePreview = function() {
    const type = safeGet('setup-finance-type').value;
    const isWeeklyBased = type === 'Rice Account' || type.includes('Weekly');
    
    const previewContainer = safeGet('finance-preview-container');
    const datesList = safeGet('finance-dates-list');
    const previewTitle = previewContainer?.querySelector('div[style*="font-weight: 600"]');
    
    if (!previewContainer || !datesList) return;

    const durationInput = document.querySelector('#finance-setup-form input[name="duration"]');
    const dateInput = document.querySelector('#finance-setup-form input[name="startDate"]');
    const loanInput = document.querySelector('#finance-setup-form input[name="loanAmount"]');
    const dueInput = document.querySelector('#finance-setup-form input[name="weeklyDue"]') || document.querySelector('#finance-setup-form input[name="monthlyDue"]');
    
    if (!durationInput || !dateInput || !durationInput.value || !dateInput.value) {
        previewContainer.style.display = 'none';
        return;
    }

    const duration = parseInt(durationInput.value);
    const start = new Date(dateInput.value);
    
    if (type === 'Diwali Chit' || type === 'Pongal Chit') {
        const wDue = parseFloat(dueInput?.value || 0);
        if (wDue > 0 && duration > 0) {
            if (loanInput) loanInput.value = Math.round(wDue * duration);
            const intField = document.querySelector('#finance-setup-form input[name="expectedInterest"]');
            if (intField) {
                // weekly interest calculation base
                const weeklyInterest = wDue * (30.76923076923 / 200);
                intField.value = Math.round(weeklyInterest * duration);
            }
        }
    } else {
        const loan = parseFloat(loanInput?.value || 0);
        // Auto-calculate the due amount if loan and duration are provided
        if (loan > 0 && duration > 0 && dueInput && !type.includes('Interest')) {
            const calculatedDue = Math.round(loan / duration);
            dueInput.value = calculatedDue;
        }
    }
    
    if(duration <= 0) {
        previewContainer.style.display = 'none';
        return;
    }

    // Always find the next Sunday as the VERY FIRST due date
    let currentDue = new Date(start);
    const dayOfWeek = currentDue.getDay();
    const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    currentDue.setDate(currentDue.getDate() + daysUntilNextSunday);

    let hdml = '';
    if (isWeeklyBased) {
        datesList.style.gridTemplateColumns = "repeat(4, 1fr)";
        if(previewTitle) previewTitle.innerText = "Generated Sunday Due Dates:";
        for(let i=1; i<=duration; i++) {
            const d = String(currentDue.getDate()).padStart(2, '0');
            const m = String(currentDue.getMonth() + 1).padStart(2, '0');
            const y = String(currentDue.getFullYear()).slice(-2); // Short year for 4 col
            hdml += `<div title="${d}/${m}/${y}">W${i}: <span style="color:var(--text-primary); font-weight:600;">${d}/${m}</span></div>`;
            currentDue.setDate(currentDue.getDate() + 7);
        }
    } else {
        datesList.style.gridTemplateColumns = "1fr 1fr";
        if(previewTitle) previewTitle.innerText = "Generated Monthly Due Dates:";
        for(let i=1; i<=duration; i++) {
            const d = String(currentDue.getDate()).padStart(2, '0');
            const m = String(currentDue.getMonth() + 1).padStart(2, '0');
            const y = currentDue.getFullYear();
            hdml += `<div>Month ${i}: <span style="color:var(--text-primary); font-weight:600;">${d}/${m}/${y}</span></div>`;
            currentDue.setMonth(currentDue.getMonth() + 1);
        }
    }
    
    datesList.innerHTML = hdml;
    previewContainer.style.display = 'block';
};

window.handleFinanceSubmit = async function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.uid = 'acc_' + Date.now();
    const custIndex = parseInt(safeGet('setup-cust-index').value);
    const type = safeGet('setup-finance-type').value;
    
    if (isNaN(custIndex) || !customers[custIndex]) {
        window.showPopup({
            type: 'alert',
            title: 'Error',
            message: "Error: Customer not found. Please try again."
        });
        return;
    }

    data.type = type;
    data.duration = parseInt(data.duration) || 0;
    data.loanAmount = parseFloat(data.loanAmount) || 0;
    data.weeklyDue = parseFloat(data.weeklyDue || 0);
    data.monthlyDue = parseFloat(data.monthlyDue || 0);

    if(!customers[custIndex].financeAccounts) customers[custIndex].financeAccounts = [];
    customers[custIndex].financeAccounts.push(data);
    
    await saveData();
    
    if (window.isPayoutFlow) {
        closeModal('finance-setup-modal');
        if (window.onPayoutSetupComplete) {
            window.onPayoutSetupComplete(custIndex, customers[custIndex].financeAccounts.length - 1, data.loanAmount);
        }
        return;
    }
    
    location.reload();
};

function viewCustomerDetails(index) {
    const c = customers[index];
    if (!c) return;
    safeGet('details-customer-name').innerText = c.name;
    safeGet('details-customer-info').innerText = `Primary Mobile: ${c.phone}`;
    
    // Comprehensive Profile Card
    safeGet('details-personal-info').innerHTML = `
        <div class="p-info-item"><strong>Mobile:</strong> <span>${c.phone}</span></div>
        <div class="p-info-item"><strong>Phone:</strong> <span>${c.altPhone || '—'}</span></div>
        <div class="p-info-item"><strong>WhatsApp:</strong> <span>${c.whatsapp || '—'}</span></div>
        <div class="p-info-item"><strong>GPay:</strong> <span>${c.gpay || '—'}</span></div>
        <div class="p-info-item" style="grid-column: span 1;"><strong>Acct No:</strong> <span>${c.accountNo || '—'}</span></div>
        <div class="p-info-item" style="grid-column: span 1;"><strong>IFSC Code:</strong> <span>${c.ifsc || '—'}</span></div>
        <div class="p-info-item" style="grid-column: span 2;"><strong>Address:</strong> <span>${c.address || '—'}</span></div>
    `;
    
    // Clear and populate finance lists
    const types = {
        'Weekly Finance': 'details-weekly-list',
        'Monthly Finance': 'details-monthly-list',
        'Diwali Chit': 'details-diwali-list',
        'Pongal Chit': 'details-pongal-list',
        'Monthly Chit': 'details-monthly-chit-list',
        'Rice Account': 'details-rice-list'
    };

    Object.values(types).forEach(id => {
        const el = safeGet(id);
        if (el) el.innerHTML = '<div style="opacity:0.5;font-size:0.8rem;">No active accounts.</div>';
    });

    (c.financeAccounts || []).forEach((acc, accIdx) => {
        const listId = types[acc.type];
        const listEl = safeGet(listId);
        if (listEl) {
            if (listEl.innerHTML.includes('No active accounts')) listEl.innerHTML = '';
            const div = document.createElement('div');
            div.style.marginBottom = '5px';
            div.style.padding = '8px';
            div.style.background = 'rgba(255,255,255,0.05)';
            div.style.borderRadius = '6px';
            
            let extraRiceInfo = '';
            if (acc.type === 'Rice Account') {
                extraRiceInfo = `<div style="font-size:0.75rem;color:var(--primary-color);margin-top:2px;">Rice: ${acc.riceBrand || 'N/A'} - ${acc.riceKg || 0}kg</div>`;
            }

            let accTotalInterest = 0;
            if(acc.payments) {
                Object.values(acc.payments).forEach(p => {
                    if(p.interest) accTotalInterest += (parseFloat(p.interest) || 0);
                });
            }
            let displayTotal = (parseFloat(acc.loanAmount)||0) + accTotalInterest;

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight:600;font-size:0.85rem;">₹${displayTotal.toLocaleString()}</div>
                        <div style="font-size:0.75rem;opacity:0.7;">Due: ₹${(parseFloat(acc.monthlyDue || acc.weeklyDue || 0)).toLocaleString()} | ${acc.duration} ${acc.type.includes('Weekly') || acc.type.includes('Rice') ? 'Weeks' : 'Months'}</div>
                        <div style="font-size:0.7rem;opacity:0.6;margin-top:2px;">Assigned: ${acc.startDate}</div>
                        <div style="font-size:0.7rem;color:var(--primary-color);font-weight:500;">First Due: ${(() => {
                            const d = new Date(acc.startDate);
                            const dow = d.getDay();
                            d.setDate(d.getDate() + (dow === 0 ? 7 : 7 - dow));
                            return d.toLocaleDateString('en-GB');
                        })()}</div>
                        ${extraRiceInfo}
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="secondary-btn small" title="Collect Payment" onclick="openCollectPayment(${index}, ${accIdx})" style="padding: 2px 6px; color: var(--success-color);"><i class="fa-solid fa-hand-holding-dollar"></i></button>
                        <button class="secondary-btn small" title="View Report" onclick="viewAccountHistoryReport(${index}, ${accIdx})" style="padding: 2px 6px; color: var(--primary-color);"><i class="fa-solid fa-chart-line"></i></button>
                        <button class="secondary-btn small" title="Delete Account" onclick="deleteFinanceAccount(${index}, ${accIdx})" style="padding: 2px 6px; box-shadow: none; border-color: transparent; background: transparent; color: var(--danger-color); transform: none;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            listEl.appendChild(div);
        }
    });

    // Render Past Accounts
    const pastList = safeGet('details-past-list');
    if (pastList) {
        pastList.innerHTML = (c.pastAccounts || []).length === 0 ? '<div style="opacity:0.4; font-size:0.85rem;">No completed account history.</div>' : '';
        (c.pastAccounts || []).forEach((acc, pIdx) => {
            const div = document.createElement('div');
            div.style.padding = '12px';
            div.style.background = 'rgba(255,255,255,0.03)';
            div.style.borderRadius = '10px';
            div.style.border = '1px solid rgba(255,255,255,0.1)';
            
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div style="font-weight:700; font-size:0.9rem; color:var(--primary-color);">${acc.type}</div>
                    <span style="font-size:0.7rem; padding:2px 6px; background:rgba(16,185,129,0.1); color:#10b981; border-radius:10px;">COMPLETED</span>
                </div>
                <div style="font-size:0.8rem; margin-bottom:10px;">
                    <div>Principal: ₹${(parseFloat(acc.loanAmount)||0).toLocaleString()}</div>
                    <div style="opacity:0.7;">Period: ${acc.startDate} to ${acc.completedDate || 'N/A'}</div>
                </div>
                <button class="primary-btn small" style="width:100%; border-radius:8px;" onclick="viewAccountHistoryReport(${index}, ${pIdx}, true)">
                    <i class="fa-solid fa-file-invoice"></i> View History Report
                </button>
            `;
            pastList.appendChild(div);
        });
    }

    openModal('customer-details-modal');
}

window.deleteFinanceAccount = async function(custIndex, accIndex) {
    const ok = await window.showPopup({
        title: 'Delete Account',
        message: 'Are you sure you want to completely delete this specific account? This action cannot be undone.',
        isDanger: true,
        confirmText: 'Delete'
    });
    if (ok) {
        customers[custIndex].financeAccounts.splice(accIndex, 1);
        saveData();
        viewCustomerDetails(custIndex); // Refresh modal view
        
        // Let lists re-render. Easiest way to sync state cleanly is reload.
        setTimeout(() => location.reload(), 200);
    }
}

window.markUserActivity = async function(idx, status) {
    const cust = customers[idx];
    if (!cust) return;

    if (status === 'inactive') {
        const activeAccounts = cust.financeAccounts || [];
        if (activeAccounts.length === 0) {
            window.showPopup({ type: 'alert', title: 'No Accounts', message: 'This user has no active accounts to complete.' });
            return;
        }

        safeGet('inactivity-cust-name').innerText = cust.name;
        const modal = safeGet('inactivity-selection-modal');
        modal.querySelector('h3').innerText = 'Complete Specific Accounts';
        
        const listContainer = safeGet('inactivity-account-list');
        listContainer.innerHTML = '';

        activeAccounts.forEach((acc, i) => {
            const div = document.createElement('div');
            div.className = 'selectable-item';
            div.style.padding = '12px';
            div.style.background = 'rgba(255,255,255,0.05)';
            div.style.borderRadius = '10px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '12px';
            div.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = i;
            checkbox.checked = true;
            checkbox.id = `acc-check-${i}`;
            checkbox.style.width = '18px';
            checkbox.style.height = '18px';

            const label = document.createElement('label');
            label.htmlFor = `acc-check-${i}`;
            label.style.flex = '1';
            label.style.cursor = 'pointer';
            label.innerHTML = `
                <div style="font-weight:600; font-size: 0.95rem;">${acc.type}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">₹${(parseFloat(acc.loanAmount)||0).toLocaleString()} | Started: ${acc.startDate}</div>
            `;

            div.onclick = (e) => {
                if(e.target !== checkbox) checkbox.checked = !checkbox.checked;
            };

            div.appendChild(checkbox);
            div.appendChild(label);
            listContainer.appendChild(div);
        });

        const confirmBtn = safeGet('confirm-inactivity-btn');
        confirmBtn.innerText = 'Mark Selected as Inactive';
        confirmBtn.style.background = 'var(--primary-color)';
        confirmBtn.style.display = 'inline-block';
        
        // Hide fresh button if it exists
        const freshBtn = safeGet('fresh-reactivate-btn');
        if (freshBtn) freshBtn.style.display = 'none';
        
        confirmBtn.onclick = async () => {
            const selectedIndices = Array.from(listContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
            
            if (selectedIndices.length === 0) {
                const okAll = await window.showPopup({
                    title: 'No Selection',
                    message: 'No accounts selected. Would you like to move ALL active accounts to history?',
                    confirmText: 'Move All',
                    cancelText: 'Cancel'
                });
                if (okAll) {
                    // Move all accounts
                    if (!cust.pastAccounts) cust.pastAccounts = [];
                    const now = new Date().toISOString().split('T')[0];
                    activeAccounts.forEach(acc => {
                        acc.completedDate = now;
                        cust.pastAccounts.push(acc);
                    });
                    cust.financeAccounts = [];
                    saveData();
                    location.reload();
                }
                return;
            }

            const ok = await window.showPopup({
                title: 'Confirm Operation',
                message: `Are you sure you want to move ${selectedIndices.length} account(s) to history?`,
                confirmText: 'Confirm'
            });

            if (ok) {
                if (!cust.pastAccounts) cust.pastAccounts = [];
                const now = new Date().toISOString().split('T')[0];
                selectedIndices.forEach(i => {
                    const [acc] = cust.financeAccounts.splice(i, 1);
                    acc.completedDate = now;
                    cust.pastAccounts.push(acc);
                });

                saveData();
                location.reload();
            }
        };

        openModal('inactivity-selection-modal');

    } else if (status === 'active') {
        const pastAccounts = cust.pastAccounts || [];
        
        if (pastAccounts.length === 0) {
            // If nothing to restore, immediately open category selection for fresh start
            openSelectCategoryModal(idx);
            return;
        }
        
        safeGet('inactivity-cust-name').innerText = cust.name;
        const modal = safeGet('inactivity-selection-modal');
        modal.querySelector('h3').innerText = 'Restore User Account';
        
        const listContainer = safeGet('inactivity-account-list');
        listContainer.innerHTML = '';

        pastAccounts.forEach((acc, i) => {
            const div = document.createElement('div');
            div.className = 'selectable-item';
            div.style.padding = '12px';
            div.style.background = 'rgba(255,255,255,0.05)';
            div.style.borderRadius = '10px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '12px';
            div.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = i;
            checkbox.checked = true;
            checkbox.id = `past-acc-check-${i}`;
            checkbox.style.width = '18px';
            checkbox.style.height = '18px';

            const label = document.createElement('label');
            label.htmlFor = `past-acc-check-${i}`;
            label.style.flex = '1';
            label.style.cursor = 'pointer';
            label.innerHTML = `
                <div style="font-weight:600; font-size: 0.95rem;">${acc.type}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">₹${(parseFloat(acc.loanAmount)||0).toLocaleString()} (Completed)</div>
            `;

            div.onclick = (e) => {
                if(e.target !== checkbox) checkbox.checked = !checkbox.checked;
            };

            div.appendChild(checkbox);
            div.appendChild(label);
            listContainer.appendChild(div);
        });

        const confirmBtn = safeGet('confirm-inactivity-btn');
        confirmBtn.innerText = 'Restore Selected';
        confirmBtn.style.background = 'var(--success-color)';
        confirmBtn.style.display = pastAccounts.length > 0 ? 'inline-block' : 'none';
        
        // Add "Reactivate Fresh" button logic
        let freshBtn = safeGet('fresh-reactivate-btn');
        if (!freshBtn) {
            freshBtn = document.createElement('button');
            freshBtn.id = 'fresh-reactivate-btn';
            freshBtn.className = 'primary-btn';
            freshBtn.style.flex = '1';
            freshBtn.style.width = 'auto';
            freshBtn.style.background = 'var(--primary-color)';
            freshBtn.innerText = 'Reactivate Freshly';
            confirmBtn.parentNode.appendChild(freshBtn);
        }
        freshBtn.style.display = 'inline-block';
        freshBtn.onclick = () => {
            closeModal('inactivity-selection-modal');
            openSelectCategoryModal(idx);
        };

        confirmBtn.onclick = async () => {
            const selectedIndices = Array.from(listContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
            
            if (selectedIndices.length === 0) {
                const okFresh = await window.showPopup({
                    title: 'No Selection',
                    message: 'No past accounts selected. Would you like to reactivate this user with a fresh account instead?',
                    confirmText: 'Yes, Start Fresh',
                    cancelText: 'Cancel'
                });
                if (okFresh) {
                    closeModal('inactivity-selection-modal');
                    openSelectCategoryModal(idx);
                }
                return;
            }

            const ok = await window.showPopup({
                title: 'Confirm Restoration',
                message: `Are you sure you want to restore ${selectedIndices.length} account(s) back to active status?`,
                confirmText: 'Restore'
            });

            if (ok) {
                if (!cust.financeAccounts) cust.financeAccounts = [];
                selectedIndices.forEach(i => {
                    const [acc] = cust.pastAccounts.splice(i, 1);
                    delete acc.completedDate;
                    cust.financeAccounts.push(acc);
                });

                saveData();
                location.reload();
            }
        };

        openModal('inactivity-selection-modal');
    }
}

function handleCreateChit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.value = parseInt(data.totalValue);
    data.description = `${(data.value/100000).toFixed(1)}L / ${data.months} Months`;
    chitGroups.push(data);
    saveData();
    location.reload();
}

function openSelectCategoryModal(index) {
    const list = safeGet('category-selection-list');
    if (!list) return;
    list.innerHTML = '';
    
    const cust = customers[index];
    if (!cust) return;
    const existingTypes = (cust.financeAccounts || []).map(a => a.type);

    Object.keys(FINANCE_BTN_MAP).forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'primary-btn small';
        btn.style.width = '100%';
        btn.style.textAlign = 'left';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '10px';
        
        const activeCount = existingTypes.filter(t => t === type).length;
        const icon = FINANCE_BTN_MAP[type].icon;
        
        btn.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${type}</span> ${activeCount > 0 ? `<small style="margin-left:auto;opacity:0.6;">(${activeCount} Active)</small>` : ''}`;
        btn.onclick = () => {
            closeModal('select-category-modal');
            openFinanceSetup(index, type);
        };
        list.appendChild(btn);
    });
    
    openModal('select-category-modal');
}

// --- CUSTOMER PORTAL ---
function renderCustomerPassbook(c) {
    if (!c) return;
    
    // Calculate total payments made by the customer
    const totalPayments = (c.transactions || [])
        .filter(tx => tx.type === 'Payment')
        .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

    let totalGeneratedDue = 0;
    accounts.forEach(acc => {
        const total = parseInt(acc.duration) || 1;
        const amt = parseFloat(acc.monthlyDue || acc.weeklyDue || 0);
        const start = new Date(acc.startDate);
        const dayOfWeek = start.getDay();
        const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
        const firstDue = new Date(start);
        firstDue.setDate(start.getDate() + daysUntilNextSunday);

        let passed = 0;
        const today = new Date();
        if (today >= firstDue) {
            if (acc.type === 'Weekly Finance' || acc.type === 'Rice Account') {
                passed = Math.floor(Math.abs(today - firstDue) / (1000 * 60 * 60 * 24 * 7)) + 1;
            } else {
                passed = (today.getFullYear() - firstDue.getFullYear()) * 12 + (today.getMonth() - firstDue.getMonth());
                if (today.getDate() >= firstDue.getDate()) passed += 1;
            }
        }
        passed = Math.min(passed, total);
        totalGeneratedDue += (passed * amt);
        
        // Also add any manual interest from the admin
        if (acc.payments) {
            Object.values(acc.payments).forEach(p => {
                if (p.interest) totalGeneratedDue += (parseFloat(p.interest) || 0);
            });
        }
    });

    const currentDue = Math.max(0, totalGeneratedDue - totalPayments);
    if (safeGet('cust-total-due')) safeGet('cust-total-due').innerText = `₹${currentDue.toLocaleString()}`;

    // Render Accounts
    const accList = safeGet('customer-accounts-list');
    if (accList) {
        accList.innerHTML = accounts.length === 0 ? '<div class="pb-no-accounts">No active accounts.</div>' : '';
        accounts.forEach(acc => {
            const div = document.createElement('div');
            div.className = 'account-mini-card';
            const total = parseInt(acc.duration) || 1;
            const amt = parseFloat(acc.monthlyDue || acc.weeklyDue || 0);
            const start = new Date(acc.startDate);
            const today = new Date();
            let passed = 0;
            if (acc.type === 'Weekly Finance' || acc.type === 'Rice Account') {
                passed = Math.floor(Math.abs(today - start) / (1000 * 60 * 60 * 24 * 7));
            } else {
                passed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
            }
            passed = Math.max(0, Math.min(passed, total));
            const pct = (passed / total) * 100;

            let extraRiceInfo = '';
            if (acc.type === 'Rice Account') {
                extraRiceInfo = `<div class="acc-detail"><span class="acc-label">Rice Details</span><span class="acc-value">${acc.riceBrand || 'N/A'} - ${acc.riceKg || 0}kg</span></div>`;
            }

            let accTotalInterest = 0;
            if(acc.payments) {
                Object.values(acc.payments).forEach(p => {
                    if(p.interest) accTotalInterest += (parseFloat(p.interest) || 0);
                });
            }
            let displayTotal = (parseFloat(acc.loanAmount)||0) + accTotalInterest;

            div.innerHTML = `
                <h4>${acc.type} <span style="font-size:0.8rem;opacity:0.7">Started: ${acc.startDate}</span></h4>
                <div class="acc-detail"><span class="acc-label">${acc.type === 'Rice Account' ? 'Total Rice Amount' : 'Loan Amount'}</span><span class="acc-value">₹${displayTotal.toLocaleString()}</span></div>
                ${extraRiceInfo}
                <div class="acc-detail"><span class="acc-label">Due Amount</span><span class="acc-value">₹${amt.toLocaleString()}</span></div>
                <div class="acc-detail"><span class="acc-label">Paid/Total</span><span class="acc-value">${passed}/${total}</span></div>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${pct}%"></div></div>
            `;
            accList.appendChild(div);
        });
    }

    // Render Transactions
    const txList = safeGet('customer-transactions');
    if (txList) {
        const txs = c.transactions || [];
        txList.innerHTML = txs.length === 0 ? '<li>No recent transactions.</li>' : '';
        txs.slice().reverse().forEach(tx => {
            const li = document.createElement('li');
            li.className = 'transaction-item';
            li.innerHTML = `
                <div>
                    <div class="tx-desc">${tx.description || 'Payment'}</div>
                    <div class="tx-date">${tx.date}</div>
                </div>
                <div class="tx-amount plus">+₹${(parseFloat(tx.amount)||0).toLocaleString()}</div>
            `;
            txList.appendChild(li);
        });
    }
}

// --- IFSC FINDER LOGIC ---
let ifscFinderState = {
    targetId: null,
    bankCode: null,
    bankName: null,
    allBanks: {}, // Full list: { CODE: "NAME" }
    majorBanks: {
        "SBIN": "STATE BANK OF INDIA",
        "HDFC": "HDFC BANK",
        "ICIC": "ICICI BANK LTD",
        "UTIB": "AXIS BANK",
        "IDFB": "IDFC FIRST BANK",
        "PUNB": "PUNJAB NATIONAL BANK",
        "BARB": "BANK OF BARODA",
        "CNRB": "CANARA BANK",
        "IDIB": "INDIAN BANK",
        "UBIN": "UNION BANK OF INDIA",
        "KKBK": "KOTAK MAHINDRA BANK",
        "INDB": "INDUSIND BANK",
        "IOBA": "INDIAN OVERSEAS BANK",
        "TMBL": "TAMILNAD MERCANTILE BANK LTD",
        "KVBL": "KARUR VYSYA BANK",
        "SIBL": "SOUTH INDIAN BANK",
        "KARB": "KARNATAKA BANK",
        "CSBK": "CSB BANK LTD",
        "FDRL": "FEDERAL BANK",
        "YESB": "YES BANK"
    }
};

async function openIFSCFinder(targetId) {
    ifscFinderState.targetId = targetId;
    ifscFinderState.bankCode = null;
    ifscFinderState.bankName = null;
    
    showIFSCStep('bank');
    openModal('ifsc-finder-modal');
    
    const list = safeGet('ifsc-bank-list');
    list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary)">Loading major banks...</div>';
    
    renderIFSCBanks(ifscFinderState.majorBanks);
    
    try {
        const res = await fetch('https://cdn.jsdelivr.net/gh/razorpay/ifsc@master/src/banknames.json');
        if (res.ok) {
            ifscFinderState.allBanks = await res.json();
            // Optional: Re-render with full list if they haven't started searching
            if (!safeGet('ifsc-bank-search').value) {
                renderIFSCBanks(ifscFinderState.majorBanks); // Stay with major banks initially
            }
        }
    } catch (e) {
        console.error("Could not load full bank list.");
        ifscFinderState.allBanks = ifscFinderState.majorBanks;
    }
}

function renderIFSCBanks(banks) {
    const list = safeGet('ifsc-bank-list');
    const entries = Object.entries(banks);
    if (entries.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary)">No banks found.</div>';
        return;
    }
    list.innerHTML = entries.map(([code, name]) => `
        <div class="selectable-item" onclick="window.selectIFSCBank('${code}', '${name.replace(/'/g, "\\'")}')">
            <span>${name}</span>
            <span style="font-size:0.75rem; color:var(--primary-color); opacity:0.8; font-weight:bold;">${code}</span>
        </div>
    `).join('');
}

function filterIFSCBanks() {
    const query = safeGet('ifsc-bank-search').value.toUpperCase();
    if (!query) {
        renderIFSCBanks(ifscFinderState.majorBanks);
        return;
    }
    
    const source = Object.keys(ifscFinderState.allBanks).length > 0 ? ifscFinderState.allBanks : ifscFinderState.majorBanks;
    const filtered = {};
    Object.entries(source).forEach(([code, name]) => {
        if (name.includes(query) || code.includes(query)) {
            filtered[code] = name;
        }
    });
    renderIFSCBanks(filtered);
}

function showIFSCStep(step) {
    const steps = ['bank', 'branch']; // Only 2 steps now
    steps.forEach(s => {
        const el = safeGet(`ifsc-step-${s}`);
        if (el) el.classList.toggle('hidden', s !== step);
    });
}

function selectIFSCBank(code, name) {
    ifscFinderState.bankCode = code;
    ifscFinderState.bankName = name;
    
    const selectedLabel = safeGet('ifsc-selected-bank');
    if (selectedLabel) selectedLabel.innerText = name;
    
    showIFSCStep('branch');
    safeGet('ifsc-branch-list').innerHTML = '';
    safeGet('ifsc-branch-search').value = '';
    safeGet('ifsc-branch-search').focus();
}

async function searchIFSCBranches() {
    const query = safeGet('ifsc-branch-search').value.trim();
    if (!query) return;
    
    const list = safeGet('ifsc-branch-list');
    list.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-secondary)">
        <i class="fas fa-spinner fa-spin"></i> Searching branches...
    </div>`;
    
    const baseUrl = `https://ifsc.razorpay.com/search?bankcode=${ifscFinderState.bankCode}&q=${encodeURIComponent(query)}`;
    
    try {
        // Attempt 1: Direct fetch (Fastest, but might fail due to CORS)
        let res;
        try {
            res = await fetch(baseUrl);
            if (res.ok) {
                const data = await res.json();
                renderBranchResults(data);
                return;
            }
        } catch (directErr) {
            console.log("Direct search failed (likely CORS), trying proxies...");
        }

        // Attempt 2: allorigins.win proxy
        try {
            const proxy1Url = `https://api.allorigins.win/get?url=${encodeURIComponent(baseUrl)}`;
            res = await fetch(proxy1Url);
            if (res.ok) {
                const proxyData = await res.json();
                if (proxyData.contents) {
                    renderBranchResults(JSON.parse(proxyData.contents));
                    return;
                }
            }
        } catch (proxy1Err) {
            console.log("Primary proxy failed, trying secondary...");
        }

        // Attempt 3: corsproxy.io
        const proxy2Url = `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`;
        res = await fetch(proxy2Url);
        if (res.ok) {
            const data = await res.json();
            renderBranchResults(data);
            return;
        }

        // If all attempts fail, throw error to trigger catch block
        throw new Error("All search mechanisms failed.");
        
    } catch (finalErr) {
        console.error("IFSC Search Error:", finalErr);
        list.innerHTML = '<div style="padding:20px; color:var(--danger-color); text-align:center;">Network error. Please type your branch name/city and try again, or enter the IFSC code manually.</div>';
    }
}

function renderBranchResults(data) {
    const list = safeGet('ifsc-branch-list');
    if (data.data && data.data.length > 0) {
        list.innerHTML = data.data.map(b => `
            <div class="selectable-item" onclick="window.selectIFSCBranch('${b.BRANCH.replace(/'/g, "\\'")}', '${b.IFSC}')">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600; color:var(--text-primary)">${b.BRANCH}</span>
                    <span style="font-size:0.75rem; color:var(--text-secondary); line-height:1.2; margin-top:2px;">${b.ADDRESS || ''}</span>
                    <span style="font-size:0.7rem; color:var(--text-secondary); opacity:0.8;">${b.CITY || ''}, ${b.STATE || ''}</span>
                </div>
                <span class="ifsc-tag">${b.IFSC}</span>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<div style="padding:20px; color:var(--text-secondary); text-align:center;">No branches found for this bank matching your search. Try a broader search (e.g., just the city name).</div>';
    }
}

// No more selectIFSCState, selectIFSCDistrict needed for the new flow

function selectIFSCBranch(branch, ifsc) {
    const target = safeGet(ifscFinderState.targetId);
    if (target) {
        target.value = ifsc;
        verifyIFSC(ifscFinderState.targetId);
    }
    closeModal('ifsc-finder-modal');
}

// --- HELPERS ---
async function verifyIFSC(fieldId) {
    const field = safeGet(fieldId);
    const info  = safeGet(fieldId + '-info');
    if (!field || !info) return;

    const code = field.value.trim().toUpperCase();
    if (code.length < 11) {
        info.innerText = 'Enter 11-digit IFSC code.';
        info.style.color = 'var(--danger-color)';
        return;
    }

    info.innerText = '⌛ Verifying...';
    info.style.color = 'var(--primary-color)';

    try {
        const res = await fetch(`https://ifsc.razorpay.com/${code}`);
        if (!res.ok) throw new Error('Invalid IFSC Code');
        const data = await res.json();
        info.innerText = `✅ ${data.BANK}, ${data.BRANCH}`;
        info.style.color = '#10b981';
    } catch (err) {
        info.innerText = '❌ Invalid IFSC. Please check and try again.';
        info.style.color = 'var(--danger-color)';
    }
}

function toggleSync(prefix, field) {
    const check = safeGet(`${prefix}-sync-${field}`);
    if (!check) return;
    check.checked = !check.checked;
    const target = safeGet(`${prefix}-${field}`);
    if (check.checked) {
        const mobile = safeGet(`${prefix}-phone`).value;
        if (target) target.value = mobile;
    } else {
        if (target) target.value = '';
    }
}


// --- PAYMENT & HISTORY SYSTEM ---
window.openCollectPayment = function(custIdx, accIdx) {
    const cust = customers[custIdx];
    const acc = cust.financeAccounts[accIdx];
    if (!cust || !acc) return;

    safeGet('payment-cust-index').value = custIdx;
    safeGet('payment-acc-index').value = accIdx;
    safeGet('payment-account-name').innerText = `Account: ${acc.type} (₹${(parseFloat(acc.loanAmount)||0).toLocaleString()})`;
    safeGet('payment-amount-input').value = acc.monthlyDue || acc.weeklyDue || 0;
    safeGet('payment-date-input').value = new Date().toISOString().split('T')[0];

    openModal('collect-payment-modal');
};

window.handleCollectPayment = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const custIdx = parseInt(data.custIndex || safeGet('payment-cust-index').value);
    const accIdx = parseInt(data.accIndex || safeGet('payment-acc-index').value);
    const cust = customers[custIdx];
    const acc = cust.financeAccounts[accIdx];

    if (!cust || !acc) return;

    const tx = {
        amount: parseFloat(data.amount),
        date: data.date,
        description: `Payment: ${acc.type} (Principal: ₹${acc.loanAmount})`,
        accountType: acc.type,
        accId: acc.uid || acc.startDate // fallback to startDate if no UID
    };

    if (!cust.transactions) cust.transactions = [];
    cust.transactions.push(tx);
    saveData();
    closeModal('collect-payment-modal');
    window.showPopup({ type: 'alert', title: 'Payment Success', message: `₹${tx.amount.toLocaleString()} received and recorded.` });
    
    // Refresh if viewing details
    if (!safeGet('customer-details-modal').classList.contains('hidden')) {
        viewCustomerDetails(custIdx);
    } else {
        location.reload();
    }
};

window.viewAccountHistoryReport = function(custIdx, accIdx, isPast = false) {
    const cust = customers[custIdx];
    const acc = isPast ? cust.pastAccounts[accIdx] : cust.financeAccounts[accIdx];
    if (!cust || !acc) return;

    const report = calculateAccountReport(cust, acc);
    
    safeGet('report-total-duration').innerText = `${acc.duration} ${acc.type.includes('Weekly') || acc.type.includes('Rice') ? 'Weeks' : 'Months'} (Entered)`;
    safeGet('report-paid-count').innerText = `${report.paidCount} / ${report.totalDuration} (To Date)`;
    safeGet('report-skipped-count').innerText = report.skippedCount;
    safeGet('report-total-penalty').innerText = `₹${report.totalPenalty.toLocaleString()}`;

    const list = safeGet('report-skip-list');
    if (report.skips.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; opacity:0.5;">No skipped payments found! Good standing.</div>';
    } else {
        list.innerHTML = report.skips.map(s => `
            <div style="display:flex; justify-content:space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="font-size:0.85rem;">${s.date}</span>
                <span style="font-size:0.85rem; color:var(--danger-color); font-weight:600;">Penalty: ₹${s.penalty}</span>
            </div>
        `).join('');
    }

    openModal('account-history-modal');
};

function calculateAccountReport(cust, acc) {
    const start = new Date(acc.startDate);
    const end = acc.completedDate ? new Date(acc.completedDate) : new Date();
    const isWeekly = acc.type.includes('Weekly') || acc.type.includes('Rice');
    
    let totalExpected = 0;
    const expectedDates = [];

    if (isWeekly) {
        // Expected Sundays
        let curr = new Date(start);
        while (curr <= end) {
            if (curr.getDay() === 0) { // Sunday
                expectedDates.push(new Date(curr).toISOString().split('T')[0]);
            }
            curr.setDate(curr.getDate() + 1);
        }
    } else {
        // Expected Months
        let curr = new Date(start);
        while (curr <= end) {
            expectedDates.push(new Date(curr).toISOString().split('T')[0]);
            curr.setMonth(curr.getMonth() + 1);
        }
    }

    const txs = (cust.transactions || []).filter(tx => 
        tx.accountType === acc.type && (tx.accId === (acc.uid || acc.startDate))
    );

    const skips = [];
    let paidCount = 0;

    expectedDates.forEach(dateStr => {
        const paid = txs.some(tx => {
            // Check if transaction date matches or is very close (within 3 days for weekly)
            const txDate = new Date(tx.date);
            const expDate = new Date(dateStr);
            const diffDays = Math.abs(txDate - expDate) / (1000 * 60 * 60 * 24);
            return isWeekly ? diffDays <= 3 : diffDays <= 15;
        });

        if (paid) {
            paidCount++;
        } else {
            const penalty = isWeekly ? 100 : 200; // ₹100 for week, ₹200 for month
            skips.push({ date: dateStr, penalty });
        }
    });

    return {
        totalDuration: expectedDates.length,
        paidCount,
        skippedCount: skips.length,
        totalPenalty: skips.reduce((sum, s) => sum + s.penalty, 0),
        skips
    };
}

window.handleFinanceClick = function(custIdx, accIdx, type) {
    const cust = customers[custIdx];
    if (!cust) return;
    
    // Find ALL accounts of this type for this customer
    let matchingAccounts = [];
    (cust.financeAccounts || []).forEach((a, i) => {
        if (a.type === type) matchingAccounts.push({...a, originalIndex: i});
    });

    if (matchingAccounts.length === 0) {
        openFinanceSetup(custIdx, type);
    } else if (matchingAccounts.length === 1) {
        // Just open the single existing one directly
        openAccountPaymentManagement(custIdx, matchingAccounts[0].originalIndex);
    } else {
        // Create an on-the-fly modal for multiple identical accounts
        let modal = document.getElementById('dynamic-multi-account-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dynamic-multi-account-modal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <span class="close-btn" onclick="closeModal('dynamic-multi-account-modal')"><i class="fa-solid fa-xmark"></i></span>
                    <div class="modal-header">
                        <h3>Select Account</h3>
                        <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:5px;">This customer holds multiple <span id="dyn-multi-type" style="color:var(--primary-color)"></span> accounts.</p>
                    </div>
                    <div id="dyn-multi-list" style="display: grid; gap: 10px; margin-top: 20px;">
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        document.getElementById('dyn-multi-type').innerText = type;
        const list = document.getElementById('dyn-multi-list');
        list.innerHTML = '';
        
        matchingAccounts.forEach((acc, i) => {
            const btn = document.createElement('button');
            btn.className = 'primary-btn small';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '10px';
            btn.style.background = 'var(--primary-color)';
            
            const label = (i === matchingAccounts.length - 1) ? 'Current Account' : (matchingAccounts.length > 2 ? `Previous Account #${i+1}` : 'Previous Account');
            btn.innerHTML = `<i class="fa-solid fa-book-open"></i> <span>${label}</span> <small style="margin-left:auto;opacity:0.8;">(Principal: ₹${(parseFloat(acc.loanAmount)||0).toLocaleString()})</small>`;
            
            btn.onclick = () => {
                closeModal('dynamic-multi-account-modal');
                openAccountPaymentManagement(custIdx, acc.originalIndex);
            };
            list.appendChild(btn);
        });
        
        openModal('dynamic-multi-account-modal');
    }
};

window.openAccountPaymentManagement = function(custIdx, accIdx) {
    const cust = customers[custIdx];
    const acc = cust.financeAccounts[accIdx];
    if (!cust || !acc) return;

    const isWeekly = acc.type.includes('Weekly') || acc.type.includes('Rice') || ['Diwali Chit', 'Pongal Chit'].includes(acc.type);
    const periodLabel = isWeekly ? 'Week' : 'Month';
    
    safeGet('weekly-pay-title').innerText = `Manage Payments: ${cust.name} (${acc.type})`;
    
    // Calculate total paid and remaining
    const dueAmount = parseFloat(acc.weeklyDue || acc.monthlyDue || 0);
    const totalDuration = parseInt(acc.duration) || 0;
    const totalLoan = parseFloat(acc.loanAmount || 0);
    
    if (!acc.payments) acc.payments = {};
    
    let paidCount = 0;
    let totalFines = 0;
    let paidFines = 0;
    Object.entries(acc.payments).forEach(([key, p]) => { 
        if (key === 'PRINCIPAL') return;
        const fineAmt = parseFloat(p.interest || 0);
        totalFines += fineAmt;
        if (p.status === 'paid') {
            paidCount++;
            paidFines += fineAmt;
        }
    });

    const p = acc.payments['PRINCIPAL'];
    const isPrincipalPaid = p === 'paid' || p?.status === 'paid';
    const totalScheduledInterest = totalDuration * dueAmount;
    const currentPaidInterest = (paidCount * dueAmount) + paidFines;
    let currentRemainingInterest = (totalScheduledInterest - (paidCount * dueAmount)) + (totalFines - paidFines);
    
    // If full principal is settled, remaining interest is excused
    if (isPrincipalPaid) {
        currentRemainingInterest = 0;
    }

    const isSavings = ['Diwali Chit', 'Pongal Chit', 'Monthly Chit'].includes(acc.type);
    const isFestivalChit = ['Diwali Chit', 'Pongal Chit'].includes(acc.type);
    const interestMultiplier = isFestivalChit ? ((dueAmount / 200) * 30.76) : 0;
    const earnedInterest = paidCount * interestMultiplier;
    const totalExpectedReturn = isFestivalChit ? (totalLoan + (totalDuration * interestMultiplier)) : 0;
    
    safeGet('weekly-pay-due-label').innerText = `${periodLabel} ${isSavings ? 'Due' : 'Interest'}`;
    safeGet('weekly-pay-due').innerText = `₹${dueAmount.toLocaleString()}`;

    safeGet('weekly-pay-paid-label').innerText = isFestivalChit ? `Paid (+₹${Math.round(earnedInterest)} Int)` : (isSavings ? 'Paid Savings' : 'Paid Interest');
    safeGet('weekly-pay-paid').innerText = `₹${currentPaidInterest.toLocaleString()}`;

    safeGet('weekly-pay-remaining-label').innerText = isSavings ? 'Remaining Savings' : 'Remaining Interest';
    safeGet('weekly-pay-remaining').innerText = `₹${Math.max(0, currentRemainingInterest).toLocaleString()}`;

    safeGet('weekly-pay-total-label').innerText = isFestivalChit ? 'Expected Payout' : (isSavings ? 'Chit Value' : 'Full Amount');
    safeGet('weekly-pay-total').innerText = isFestivalChit ? `₹${Math.round(totalExpectedReturn).toLocaleString()}` : `₹${(isPrincipalPaid ? 0 : totalLoan).toLocaleString()}`;

    let remaining;
    if (acc.type === 'Monthly Interest' || acc.type === 'Weekly Interest') {
        remaining = (isPrincipalPaid ? 0 : totalLoan) + currentRemainingInterest;
    } else if (isSavings) {
        remaining = currentRemainingInterest; // For savings, balance is just what's left to pay into the chit
    } else {
        remaining = totalLoan + totalScheduledInterest + totalFines - currentPaidInterest;
    }
    // Summary cards now show split view, internal remaining still used for logic if needed
    // But for the footer balance calculation we use the total 'remaining' variable.
    // The user specifically wants 'Remaining Interest' to be just interest.
    safeGet('weekly-pay-remaining').innerText = `₹${Math.max(0, currentRemainingInterest).toLocaleString()}`;
    
    // Toggle settlement success message
    const settledMsg = safeGet('weekly-pay-settled-msg');
    if (settledMsg) {
        settledMsg.style.display = isPrincipalPaid ? 'block' : 'none';
    }

    // Toggle and populate Total Customers Card (for savings)
    const membersCard = safeGet('weekly-pay-members-card');
    const summaryHeader = safeGet('weekly-pay-summary');
    if (membersCard && summaryHeader) {
        if (acc.type === 'Monthly Chit') {
            membersCard.style.display = 'block';
            summaryHeader.style.gridTemplateColumns = 'repeat(5, 1fr)';
            safeGet('weekly-pay-members').innerText = `${acc.totalCustomers || '—'}`;
        } else {
            membersCard.style.display = 'none';
            summaryHeader.style.gridTemplateColumns = 'repeat(4, 1fr)';
        }
    }

    safeGet('excel-header-period').innerText = periodLabel;

    // Show/hide the "Chit Won" column header and banner
    const chitWonHeader = safeGet('excel-header-chit-won');
    const chitWonBanner = safeGet('chit-won-banner');
    const festivalInterestHeader = safeGet('excel-header-festival-interest');
    const isAuctionChit = ['Monthly Chit'].includes(acc.type);
    
    if (chitWonHeader) chitWonHeader.style.display = 'none'; // Always hidden - trophy is in action column now
    if (festivalInterestHeader) festivalInterestHeader.style.display = isFestivalChit ? 'table-cell' : 'none';
    
    // --- BUILD GROUP-LEVEL CLAIMED ITERATIONS MAP ---
    // Find the chit group this customer belongs to (for this account type)
    const custPhone = cust.phone;
    let groupMates = []; // other customers in same chit group
    let claimedIterations = {}; // { iteration(1-based): 'Winner Name' }
    
    if (isAuctionChit) {
        // Find the matching chit group
        const matchedGroup = (window.chitGroups || []).find(g => 
            g.type === acc.type && (g.memberIds || []).includes(custPhone)
        );
        if (matchedGroup) {
            // Get all OTHER members' customers
            groupMates = customers.filter(c => 
                c.phone !== custPhone && (matchedGroup.memberIds || []).includes(c.phone)
            );
        } else {
            // Fallback: match by same loanAmount + type + startDate (standalone chit accounts)
            groupMates = customers.filter(c =>
                c.phone !== custPhone &&
                (c.financeAccounts || []).some(a =>
                    a.type === acc.type &&
                    a.loanAmount == acc.loanAmount &&
                    a.startDate === acc.startDate
                )
            );
        }
        // Collect all iterations claimed by other group members
        groupMates.forEach(mate => {
            (mate.financeAccounts || []).forEach(a => {
                if (a.type === acc.type && a.chitWonIteration) {
                    claimedIterations[a.chitWonIteration] = mate.name;
                }
            });
        });
    }
    
    // Render banner if customer has already won
    const wonIteration = acc.chitWonIteration || acc.chitWonMonth; // fallback for backwards compatibility
    if (chitWonBanner) {
        if (isAuctionChit && wonIteration) {
            const wonLabel = `Month ${wonIteration}`;
            safeGet('chit-won-banner-text').innerText = `This customer won the chit auction in ${wonLabel} and received ₹${totalLoan.toLocaleString()}. Monthly payments continue as normal.`;
            chitWonBanner.style.display = 'flex';
        } else {
            chitWonBanner.style.display = 'none';
        }
    }

    // Generate Table Rows
    const tbody = safeGet('weekly-payment-table-body');
    tbody.innerHTML = '';

    const start = new Date(acc.startDate);
    
    let curr = new Date(start);
    if (isWeekly) {
        const day = start.getDay();
        const diff = day === 0 ? 0 : 7 - day;
        curr.setDate(start.getDate() + diff);
    }

    for (let i = 1; i <= totalDuration; i++) {
        const dateStr = curr.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const isoDate = curr.toISOString().split('T')[0];
        const statusData = acc.payments[isoDate] || { status: 'unpaid', interest: 0 };
        
        // Hide future unpaid rows if settled
        if (isPrincipalPaid && statusData.status !== 'paid') {
            if (isWeekly) curr.setDate(curr.getDate() + 7);
            else curr.setMonth(curr.getMonth() + 1);
            continue;
        }

        const isWonIteration = isAuctionChit && (acc.chitWonIteration === i);
        const claimedByOther = isAuctionChit && !isWonIteration && claimedIterations[i]; // name of other winner
        
        const tr = document.createElement('tr');
        if (statusData.status === 'paid') tr.classList.add('paid');
        if (isWonIteration) {
            tr.style.background = 'rgba(245,158,11,0.12)';
            tr.style.border = '1px solid rgba(245,158,11,0.4)';
        }
        if (claimedByOther) {
            tr.style.opacity = '0.65';
        }
        
        // Build trophy button for chit types (goes inside action cell)
        let chitTrophyBtn = '';
        if (isAuctionChit) {
            if (claimedByOther) {
                // Locked - won by another customer
                chitTrophyBtn = `
                    <button disabled title="Won by ${claimedByOther}" 
                        style="background:none; border: 1.5px solid rgba(255,255,255,0.1); border-radius:8px; padding:4px 8px; cursor:not-allowed; color:rgba(255,255,255,0.2); font-size:0.8rem; opacity:0.5;">
                        <i class="fa-solid fa-lock"></i>
                        <span style="font-size:0.65rem; display:block; margin-top:1px;">Won by<br>${claimedByOther.split(' ')[0]}</span>
                    </button>`;
            } else if (isWonIteration) {
                // This customer won this month
                chitTrophyBtn = `
                    <button onclick="toggleChitWon(${custIdx}, ${accIdx}, ${i})" 
                        title="Click to remove Won mark" 
                        style="background:linear-gradient(135deg,#f59e0b,#d97706); border:none; border-radius:8px; padding:4px 8px; cursor:pointer; color:#000; font-size:0.85rem; font-weight:700; box-shadow:0 0 10px rgba(245,158,11,0.4);">
                        <i class="fa-solid fa-trophy"></i>
                        <span style="font-size:0.65rem; display:block; margin-top:1px;">WON!</span>
                    </button>`;
            } else {
                // Available to mark as won
                chitTrophyBtn = `
                    <button onclick="toggleChitWon(${custIdx}, ${accIdx}, ${i})" 
                        title="Mark as Won Month" 
                        style="background:none; border: 1.5px solid rgba(245,158,11,0.3); border-radius:8px; padding:4px 8px; cursor:pointer; color:rgba(245,158,11,0.5); font-size:0.85rem; transition:all 0.2s;">
                        <i class="fa-solid fa-trophy"></i>
                        <span style="font-size:0.65rem; display:block; margin-top:1px;">Settle</span>
                    </button>`;
            }
        }

        let festivalInterestTd = '';
        if (isFestivalChit) {
            festivalInterestTd = `<td style="color: #10b981; font-weight:600; background: rgba(16,185,129,0.05);">+₹${interestMultiplier.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>`;
        }

        tr.innerHTML = `
            <td class="excel-row-num" style="${isWonIteration ? 'background:#f59e0b; color:#000; font-weight:800;' : ''}">${i}</td>
            <td style="font-weight:600; ${isWonIteration ? 'color:#f59e0b;' : ''}">${periodLabel} ${i}</td>
            <td>${dateStr}</td>
            <td style="font-weight:600;">₹${dueAmount.toLocaleString()}</td>
            ${festivalInterestTd}
            <td>
                <div class="excel-interest-cell">
                    <span class="excel-interest-val">₹${(statusData.interest || 0).toLocaleString()}</span>
                    <button class="excel-action-btn" onclick="addPeriodInterest(${custIdx}, ${accIdx}, '${isoDate}')" title="Add Fine">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </div>
            </td>
            <td>
                <div class="excel-status-badge ${statusData.status}">
                    ${statusData.status === 'paid' ? '<i class="fa-solid fa-circle-check"></i> Paid' : '<i class="fa-solid fa-circle-notch"></i> Pending'}
                    ${statusData.status === 'paid' && statusData.paidAt ? `<div style="font-size: 0.65rem; margin-top: 2px; opacity: 0.8;">${statusData.paidAt}</div>` : ''}
                </div>
            </td>
            <td style="text-align: right;">
                <div style="display:flex; gap:6px; justify-content:flex-end; align-items:flex-start; flex-wrap:wrap;">
                    <button class="primary-btn small" onclick="togglePeriodPayment(${custIdx}, ${accIdx}, '${isoDate}')" style="width: auto; background: ${statusData.status === 'paid' ? 'var(--danger-color)' : 'var(--success-color)'}; white-space:nowrap;">
                        ${statusData.status === 'paid' ? 'Unmark' : 'Mark Paid'}
                    </button>
                    ${chitTrophyBtn}
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        if (isWeekly) {
            curr.setDate(curr.getDate() + 7);
        } else {
            curr.setMonth(curr.getMonth() + 1);
        }
    }

    // Add Principal Settlement Row for Interest Based Accounts
    if (acc.type === 'Monthly Interest' || acc.type === 'Weekly Interest') {
        const pData = acc.payments['PRINCIPAL'] || { status: 'unpaid' };
        const principalStatus = pData.status;
        const tr = document.createElement('tr');
        tr.style.background = 'rgba(124, 58, 237, 0.08)'; 
        if (principalStatus === 'paid') tr.classList.add('paid');
        
        const settleInfo = principalStatus === 'paid' ? (pData.date || 'Full amount') : 'Full amount';

        tr.innerHTML = `
            <td class="excel-row-num" style="background: var(--primary-color); color: white;"><i class="fa-solid fa-flag-checkered"></i></td>
            <td style="font-weight:700; color: var(--primary-color);">Full Amount</td>
            <td style="font-weight:700;">₹${totalLoan.toLocaleString()}</td>
            <td>${settleInfo}</td>
            <td>-</td>
            <td>
                <span class="excel-status-badge ${principalStatus}">
                    ${principalStatus === 'paid' ? '<i class="fa-solid fa-circle-check"></i> Settled' : '<i class="fa-solid fa-hourglass-half"></i> Pending'}
                </span>
            </td>
            <td style="text-align: right;">
                <button class="primary-btn small" onclick="togglePeriodPayment(${custIdx}, ${accIdx}, 'PRINCIPAL')" style="width: auto; background: ${principalStatus === 'paid' ? 'var(--danger-color)' : 'var(--primary-color)'};">
                    ${principalStatus === 'paid' ? 'Unmark' : 'Pay Full Amount'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    openModal('weekly-payment-modal');
};

async function togglePeriodPayment(custIdx, accIdx, isoDate) {
    const acc = customers[custIdx].financeAccounts[accIdx];
    if (!acc.payments) acc.payments = {};
    
    const currentStatus = acc.payments[isoDate]?.status || 'unpaid';
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    
    if (!acc.payments[isoDate]) acc.payments[isoDate] = { status: 'unpaid', interest: 0 };
    acc.payments[isoDate].status = newStatus;

    // Record current date and time if marking as paid
    if (newStatus === 'paid') {
        const now = new Date();
        const date = now.toLocaleDateString('en-GB');
        const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        acc.payments[isoDate].paidAt = `${date} ${time}`;
    } else {
        delete acc.payments[isoDate].paidAt;
    }
    
    // Add date for principal settlement
    if (isoDate === 'PRINCIPAL' && newStatus === 'paid') {
        acc.payments[isoDate].date = new Date().toLocaleDateString('en-GB');
    }
    
    saveData();
    openAccountPaymentManagement(custIdx, accIdx); // Refresh
}

async function addPeriodInterest(custIdx, accIdx, isoDate) {
    const acc = customers[custIdx].financeAccounts[accIdx];
    const currentInterest = (acc.payments && acc.payments[isoDate]?.interest) || 0;
    
    let val;
    if (window.showPrompt) {
        val = await window.showPrompt("Enter Fine Amount (₹):", currentInterest);
    } else {
        val = prompt("Enter Fine Amount (₹):", currentInterest);
    }
    
    if (val === null) return;
    
    const amount = parseFloat(val) || 0;
    if (!acc.payments) acc.payments = {};
    if (!acc.payments[isoDate]) acc.payments[isoDate] = { status: 'unpaid' };
    
    acc.payments[isoDate].interest = amount;
    
    saveData();
    openAccountPaymentManagement(custIdx, accIdx); // Refresh
}

// Toggle Chit Won Month
async function toggleChitWon(custIdx, accIdx, iterationNum) {
    const acc = customers[custIdx].financeAccounts[accIdx];
    const isAlreadyWon = acc.chitWonIteration === iterationNum || acc.chitWonMonth === iterationNum; // fallback
    
    if (isAlreadyWon) {
        // Unmark
        const ok = await window.showPopup({
            title: 'Remove Won Mark',
            message: 'Remove the "Chit Won" mark from this month?',
            confirmText: 'Remove',
            isDanger: true
        });
        if (!ok) return;
        delete acc.chitWonIteration;
        delete acc.chitWonMonth;
    } else {
        // If another month already marked, ask to replace
        if (acc.chitWonIteration || acc.chitWonMonth) {
            const ok = await window.showPopup({
                title: 'Change Won Month',
                message: 'This customer already has a won month marked. Do you want to change it to this month?',
                confirmText: 'Yes, Change It'
            });
            if (!ok) return;
        }
        acc.chitWonIteration = iterationNum;
        delete acc.chitWonMonth;
    }
    
    saveData();
    openAccountPaymentManagement(custIdx, accIdx); // Refresh
}

// Exports
window.handleFinanceClick = handleFinanceClick;
window.openAccountPaymentManagement = openAccountPaymentManagement;
window.togglePeriodPayment = togglePeriodPayment;
window.addPeriodInterest = addPeriodInterest;
window.toggleChitWon = toggleChitWon;

// --- SYSTEM SETTINGS ---
function openSettings() {
    const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    document.getElementById('setting-rzp-key').value = settings.razorpayKey || 'rzp_test_YourKeyHere';
    document.getElementById('setting-upi-id').value = settings.upiId || 'srinadhifoods-1@okicici';
    openModal('settings-modal');
}

window.handleSaveSettings = function(e) {
    e.preventDefault();
    const settings = {
        razorpayKey: document.getElementById('setting-rzp-key').value,
        upiId: document.getElementById('setting-upi-id').value
    };
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    
    window.showPopup({
        type: 'alert',
        title: 'Settings Saved',
        message: 'System configuration has been updated successfully.'
    });
    closeModal('settings-modal');
    // Refresh relevant parts if on dashboard
    if (typeof loadAdminData === 'function') loadAdminData();
};

window.openSettings = openSettings;

// --- CHIT GROUPING SYSTEM ---
window.currentChitGroupId = null;
window.currentChitGroupType = 'Monthly Chit';

window.openAddChitGroupModal = function(type) {
    window.currentChitGroupType = type || 'Monthly Chit';
    safeGet('group-setup-type').value = window.currentChitGroupType;
    safeGet('group-members-label').innerText = type.includes('Weekly') ? 'Total Members / Weeks' : 'Total Members / Months';
    safeGet('group-due-label').innerText = type.includes('Weekly') ? 'Weekly Due (₹)' : 'Monthly Due (₹)';
    
    // Set defaults based on user's business model
    if (type.includes('Weekly')) {
        safeGet('group-setup-value').value = 50000;
        safeGet('group-setup-members').value = 52;
        safeGet('group-setup-due').value = 961;
    } else {
        safeGet('group-setup-value').value = 50000;
        safeGet('group-setup-members').value = 20;
        safeGet('group-setup-due').value = 2500;
    }
    
    openModal('add-chit-group-modal');
};

window.calcGroupDue = function() {
    const val = parseFloat(safeGet('group-setup-value').value) || 0;
    const members = parseInt(safeGet('group-setup-members').value) || 1;
    safeGet('group-setup-due').value = Math.round(val / members);
};

window.handleAddChitGroup = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.id = 'group_' + Date.now();
    data.members = parseInt(data.members);
    data.value = parseFloat(data.value);
    data.due = parseFloat(data.due);
    data.memberIds = []; // Stores customer phones/uids

    if (!window.chitGroups) window.chitGroups = [];
    window.chitGroups.push(data);
    saveData();
    closeModal('add-chit-group-modal');
    window.renderChitGroupsGrid();
};

window.renderChitGroupsGrid = function() {
    const grid = safeGet('chit-groups-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const groups = (window.chitGroups || []).filter(g => g.type === window.currentChitGroupType);
    
    if (groups.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--border-color);">
            <i class="fa-solid fa-layer-group" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 20px; opacity: 0.3;"></i>
            <h3>No ${window.currentChitGroupType} Groups Found</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Start by creating a new group for your customers.</p>
            <button class="primary-btn small" onclick="window.openAddChitGroupModal('${window.currentChitGroupType}')">Create First Group</button>
        </div>`;
        return;
    }

    groups.forEach(group => {
        const div = document.createElement('div');
        div.className = 'stat-card highlight clickable';
        div.style.padding = '20px';
        div.style.border = '1px solid var(--border-color)';
        div.onclick = () => window.openChitGroupMembers(group.id);
        
        const progress = ((group.memberIds || []).length / group.members) * 100;
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <h3 style="margin:0; font-size:1.1rem; color: var(--primary-color);">${group.name}</h3>
                    <button class="secondary-btn small" title="Delete Group" onclick="event.stopPropagation(); window.deleteChitGroup('${group.id}')" style="padding: 2px 6px; border:none; box-shadow:none; color: var(--danger-color); background: transparent; transform: none;"><i class="fa-solid fa-trash"></i></button>
                </div>
                <span style="font-size:0.7rem; padding:4px 8px; background:rgba(56,189,248,0.1); color:#38bdf8; border-radius:12px; font-weight:600;">₹${group.value.toLocaleString()} Pot</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">
                <div><i class="fa-solid fa-users" style="width:20px;"></i> ${group.memberIds.length} / ${group.members} Members</div>
                <div><i class="fa-solid fa-calendar-alt" style="width:20px;"></i> ${group.members} ${group.type.includes('Weekly') ? 'Weeks' : 'Months'}</div>
                <div><i class="fa-solid fa-money-bill-wave" style="width:20px;"></i> ₹${group.due.toLocaleString()} / ${group.type.includes('Weekly') ? 'wk' : 'mo'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                <div style="width: ${progress}%; height: 100%; background: var(--primary-color);"></div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.7rem; opacity:0.6;">${Math.round(progress)}% Filled</span>
                <span class="card-footer-link" style="margin:0; font-size:0.75rem;">Manage Group <i class="fa-solid fa-arrow-right"></i></span>
            </div>
        `;
        grid.appendChild(div);
    });
};

window.deleteChitGroup = async function(groupId) {
    const groupIndex = (window.chitGroups || []).findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    const group = window.chitGroups[groupIndex];
    
    const ok = await window.showPopup({
        title: 'Delete Chit Group',
        message: `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
        isDanger: true,
        confirmText: 'Delete'
    });
    
    if (ok) {
        window.chitGroups.splice(groupIndex, 1);
        saveData();
        window.renderChitGroupsGrid();
    }
};

window.showChitGroups = function() {
    safeGet('chit-groups-view').style.display = 'block';
    safeGet('chit-members-view').style.display = 'none';
    window.renderChitGroupsGrid();
};

window.openChitGroupMembers = function(groupId) {
    window.currentChitGroupId = groupId;
    const group = (window.chitGroups || []).find(g => g.id === groupId);
    if (!group) return;
    
    safeGet('selected-group-name').innerText = `${group.name} Members`;
    safeGet('chit-groups-view').style.display = 'none';
    safeGet('chit-members-view').style.display = 'block';
    
    window.renderGroupMembersTable(groupId);
};

window.renderGroupMembersTable = function(groupId) {
    const group = (window.chitGroups || []).find(g => g.id === groupId);
    if (!group) return;
    
    // Find all customers whose phone/uid is in the group memberIds
    const pool = customers.filter(c => (group.memberIds || []).includes(c.phone));
    
    renderBasicTable('monthly-chit-customer-table-body', pool, group.type);
};

window.openAddGroupMemberModal = function() {
    const group = (window.chitGroups || []).find(g => g.id === window.currentChitGroupId);
    if (!group) return;
    
    if (group.memberIds.length >= group.members) {
        window.showPopup({ type: 'alert', title: 'Group Full', message: 'This group already has the maximum number of members.' });
        return;
    }
    
    window.selectedMembersToAdd = new Set();
    window.updateAddSelectedMembersButton && window.updateAddSelectedMembersButton();
    
    safeGet('member-search-input').value = '';
    window.filterMemberSelection();
    openModal('select-customer-modal');
};

window.addSelectedCustomersToGroup = function() {
    const group = (window.chitGroups || []).find(g => g.id === window.currentChitGroupId);
    if (!group) return;
    if (!window.selectedMembersToAdd || window.selectedMembersToAdd.size === 0) return;
    
    if (group.memberIds.length + window.selectedMembersToAdd.size > group.members) {
        window.showPopup({ type: 'alert', title: 'Group Size Limit', message: `Cannot add ${window.selectedMembersToAdd.size} members. Only ${group.members - group.memberIds.length} spots left in the group.` });
        return;
    }

    let added = false;
    window.selectedMembersToAdd.forEach(phone => {
        if (!group.memberIds.includes(phone)) {
            group.memberIds.push(phone);
            added = true;
            
            const custIdx = customers.findIndex(c => c.phone === phone);
            if (custIdx > -1) {
                const cust = customers[custIdx];
                if (!cust.financeAccounts) cust.financeAccounts = [];
                
                const exists = cust.financeAccounts.some(a => a.type === group.type && a.groupId === group.id);
                if (!exists) {
                    const newAcc = {
                        uid: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2,9),
                        type: group.type,
                        groupId: group.id,
                        loanAmount: group.value,
                        duration: group.members,
                        monthlyDue: group.type.includes('Weekly') ? 0 : group.due,
                        weeklyDue: group.type.includes('Weekly') ? group.due : 0,
                        totalCustomers: group.members,
                        startDate: new Date().toLocaleDateString('en-GB').split('/').reverse().join('-'),
                        payments: {}
                    };
                    cust.financeAccounts.push(newAcc);
                }
            }
        }
    });

    if (added) {
        saveData();
    }
    
    window.selectedMembersToAdd.clear();
    closeModal('select-customer-modal');
    window.renderGroupMembersTable(window.currentChitGroupId);
};

window.updateAddSelectedMembersButton = function() {
    const btn = safeGet('add-selected-members-btn');
    if (!btn) return;
    if (window.selectedMembersToAdd && window.selectedMembersToAdd.size > 0) {
        btn.style.display = 'block';
        btn.innerText = `Add ${window.selectedMembersToAdd.size} Selected Member${window.selectedMembersToAdd.size > 1 ? 's' : ''}`;
    } else {
        btn.style.display = 'none';
    }
};

window.filterMemberSelection = function() {
    const query = safeGet('member-search-input').value.toLowerCase();
    const group = (window.chitGroups || []).find(g => g.id === window.currentChitGroupId);
    const list = safeGet('member-selection-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const available = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(query) || (c.phone || '').includes(query);
        const alreadyInGroup = (group.memberIds || []).includes(c.phone);
        return matchesSearch && !alreadyInGroup;
    });
    
    if (available.length === 0) {
        list.innerHTML = `<div style="padding:20px; text-align:center; opacity:0.5;">No matching customers found.</div>`;
    } else {
        available.forEach(c => {
            const div = document.createElement('div');
            div.className = 'selectable-item';
            div.style.padding = '12px 15px';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            div.style.cursor = 'pointer';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            
            const isChecked = window.selectedMembersToAdd && window.selectedMembersToAdd.has(c.phone);
            
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap: 12px; width: 100%;">
                    <input type="checkbox" id="add-member-check-${c.phone}" style="width: 18px; height: 18px; cursor: pointer;" ${isChecked ? 'checked' : ''}>
                    <label for="add-member-check-${c.phone}" style="cursor: pointer; margin: 0; flex: 1;">
                        <div style="font-weight:600;">${c.name}</div>
                        <div style="font-size:0.8rem; opacity:0.6;">${c.phone}</div>
                    </label>
                </div>
            `;
            
            const checkbox = div.querySelector('input');
            div.onclick = (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                    checkbox.checked = !checkbox.checked;
                }
                setTimeout(() => {
                    if (!window.selectedMembersToAdd) window.selectedMembersToAdd = new Set();
                    if (checkbox.checked) {
                        window.selectedMembersToAdd.add(c.phone);
                    } else {
                        window.selectedMembersToAdd.delete(c.phone);
                    }
                    window.updateAddSelectedMembersButton();
                }, 0);
            };
            
            checkbox.onchange = (e) => {
                e.stopPropagation();
                if (!window.selectedMembersToAdd) window.selectedMembersToAdd = new Set();
                if (checkbox.checked) {
                    window.selectedMembersToAdd.add(c.phone);
                } else {
                    window.selectedMembersToAdd.delete(c.phone);
                }
                window.updateAddSelectedMembersButton();
            };

            list.appendChild(div);
        });
    }
};

window.addCustomerToGroup = function(phoneOrId) {
    const group = (window.chitGroups || []).find(g => g.id === window.currentChitGroupId);
    if (!group) return;
    
    if (!group.memberIds.includes(phoneOrId)) {
        group.memberIds.push(phoneOrId);
        
        // Ensure the customer actually has the account setup for this group
        const custIdx = customers.findIndex(c => c.phone === phoneOrId);
        if (custIdx > -1) {
            const cust = customers[custIdx];
            if (!cust.financeAccounts) cust.financeAccounts = [];
            
            // Check if they already have an account of this type with this group ID
            const exists = cust.financeAccounts.some(a => a.type === group.type && a.groupId === group.id);
            
            if (!exists) {
                // Auto-setup the account for this group
                const newAcc = {
                    uid: 'acc_' + Date.now(),
                    type: group.type,
                    groupId: group.id,
                    loanAmount: group.value,
                    duration: group.members,
                    monthlyDue: group.type.includes('Weekly') ? 0 : group.due,
                    weeklyDue: group.type.includes('Weekly') ? group.due : 0,
                    totalCustomers: group.members,
                    startDate: new Date().toLocaleDateString('en-GB').split('/').reverse().join('-'), // YYYY-MM-DD for consistency
                    payments: {}
                };
                cust.financeAccounts.push(newAcc);
            }
        }
    }
    
    saveData();
    closeModal('select-customer-modal');
    window.renderGroupMembersTable(window.currentChitGroupId);
};

window.switchToNewCustomerInGroup = function() {
    closeModal('select-customer-modal');
    // We'll modify handleAddCustomer to auto-add to group if context exists
    window.isAddingToGroupContext = window.currentChitGroupId;
    openAddCustomerModal(window.currentChitGroupType);
};

// Initial render for Monthly Chit page
if (window.location.pathname.includes('monthlychit.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.showChitGroups(), 100);
    });
}

window.openModal = openModal;
window.closeModal = closeModal;
window.showAdminSection = showAdminSection;
window.viewCustomerDetails = viewCustomerDetails;
window.deleteCustomer = deleteCustomer;
window.handleAddCustomer = handleAddCustomer;
window.openFinanceSetup = openFinanceSetup;
window.openEditModal = openEditModal;
window.handleEditCustomer = handleEditCustomer;
window.openAddCustomerModal = openAddCustomerModal;
window.handleCreateChit = handleCreateChit;
window.openSelectCategoryModal = openSelectCategoryModal;
window.renderCustomerPassbook = renderCustomerPassbook;
window.verifyIFSC = verifyIFSC;
window.toggleSync = toggleSync;
window.openIFSCFinder = openIFSCFinder;
window.filterIFSCBanks = filterIFSCBanks;
window.showIFSCStep = showIFSCStep;
window.selectIFSCBank = selectIFSCBank;
window.searchIFSCBranches = searchIFSCBranches;
window.selectIFSCBranch = selectIFSCBranch;
window.logout = () => { localStorage.removeItem('finagent_user'); window.location.href = 'index.html'; };
