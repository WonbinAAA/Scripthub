/* Shared Sidebar for Aun's Scripts */
(function () {
    'use strict';

    const SCRIPT_PAGE = 'index.html';
    const WEBSITE_PAGE = 'websites.html';
    const UPLOAD_WEB_PAGE = 'uploadweb.html';
    const WEBSITE_KEY = 'aun_script_vault_websites_v2';

    function injectSidebar() {
        if (document.getElementById('sidebar')) return;

        const aside = document.createElement('aside');
        aside.className = 'sidebar';
        aside.id = 'sidebar';
        aside.innerHTML = `
            <div class="sidebar-header">
                <div class="header-left">
                    <img src="Images/AAA.jpg" alt="Aun's Scripts" class="sidebar-avatar">
                    <div class="sidebar-title">Aun's Scripts</div>
                </div>
                <button class="shared-sidebar-toggle" id="sharedSidebarToggle" type="button" title="ยุบ/ขยายเมนู">☰</button>
            </div>
            <div class="sidebar-menu" id="sidebarMenu">
                <div class="menu-label">Menu</div>
                <a href="index.html#upload" class="menu-item" id="uploadMenuItem">⬆️ Upload Script</a>
                <a href="uploadweb.html" class="menu-item" id="uploadWebMenuItem">🌐 Upload Web</a>

                <div class="menu-label" style="margin-top:18px">Script List</div>
                <button class="menu-item menu-section-toggle" id="scriptListToggle" type="button">
                    <span>📜 Script List</span><span class="menu-arrow">▼</span>
                </button>
                <div class="menu-section-items" id="scriptMenuItems"></div>

                <div class="menu-label" style="margin-top:18px">เว็บไซต์</div>
                <button class="menu-item menu-section-toggle" id="websiteToggle" type="button">
                    <span>🌐 เว็บไซต์</span><span class="menu-arrow">▼</span>
                </button>
                <div class="menu-section-items website-menu-list" id="websiteMenuItems"></div>
            </div>
        `;

        document.body.insertBefore(aside, document.body.firstChild);
    }

    function injectStyles() {
        if (document.getElementById('sharedSidebarStyles')) return;
        const style = document.createElement('style');
        style.id = 'sharedSidebarStyles';
        style.textContent = `
            .sidebar{width:260px;background:#fff;display:flex;flex-direction:column;position:fixed;top:0;bottom:0;left:0;transition:transform .3s ease;z-index:100}
            .sidebar.collapsed{transform:translateX(-100%)}
            .sidebar-header{height:74px;min-height:74px;padding:15px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
            .header-left{display:flex;align-items:center;gap:12px}.sidebar-avatar{width:40px;height:40px;min-width:40px;border-radius:50%;object-fit:cover;display:block}.sidebar-title{font-size:15px;font-weight:600}
            .sidebar-menu{padding:15px;overflow-y:auto;flex:1}.menu-label{font-size:11px;color:#6b7280;letter-spacing:.5px;margin-bottom:8px;font-weight:600}.menu-item{display:block;width:100%;padding:9px 12px;color:#1f2937;text-decoration:none;border:0;background:transparent;border-radius:6px;font:13px 'Prompt','Inter',sans-serif;margin-bottom:4px;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.menu-item:hover,.menu-item.active{background:#eff6ff;color:#2563eb;font-weight:500}.menu-section-toggle{display:flex;justify-content:space-between;align-items:center}.menu-arrow{transition:transform .2s}.menu-section-toggle.collapsed .menu-arrow{transform:rotate(-90deg)}.menu-section-items{overflow:hidden;max-height:5000px;transition:max-height .25s ease}.menu-section-items.collapsed{max-height:0!important}.menu-child{padding-left:20px;font-size:12px}.website-menu-list{padding-left:8px}.website-menu-empty{display:block;padding:6px 12px 8px 20px;color:#6b7280;font-size:12px}.shared-sidebar-toggle{border:0;background:transparent;padding:8px;border-radius:50%;cursor:pointer;color:#6b7280;font-size:18px}.shared-sidebar-toggle:hover{background:#f3f4f6;color:#1f2937}
            @media(max-width:768px){.sidebar{transform:translateX(-100%)}.sidebar.mobile-show{transform:translateX(0)}}
        `;
        document.head.appendChild(style);
    }

    function websitesFromLocal() {
        try {
            const data = JSON.parse(localStorage.getItem(WEBSITE_KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (_) { return []; }
    }

    function renderWebsiteMenu() {
        const menu = document.getElementById('websiteMenuItems');
        if (!menu) return;
        menu.innerHTML = '';
        const sites = websitesFromLocal();
        if (!sites.length) {
            const empty = document.createElement('span');
            empty.className = 'menu-item menu-child website-menu-empty';
            empty.textContent = 'ยังไม่มีเว็บไซต์';
            menu.appendChild(empty);
            return;
        }
        sites.forEach(site => {
            if (!site || !site.name) return;
            const link = document.createElement('a');
            link.className = 'menu-item menu-child website-menu-item';
            link.href = WEBSITE_PAGE + '#' + encodeURIComponent(site.id || '');
            link.textContent = '🌐 ' + site.name;
            link.title = site.url || site.name;
            menu.appendChild(link);
        });
    }

    async function renderScriptMenu() {
        const menu = document.getElementById('scriptMenuItems');
        if (!menu) return;
        menu.innerHTML = '';
        try {
            // หน้า index ใช้ Card ใน DOM ปัจจุบันก่อน เพื่อให้เมนูอัปเดตทันที
            let cards = Array.from(document.querySelectorAll('#scriptGrid .card'));
            if (!cards.length) {
                const response = await fetch(SCRIPT_PAGE + '?sidebar=' + Date.now(), { cache: 'no-store' });
                if (!response.ok) throw new Error();
                const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
                cards = Array.from(doc.querySelectorAll('#scriptGrid .card'));
            }
            if (!cards.length) {
                const empty = document.createElement('span');
                empty.className = 'menu-item menu-child';
                empty.textContent = 'ยังไม่มี Script';
                menu.appendChild(empty);
                return;
            }
            cards.forEach(card => {
                const id = card.id;
                const title = card.querySelector('.file-title')?.textContent.trim();
                if (!id || !title) return;
                const link = document.createElement('a');
                link.className = 'menu-item menu-child script-menu-item';
                link.href = SCRIPT_PAGE + '#' + encodeURIComponent(id);
                link.textContent = '📄 ' + title;
                link.title = title;
                menu.appendChild(link);
            });
        } catch (_) {
            const empty = document.createElement('span');
            empty.className = 'menu-item menu-child';
            empty.textContent = 'ไม่สามารถโหลด Script ได้';
            menu.appendChild(empty);
        }
    }

    function setActive() {
        const path = location.pathname.toLowerCase();
        document.querySelectorAll('#sidebarMenu .menu-item').forEach(item => item.classList.remove('active'));
        const upload = document.getElementById('uploadMenuItem');
        const uploadWeb = document.getElementById('uploadWebMenuItem');
        if (path.endsWith('/' + SCRIPT_PAGE) || path.endsWith(SCRIPT_PAGE) || path.endsWith('/')) {
            if (location.hash === '#upload' && upload) upload.classList.add('active');
        } else if (path.endsWith('/' + UPLOAD_WEB_PAGE) || path.endsWith(UPLOAD_WEB_PAGE)) {
            if (uploadWeb) uploadWeb.classList.add('active');
        }
    }

    function setup() {
        const sidebar = document.getElementById('sidebar');
        const scriptToggle = document.getElementById('scriptListToggle');
        const scriptItems = document.getElementById('scriptMenuItems');
        const websiteToggle = document.getElementById('websiteToggle');
        const websiteItems = document.getElementById('websiteMenuItems');
        const sharedToggle = document.getElementById('sharedSidebarToggle');

        sharedToggle?.addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-show');
            else sidebar.classList.toggle('collapsed');
        });
        scriptToggle?.addEventListener('click', () => {
            const collapsed = scriptItems.classList.toggle('collapsed');
            scriptToggle.classList.toggle('collapsed', collapsed);
        });
        websiteToggle?.addEventListener('click', () => {
            const collapsed = websiteItems.classList.toggle('collapsed');
            websiteToggle.classList.toggle('collapsed', collapsed);
        });

        document.getElementById('uploadMenuItem')?.addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.remove('mobile-show');
        });
        document.getElementById('uploadWebMenuItem')?.addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.remove('mobile-show');
        });

        setActive();
        renderWebsiteMenu();
        renderScriptMenu();
    }

    function init() {
        injectStyles();
        injectSidebar();
        setup();
    }

    // sidebar.js ถูกโหลดท้าย <body> หรือระหว่าง <body> กับโค้ดหน้า
    // จึงสร้าง Sidebar ทันทีเมื่อ document.body พร้อม เพื่อให้โค้ดของแต่ละหน้ามองเห็นเมนูได้
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init, { once: true });

    window.AunSharedSidebar = {
        refresh: function () { renderWebsiteMenu(); renderScriptMenu(); },
        refreshWebsites: renderWebsiteMenu,
        refreshScripts: renderScriptMenu
    };
})();
