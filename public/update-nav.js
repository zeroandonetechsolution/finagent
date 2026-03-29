const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'modals.html');

const newNavTemplate = `          <nav>
            <a href="admin.html" class="nav-btn __admin__"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>
            <a href="allcustomers.html" class="nav-btn __allcustomers__"><i class="fa-solid fa-users"></i> All Customers</a>
            
            <div class="nav-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin: 15px 0 5px 10px; opacity: 0.7; font-weight: 600;">Finance</div>
            <a href="weeklycust.html" class="nav-btn __weeklycust__"><i class="fa-solid fa-calendar-week"></i> Weekly Finance</a>
            <a href="monthlycust.html" class="nav-btn __monthlycust__"><i class="fa-solid fa-calendar-days"></i> Monthly Finance</a>
            <a href="monthlyinterest.html" class="nav-btn __monthlyinterest__"><i class="fa-solid fa-hand-holding-dollar"></i> Monthly Interest</a>
            
            <div class="nav-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin: 15px 0 5px 10px; opacity: 0.7; font-weight: 600;">Savings</div>
            <a href="diwalichit.html" class="nav-btn __diwalichit__"><i class="fa-solid fa-burst"></i> Diwali Chit</a>
            <a href="pongalchit.html" class="nav-btn __pongalchit__"><i class="fa-solid fa-bowl-rice"></i> Pongal Chit</a>
            <a href="monthlychit.html" class="nav-btn __monthlychit__"><i class="fa-solid fa-calendar-check"></i> Monthly Chit</a>
            
            <div class="nav-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin: 15px 0 5px 10px; opacity: 0.7; font-weight: 600;">Normal Due</div>
            <a href="riceaccount.html" class="nav-btn __riceaccount__"><i class="fa-solid fa-bucket"></i> Rice Account</a>
            
            <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;"></div>
            <a href="transactions.html" class="nav-btn __transactions__"><i class="fa-solid fa-receipt"></i> Transactions</a>
            <a href="passbook.html" class="nav-btn __passbook__"><i class="fa-solid fa-book-open"></i> Customer Passbook</a>
            
            <div class="nav-label" style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin: 15px 0 5px 10px; opacity: 0.7; font-weight: 600;">History</div>
            <a href="activeusers.html" class="nav-btn __activeusers__"><i class="fa-solid fa-user-check"></i> Active Users</a>
            <a href="inactiveusers.html" class="nav-btn __inactiveusers__"><i class="fa-solid fa-user-minus"></i> Inactive Users</a>

            <button class="nav-btn logout" style="margin-top: 15px;" onclick="logout()"><i class="fa-solid fa-sign-out-alt"></i> Logout</button>
          </nav>`;

files.forEach(f => {
    let p = path.join(dir, f);
    let content = fs.readFileSync(p, 'utf8');
    
    // Replace the <nav>...</nav> block
    if(content.includes('<nav>') && content.includes('</nav>')) {
        let regex = /<nav>[\s\S]*?<\/nav>/;
        
        // Figure out which one to make active based on filename
        let base = f.replace('.html', '');
        let nav = newNavTemplate.replace(new RegExp('__'+base+'__', 'g'), 'active');
        // remove the rest
        nav = nav.replace(/__[a-z_]+__/g, '');
        
        let newContent = content.replace(regex, nav);
        fs.writeFileSync(p, newContent);
        console.log('Updated nav in', f);
    }
});
