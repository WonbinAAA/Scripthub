/* Aun's Scripts - Shared Sidebar
   ใช้ร่วมกันทั้ง index.html และ websites.html
*/
(function () {
    'use strict';

    const SCRIPT_PAGE = 'index.html';
    const WEBSITE_PAGE = 'websites.html';
    const WEBSITE_KEY = 'aun_script_vault_websites_v2';
    const UPLOAD_WEB_PAGE = 'websites.html#upload-web';

    function readWebsites() {
        try {
            const value = JSON.parse(localStorage.getItem(WEBSITE_KEY) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_) {
            return [];
        }
    }

    function makeLink(text, href, title, extraClass) {
        const a = document.createElement('a');
        a.className = 'menu-item menu-child' + (extraClass ? ' ' + extraClass : '');
        a.href = href;
        a.textContent = text;
        if (title) a.title = title;
        return a;
    }

    function renderWebsiteMenu() {
        const menu = document.getElementById('websiteMenuItems') || document.getElementById('websiteMenu');
        if (!menu) return;
        menu.innerHTML = '';

        const websites = readWebsites();
        if (!websites.length) {
            const empty = document.createElement('span');
            empty.className = 'menu-item menu-child website-menu-empty';
            empty.textContent = 'ยังไม่มีเว็บไซต์';
            menu.appendChild(empty);
            return;
        }

        websites.forEach(site => {
            if (!site || !site.name) return;
            menu.appendChild(makeLink(
                '🌐 ' + site.name,
                WEBSITE_PAGE + '#' + encodeURIComponent(site.id || ''),
                site.url || site.name,
                'website-menu-item'
            ));
        });
    }

    async function renderScriptMenu() {
        const menu = document.getElementById('scriptMenuItems') || document.getElementById('scriptMenu');
        if (!menu) return;
        menu.innerHTML = '';

        try {
            const response = await fetch(SCRIPT_PAGE + '?sidebar=' + Date.now(), { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const cards = Array.from(doc.querySelectorAll('#scriptGrid .card'));

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
                menu.appendChild(makeLink(
                    '📄 ' + title,
                    SCRIPT_PAGE + '#' + encodeURIComponent(id),
                    title,
                    'script-menu-item'
                ));
            });
        } catch (_) {
            const empty = document.createElement('span');
            empty.className = 'menu-item menu-child';
            empty.textContent = 'ไม่สามารถโหลด Script ได้';
            menu.appendChild(empty);
        }
    }

    function setupNavigation() {
        const upload = document.getElementById('uploadMenuItem');
        const uploadWeb = document.getElementById('uploadWebMenuItem');
        if (uploadWeb && !uploadWeb.dataset.sharedSidebarBound) {
            uploadWeb.dataset.sharedSidebarBound = '1';
            uploadWeb.addEventListener('click', function () {
                window.location.href = UPLOAD_WEB_PAGE;
            });
        }
        if (upload && !upload.dataset.sharedSidebarBound) {
            upload.dataset.sharedSidebarBound = '1';
            upload.addEventListener('click', function (event) {
                if (location.pathname.endsWith('/' + SCRIPT_PAGE) || location.pathname.endsWith(SCRIPT_PAGE)) {
                    event.preventDefault();
                    const page = document.getElementById('uploadPage');
                    const scripts = document.getElementById('scriptsPage');
                    if (page && scripts) {
                        page.classList.add('active');
                        scripts.classList.remove('active');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            });
        }

        document.querySelectorAll('.website-menu-item').forEach(link => {
            if (link.dataset.sharedSidebarBound) return;
            link.dataset.sharedSidebarBound = '1';
            link.addEventListener('click', function () {
                localStorage.setItem('aun_script_vault_last_sidebar_target', this.getAttribute('href') || '');
            });
        });
    }

    function setupToggles() {
        const scriptToggle = document.getElementById('scriptListToggle') || document.getElementById('scriptToggle');
        const scriptMenu = document.getElementById('scriptMenuItems') || document.getElementById('scriptMenu');
        const websiteToggle = document.getElementById('websiteToggle');
        const websiteMenu = document.getElementById('websiteMenuItems') || document.getElementById('websiteMenu');

        if (scriptToggle && scriptMenu && !scriptToggle.dataset.sharedSidebarBound) {
            scriptToggle.dataset.sharedSidebarBound = '1';
            scriptToggle.addEventListener('click', function () {
                const collapsed = scriptMenu.classList.toggle('collapsed');
                scriptToggle.classList.toggle('collapsed', collapsed);
            });
        }

        if (websiteToggle && websiteMenu && !websiteToggle.dataset.sharedSidebarBound) {
            websiteToggle.dataset.sharedSidebarBound = '1';
            websiteToggle.addEventListener('click', function () {
                const collapsed = websiteMenu.classList.toggle('collapsed');
                websiteToggle.classList.toggle('collapsed', collapsed);
            });
        }
    }

    function refresh() {
        renderWebsiteMenu();
        renderScriptMenu();
        setupToggles();
        setupNavigation();
    }

    window.AunSharedSidebar = {
        refresh: refresh,
        refreshWebsites: renderWebsiteMenu,
        refreshScripts: renderScriptMenu
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }
})();
