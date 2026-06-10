const fs = require('fs');
const path = require('path');

const newDocsHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dramoo API — Interactive Documentation</title>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #150f23;
      --bg-panel: #1f1633;
      --bg-glass: rgba(255, 255, 255, 0.05);
      --bg-glass-hover: rgba(255, 255, 255, 0.1);
      
      --border-color: #362d59;
      --border-highlight: #c2ef4e;
      
      --text-main: #ffffff;
      --text-muted: rgba(255,255,255,0.72);
      --text-dark: rgba(255,255,255,0.5);
      
      --accent-primary: #c2ef4e;
      --accent-secondary: #fa7faa;
      
      --method-get: #c2ef4e;
      --method-post: #6a5fc1;
      
      --radius-xl: 16px;
      --radius-lg: 12px;
      --radius-md: 8px;
      --radius-sm: 4px;
      
      --sidebar-width: 280px;
      --navbar-height: 70px;
      font-family: "Rubik", -apple-system, system-ui, sans-serif;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Rubik", sans-serif; }
    body { background-color: var(--bg-base); color: var(--text-main); font-size: 15px; line-height: 1.6; display: flex; flex-direction: column; height: 100vh; overflow: hidden; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #362d59; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #c2ef4e; }

    /* GLOBAL NAVBAR */
    .navbar { height: var(--navbar-height); width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: var(--bg-panel); border-bottom: 1px solid var(--border-color); z-index: 100; flex-shrink: 0; position: relative; }
    .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text-main); font-weight: 700; font-size: 24px; letter-spacing: -0.5px; }
    .nav-links { display: flex; gap: 24px; list-style: none; margin: 0; padding: 0; align-items: center; }
    .nav-links a { color: var(--text-muted); text-decoration: none; font-size: 15px; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--accent-primary); }
    .nav-cta { padding: 8px 18px; background: var(--text-main); color: var(--bg-base); border-radius: 6px; font-weight: 700; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.2px; transition: background 0.2s; }
    .nav-cta:hover { background: #e0e0e0; }

    /* MOBILE NAVBAR TOGGLE */
    .navbar-toggle { display: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 5px; }
    .navbar-toggle span { display: block; width: 24px; height: 2px; background: var(--text-main); transition: 0.3s; border-radius: 2px; }
    
    /* LAYOUT CONTAINER */
    .layout-container { display: flex; flex: 1; overflow: hidden; position: relative; }

    /* SIDEBAR */
    .sidebar { width: var(--sidebar-width); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: var(--bg-base); z-index: 50; overflow-y: auto; flex-shrink: 0; }
    .nav-sections { padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }
    .nav-group-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dark); font-weight: 700; margin-bottom: 12px; padding-left: 12px; }
    .nav-item { display: flex; flex-direction: column; padding: 12px 14px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; margin-bottom: 4px; position: relative; }
    .nav-item:hover { background: var(--bg-glass-hover); }
    .nav-item.active { background: var(--bg-panel); border-color: var(--border-color); }
    .nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent-primary); border-radius: 3px 0 0 3px; }
    .nav-item-name { font-weight: 600; font-size: 14px; color: var(--text-main); margin-bottom: 4px; }
    .nav-item-path { font-family: Monaco, monospace; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }

    .method-badge { font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 4px; font-family: "Rubik", sans-serif; letter-spacing: 0.5px; text-transform: uppercase; }
    .method-GET { background: var(--accent-primary); color: var(--bg-panel); border: none; }
    .method-POST { background: #6a5fc1; color: #ffffff; border: none; }

    /* MAIN CONTENT */
    .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; position: relative; background: var(--bg-base); }
    
    .top-bar-docs { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 16px 40px; background: var(--bg-panel); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 20; gap: 16px; }
    .sidebar-toggle-btn { display: none; background: var(--bg-glass); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; }
    
    .api-key-container { display: flex; flex-direction: column; gap: 8px; flex: 1; max-width: 500px; }
    .api-key-setup { display: flex; align-items: center; gap: 12px; background: var(--bg-base); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; transition: border-color 0.2s; }
    .api-key-setup.valid { border-color: var(--accent-primary); box-shadow: 0 0 0 1px var(--accent-primary); }
    .api-key-setup.invalid { border-color: var(--accent-secondary); box-shadow: 0 0 0 1px var(--accent-secondary); }
    .api-key-setup input { background: transparent; border: none; color: var(--text-main); font-family: Monaco, monospace; font-size: 14px; outline: none; width: 100%; }
    
    .api-status-card { display: none; background: var(--bg-base); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 8px; font-size: 13px; animation: fadeIn 0.3s; }
    .api-status-card.show { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .status-item { display: flex; flex-direction: column; gap: 4px; }
    .status-label { color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .status-val { color: var(--text-main); font-weight: 600; font-size: 14px; }
    .status-val.highlight { color: var(--accent-primary); }

    .content-grid { display: grid; grid-template-columns: 1fr 450px; gap: 40px; padding: 40px; max-width: 1400px; margin: 0 auto; width: 100%; align-items: start; }

    .doc-section { display: flex; flex-direction: column; gap: 32px; }
    .endpoint-header h1 { font-size: 32px; font-weight: 600; margin-bottom: 12px; line-height: 1.2; color: #ffffff; }
    .endpoint-header p { color: var(--text-muted); font-size: 16px; line-height: 1.6; }
    .endpoint-url-box { display: flex; align-items: center; gap: 16px; background: var(--bg-panel); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-lg); font-family: Monaco, monospace; font-size: 14px; word-break: break-all; }

    .auth-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 4px; font-size: 14px; font-weight: 600; background: var(--bg-panel); border: 1px solid var(--border-color); color: #ffffff; }

    .params-section { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; }
    .params-section h3 { font-size: 16px; margin-bottom: 16px; color: #ffffff; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }
    .params-list { display: flex; flex-direction: column; gap: 16px; }
    .param-item { padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
    .param-item:last-child { border-bottom: none; padding-bottom: 0; }
    .param-name { font-family: Monaco, monospace; font-weight: 600; color: #ffffff; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .param-req { font-size: 11px; color: var(--bg-panel); padding: 2px 6px; background: var(--accent-primary); border-radius: 4px; font-weight: 700; text-transform: uppercase; }
    .param-desc { color: var(--text-muted); font-size: 14px; margin-top: 8px; line-height: 1.5; }
    .param-example { display: inline-block; margin-top: 8px; font-family: Monaco, monospace; font-size: 12px; color: var(--text-main); background: var(--bg-base); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); }

    /* CODE INTEGRATION SNIPPETS */
    .code-snippets { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; margin-top: 32px; }
    .code-tabs { display: flex; border-bottom: 1px solid var(--border-color); background: var(--bg-base); }
    .code-tab { padding: 12px 20px; color: var(--text-muted); font-size: 14px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .code-tab:hover { background: var(--bg-glass); }
    .code-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); background: var(--bg-panel); }
    .code-content { padding: 20px; font-family: Monaco, monospace; font-size: 13px; color: #e2e8f0; overflow-x: auto; line-height: 1.5; margin: 0; }
    .code-content-wrapper { display: none; }
    .code-content-wrapper.active { display: block; animation: fadeIn 0.3s; }

    /* INTERACTIVE PANEL */
    .interactive-panel { background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); position: sticky; top: 20px; display: flex; flex-direction: column; max-height: calc(100vh - 140px); }
    .panel-header { padding: 16px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-base); border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
    .panel-header h3 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
    .panel-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; }
    .input-group { display: flex; flex-direction: column; gap: 6px; }
    .input-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    .input-group input { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 14px; color: var(--text-main); font-family: Monaco, monospace; font-size: 14px; }
    .input-group input:focus { border-color: var(--accent-primary); outline: none; }
    
    .btn-send { background: var(--text-main); color: var(--bg-base); border: none; border-radius: var(--radius-sm); padding: 14px; font-weight: 700; font-size: 14px; cursor: pointer; text-transform: uppercase; width: 100%; margin-top: 8px; transition: 0.2s; }
    .btn-send:hover { background: #e0e0e0; }
    .btn-send:disabled { opacity: 0.7; cursor: not-allowed; }
    
    .response-area { border-top: 1px solid var(--border-color); background: var(--bg-base); display: flex; flex-direction: column; flex: 1; min-height: 250px; border-radius: 0 0 var(--radius-lg) var(--radius-lg); }
    .res-header { padding: 12px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); background: var(--bg-panel); }
    .status-code { font-weight: 700; font-family: Monaco, monospace; padding: 2px 6px; border-radius: 4px; background: var(--bg-base); }
    .status-200 { color: var(--accent-primary); }
    .status-4xx { color: #f59e0b; }
    .status-5xx { color: var(--accent-secondary); }
    .res-body { padding: 16px; margin: 0; font-family: Monaco, monospace; font-size: 13px; color: #ffffff; overflow: auto; flex: 1; }
    
    /* JSON Highlighting */
    .json-key { color: var(--accent-secondary); font-weight: 600; }
    .json-string { color: var(--accent-primary); }
    .json-number { color: #60a5fa; }
    .json-boolean { color: #a78bfa; }
    .json-null { color: var(--text-dark); font-style: italic; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* MOBILE RESPONSIVE ENHANCEMENTS */
    @media (max-width: 1024px) {
      .content-grid { grid-template-columns: 1fr; gap: 32px; padding: 24px; }
      .interactive-panel { position: static; max-height: none; }
    }
    
    @media (max-width: 768px) {
      /* Navbar */
      .navbar { padding: 0 16px; }
      .navbar-toggle { display: flex; }
      .nav-links { display: none; position: absolute; top: var(--navbar-height); left: 0; right: 0; background: var(--bg-panel); flex-direction: column; padding: 20px; border-bottom: 1px solid var(--border-color); gap: 16px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); z-index: 99; }
      .nav-links.active { display: flex; }
      .nav-cta { display: none; }
      .nav-links.active + .nav-cta, .nav-cta.active { display: block; width: calc(100% - 40px); text-align: center; margin: 16px 20px 20px; position: absolute; top: calc(var(--navbar-height) + 160px); z-index: 100; }
      
      /* Sidebar */
      .sidebar { position: absolute; left: -100%; top: 0; bottom: 0; z-index: 60; transition: left 0.3s; box-shadow: 4px 0 24px rgba(0,0,0,0.5); width: 300px; }
      .sidebar.open { left: 0; }
      
      /* Top Bar */
      .top-bar-docs { padding: 16px; gap: 16px; flex-direction: column; align-items: stretch; }
      .sidebar-toggle-btn { display: block; text-align: center; }
      .api-key-container { max-width: 100%; }
      
      /* Content Grid */
      .content-grid { padding: 16px; }
      .endpoint-header h1 { font-size: 26px; }
      .endpoint-url-box { flex-direction: column; align-items: flex-start; padding: 12px; }
      
      .api-status-card.show { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- GLOBAL NAVBAR -->
  <nav class="navbar">
    <a href="/" class="nav-brand">Dramoo</a>
    <div class="navbar-toggle" onclick="toggleGlobalNavbar()">
      <span></span><span></span><span></span>
    </div>
    <ul class="nav-links" id="globalNavLinks">
      <li><a href="/#pricing">Pricing</a></li>
      <li><a href="/docs/" class="active">Docs</a></li>
      <li><a href="/admin/">Admin</a></li>
    </ul>
    <a href="https://t.me/dramoobot" class="nav-cta" id="globalNavCta">Get Started</a>
  </nav>

  <div class="layout-container">
    <!-- SIDEBAR -->
    <aside class="sidebar" id="appSidebar">
      <div class="nav-sections" id="navSections">
        <!-- Populated by JS -->
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main-content" id="mainContent">
      <div class="top-bar-docs">
        <button class="sidebar-toggle-btn" onclick="document.getElementById('appSidebar').classList.toggle('open')">☰ Menu & Endpoints</button>
        <div class="api-key-container">
          <div class="api-key-setup" id="apiKeyInputBox">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            <input type="text" id="globalApiKey" placeholder="Paste X-Api-Key here..." oninput="debounceKeyCheck()">
          </div>
          <div class="api-status-card" id="apiStatusCard">
            <!-- Populated by JS -->
          </div>
        </div>
      </div>

      <div class="content-grid">
        <!-- DOCUMENTATION INFO -->
        <div class="doc-section">
          <div id="docSectionContent"></div>
          
          <!-- Code Integrations -->
          <div class="code-snippets" id="codeIntegrationBlock">
            <div class="code-tabs">
              <div class="code-tab active" onclick="switchCodeTab('curl')">cURL</div>
              <div class="code-tab" onclick="switchCodeTab('node')">Node.js</div>
              <div class="code-tab" onclick="switchCodeTab('php')">PHP</div>
              <div class="code-tab" onclick="switchCodeTab('python')">Python</div>
            </div>
            <pre class="code-content-wrapper active" id="code-curl"><code class="code-content"></code></pre>
            <pre class="code-content-wrapper" id="code-node"><code class="code-content"></code></pre>
            <pre class="code-content-wrapper" id="code-php"><code class="code-content"></code></pre>
            <pre class="code-content-wrapper" id="code-python"><code class="code-content"></code></pre>
          </div>
        </div>

        <!-- INTERACTIVE PLAYGROUND -->
        <div class="interactive-panel" id="interactivePanel" style="display: none;">
          <div class="panel-header">
            <h3><span id="panelMethod" class="method-badge"></span> API Console</h3>
          </div>
          <div class="panel-body">
            <div id="dynamicInputs" style="display:flex;flex-direction:column;gap:12px;"></div>
            <button class="btn-send" id="btnSend" onclick="executeRequest()">Send Request</button>
          </div>
          <div class="response-area" style="display:none;" id="responseArea">
            <div class="res-header">
              <div>Status: <span class="status-code" id="resStatus">-</span></div>
              <div id="resTime" style="font-family:Monaco, monospace; color:var(--text-main)">- ms</div>
            </div>
            <pre class="res-body" id="resBody"></pre>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    const API_BASE = window.location.origin;
    let keyCheckTimeout = null;
    
    // Toggle global navbar on mobile
    function toggleGlobalNavbar() {
      document.getElementById('globalNavLinks').classList.toggle('active');
      document.getElementById('globalNavCta').classList.toggle('active');
    }
    
    const endpoints = [
      {
        category: "Dramoo Scraper API",
        items: [
          { 
            id: "api-latest-all", method: "GET", path: "/api/latest", 
            name: "Latest Drama (Global)", desc: "Mendapatkan daftar drama terbaru dari semua platform yang didukung secara bersamaan.", 
            needsAuth: true, queryParams: [{name: "page", example: "1", desc: "Nomor halaman (1-100)"}] 
          },
          { 
            id: "api-latest-plat", method: "GET", path: "/api/{platform}/latest", 
            name: "Latest Drama (Per Platform)", desc: "Mendapatkan daftar drama terbaru dari satu platform spesifik.", 
            needsAuth: true, 
            pathParams: [{name: "platform", required: true, example: "netshort", desc: "Pilih platform (contoh: melolo, pinedrama, netshort, dramabox)"}], 
            queryParams: [{name: "page", example: "1", desc: "Nomor halaman"}] 
          },
          { 
            id: "api-search-all", method: "GET", path: "/api/search", 
            name: "Search Drama (Global)", desc: "Mencari drama di seluruh platform secara paralel menggunakan kata kunci.", 
            needsAuth: true, queryParams: [{name: "q", required: true, example: "ceo", desc: "Kata kunci pencarian"}, {name: "page", example: "1"}] 
          },
          { 
            id: "api-search-plat", method: "GET", path: "/api/{platform}/search", 
            name: "Search Drama (Per Platform)", desc: "Mencari drama spesifik pada satu platform.", 
            needsAuth: true, 
            pathParams: [{name: "platform", required: true, example: "melolo", desc: "Platform target"}], 
            queryParams: [{name: "q", required: true, example: "love"}, {name: "page", example: "1"}] 
          },
          { 
            id: "api-detail", method: "GET", path: "/api/{platform}/detail", 
            name: "Get Detail & Episodes", desc: "Mendapatkan detail metadata drama beserta daftar episode lengkap.", 
            needsAuth: true, 
            pathParams: [{name: "platform", required: true, example: "netshort", desc: "Platform target"}], 
            queryParams: [{name: "url", required: true, example: "https://netshort.com/id/episode/kembalinya-phoenix-1903664881032974338", desc: "URL drama lengkap"}] 
          },
          { 
            id: "api-stream", method: "GET", path: "/api/{platform}/stream", 
            name: "Get Video Stream URL", desc: "Mengekstrak URL streaming video asli dari episode tertentu.", 
            needsAuth: true, 
            pathParams: [{name: "platform", required: true, example: "netshort"}], 
            queryParams: [{name: "url", required: true, example: "https://netshort.com/id/episode/kembalinya-phoenix-1903664881032974338", desc: "URL episode spesifik"}] 
          }
        ]
      },
      {
        category: "System APIs",
        items: [
          { id: "sys-platforms", method: "GET", path: "/api/platforms", name: "Available Platforms", desc: "Daftar platform scraping yang bisa diakses.", needsAuth: true },
          { id: "sys-me", method: "GET", path: "/api/me", name: "Account Profil", desc: "Cek informasi akun dan sisa limit harian.", needsAuth: true },
          { id: "sys-status", method: "GET", path: "/api/status", name: "System Status", desc: "Status layanan global." }
        ]
      }
    ];

    let currentEndpoint = null;

    window.onload = () => {
      const savedKey = localStorage.getItem('dramoo_api_key');
      if (savedKey) {
        document.getElementById('globalApiKey').value = savedKey;
        checkApiKeyStatus(savedKey);
      }
      
      renderSidebar();
      if (endpoints[0].items.length > 0) selectEndpoint(endpoints[0].items[0]);
    };

    function debounceKeyCheck() {
      const val = document.getElementById('globalApiKey').value.trim();
      localStorage.setItem('dramoo_api_key', val);
      
      document.getElementById('apiKeyInputBox').classList.remove('valid', 'invalid');
      document.getElementById('apiStatusCard').classList.remove('show');
      
      clearTimeout(keyCheckTimeout);
      if (val.length > 10) {
        keyCheckTimeout = setTimeout(() => {
          checkApiKeyStatus(val);
        }, 800);
      }
    }

    async function checkApiKeyStatus(key) {
      try {
        const res = await fetch('/api/me', { headers: { 'X-Api-Key': key } });
        const data = await res.json();
        
        const card = document.getElementById('apiStatusCard');
        const box = document.getElementById('apiKeyInputBox');
        
        if (data.success && data.data) {
          box.classList.add('valid');
          box.classList.remove('invalid');
          
          const d = data.data;
          const remaining = d.daily_limit - d.daily_used;
          
          // Hitung sisa hari
          let expiryText = d.expires_at;
          const expDate = new Date(d.expires_at);
          const now = new Date();
          if (expDate > now) {
            const diffTime = Math.abs(expDate - now);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            expiryText = \`\${diffDays} Hari Lagi (\${expDate.toLocaleDateString('id-ID')})\`;
          }

          card.innerHTML = \`
            <div class="status-item">
              <span class="status-label">Plan / Paket</span>
              <span class="status-val highlight">\${d.package_name.toUpperCase()}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Limit Harian (Sisa)</span>
              <span class="status-val">\${remaining.toLocaleString()} / \${d.daily_limit.toLocaleString()}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Total Akses Digunakan</span>
              <span class="status-val">\${d.total_used.toLocaleString()} Request</span>
            </div>
            <div class="status-item">
              <span class="status-label">Masa Aktif</span>
              <span class="status-val">\${expiryText}</span>
            </div>
          \`;
          card.classList.add('show');
        } else {
          box.classList.add('invalid');
          box.classList.remove('valid');
        }
        
        // Update code snippets with new key
        if(currentEndpoint) updateCodeSnippets(currentEndpoint);
      } catch (e) {
        console.error(e);
      }
    }

    function renderSidebar() {
      const container = document.getElementById('navSections');
      let html = '';
      endpoints.forEach(section => {
        html += \`<div class="nav-group"><div class="nav-group-title">\${section.category}</div>\`;
        section.items.forEach(item => {
          html += \`
            <div class="nav-item" id="nav-\${item.id}" onclick='selectEndpointById("\${item.id}")'>
              <div class="nav-item-name">\${item.name}</div>
              <div class="nav-item-path">
                <span class="method-badge method-\${item.method}">\${item.method}</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${item.path}</span>
              </div>
            </div>
          \`;
        });
        html += \`</div>\`;
      });
      container.innerHTML = html;
    }

    function selectEndpointById(id) {
      for (const cat of endpoints) {
        const found = cat.items.find(i => i.id === id);
        if (found) { selectEndpoint(found); return; }
      }
    }

    function buildSampleUrl(item) {
      let url = API_BASE + item.path;
      if (item.pathParams) {
        item.pathParams.forEach(p => { url = url.replace(\`{\${p.name}}\`, p.example || \`\${p.name}\`); });
      }
      if (item.queryParams && item.queryParams.length > 0) {
        const queryStrings = item.queryParams.map(p => \`\${p.name}=\${encodeURIComponent(p.example || '')}\`);
        url += '?' + queryStrings.join('&');
      }
      return url;
    }

    function updateCodeSnippets(item) {
      const url = buildSampleUrl(item);
      const key = document.getElementById('globalApiKey').value.trim() || 'YOUR_API_KEY';
      const headersStr = item.needsAuth ? \`\\n  -H "X-Api-Key: \${key}"\` : '';
      
      // cURL
      const curlCode = \`curl -X \${item.method} "\${url}"\${headersStr}\`;
      document.querySelector('#code-curl .code-content').textContent = curlCode;

      // Node.js
      const nodeHeaders = item.needsAuth ? \`\\n    headers: { 'X-Api-Key': '\${key}' }\` : '';
      const nodeCode = \`fetch("\${url}", {
  method: "\${item.method}"\${nodeHeaders}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));\`;
      document.querySelector('#code-node .code-content').textContent = nodeCode;

      // PHP
      const phpHeaders = item.needsAuth ? \`\\n    "X-Api-Key: \${key}"\` : '';
      const phpCode = \`<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "\${url}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "\${item.method}");\${item.needsAuth ? \`\\ncurl_setopt($ch, CURLOPT_HTTPHEADER, array(\${phpHeaders}\\n));\` : ''}

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>\`;
      document.querySelector('#code-php .code-content').textContent = phpCode;

      // Python
      const pyHeaders = item.needsAuth ? \`, headers={'X-Api-Key': '\${key}'}\` : '';
      const pyCode = \`import requests

url = "\${url}"
response = requests.request("\${item.method}", url\${pyHeaders})

print(response.json())\`;
      document.querySelector('#code-python .code-content').textContent = pyCode;
    }

    function switchCodeTab(lang) {
      document.querySelectorAll('.code-tab').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.code-content-wrapper').forEach(el => el.classList.remove('active'));
      
      event.target.classList.add('active');
      document.getElementById(\`code-\${lang}\`).classList.add('active');
    }

    function selectEndpoint(item) {
      currentEndpoint = item;
      
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const activeNav = document.getElementById(\`nav-\${item.id}\`);
      if (activeNav) activeNav.classList.add('active');

      if (window.innerWidth <= 768) {
        document.getElementById('appSidebar').classList.remove('open');
      }

      let html = \`
        <div class="endpoint-header">
          <h1>\${item.name}</h1>
          <p>\${item.desc}</p>
        </div>
        
        <div class="endpoint-url-box">
          <span class="method-badge method-\${item.method}" style="font-size:12px; padding:4px 10px">\${item.method}</span>
          <span>\${item.path}</span>
        </div>
      \`;

      if (item.needsAuth) {
        html += \`<div style="margin-top:16px"><div class="auth-badge">Requires X-Api-Key Header</div></div>\`;
      }

      const buildParamsTable = (params, title) => {
        if (!params || params.length === 0) return '';
        return \`
          <div class="params-section">
            <h3>\${title}</h3>
            <div class="params-list">
              \${params.map(p => \`
                <div class="param-item">
                  <div class="param-name">\${p.name}\${p.required ? '<span class="param-req">Required</span>' : ''}</div>
                  <div class="param-desc">\${p.desc || ''}</div>
                  \${p.example ? \`<div class="param-example">Example: \${p.example}</div>\` : ''}
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      };

      if (item.pathParams && item.pathParams.length > 0) html += \`<div style="margin-top:24px">\${buildParamsTable(item.pathParams, "Path Parameters")}</div>\`;
      if (item.queryParams && item.queryParams.length > 0) html += \`<div style="margin-top:24px">\${buildParamsTable(item.queryParams, "Query Parameters")}</div>\`;

      document.getElementById('docSectionContent').innerHTML = html;
      updateCodeSnippets(item);

      // Render Interactive Panel
      document.getElementById('interactivePanel').style.display = 'flex';
      document.getElementById('panelMethod').className = \`method-badge method-\${item.method}\`;
      document.getElementById('panelMethod').textContent = item.method;
      
      let inputsHtml = '';
      if (item.pathParams) {
        item.pathParams.forEach(p => {
          inputsHtml += \`
            <div class="input-group">
              <label>PATH: \${p.name} \${p.required?'*':''}</label>
              <input type="text" id="input_path_\${p.name}" value="\${p.example || ''}" placeholder="\${p.example || ''}" oninput="updateSnippetRealtime()">
            </div>
          \`;
        });
      }
      if (item.queryParams) {
        item.queryParams.forEach(p => {
          inputsHtml += \`
            <div class="input-group">
              <label>QUERY: \${p.name} \${p.required?'*':''}</label>
              <input type="text" id="input_query_\${p.name}" value="\${p.example || ''}" placeholder="\${p.example || ''}" oninput="updateSnippetRealtime()">
            </div>
          \`;
        });
      }
      
      if (inputsHtml === '') inputsHtml = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0;">No parameters required for this request</div>';

      document.getElementById('dynamicInputs').innerHTML = inputsHtml;
      document.getElementById('responseArea').style.display = 'none';
    }

    function updateSnippetRealtime() {
      if(!currentEndpoint) return;
      // Copy endpoint temp and replace example with current input values
      let tempEndpoint = JSON.parse(JSON.stringify(currentEndpoint));
      
      if (tempEndpoint.pathParams) {
        tempEndpoint.pathParams.forEach(p => {
          p.example = document.getElementById(\`input_path_\${p.name}\`).value.trim();
        });
      }
      if (tempEndpoint.queryParams) {
        tempEndpoint.queryParams.forEach(p => {
          p.example = document.getElementById(\`input_query_\${p.name}\`).value.trim();
        });
      }
      updateCodeSnippets(tempEndpoint);
    }

    async function executeRequest() {
      if (!currentEndpoint) return;
      const btn = document.getElementById('btnSend');
      btn.textContent = 'Processing...';
      btn.disabled = true;

      let url = API_BASE + currentEndpoint.path;
      
      try {
        if (currentEndpoint.pathParams) {
          currentEndpoint.pathParams.forEach(p => {
            const val = document.getElementById(\`input_path_\${p.name}\`).value.trim();
            if (p.required && !val) throw new Error(\`Path parameter '\${p.name}' is required!\`);
            url = url.replace(\`{\${p.name}}\`, encodeURIComponent(val));
          });
        }

        if (currentEndpoint.queryParams) {
          const urlObj = new URL(url);
          currentEndpoint.queryParams.forEach(p => {
            const val = document.getElementById(\`input_query_\${p.name}\`).value.trim();
            if (p.required && !val) throw new Error(\`Query parameter '\${p.name}' is required!\`);
            if (val) urlObj.searchParams.append(p.name, val);
          });
          url = urlObj.toString();
        }

        const headers = { 'Content-Type': 'application/json' };
        if (currentEndpoint.needsAuth) {
          const apiKey = document.getElementById('globalApiKey').value.trim();
          if (!apiKey) throw new Error('X-Api-Key is missing. Please enter it at the top bar.');
          headers['X-Api-Key'] = apiKey;
        }

        const startTime = performance.now();
        const response = await fetch(url, { method: currentEndpoint.method, headers: headers });
        const endTime = performance.now();
        
        document.getElementById('responseArea').style.display = 'flex';
        const statusEl = document.getElementById('resStatus');
        statusEl.textContent = \`\${response.status} \${response.statusText}\`;
        statusEl.className = \`status-code \${response.ok ? 'status-200' : (response.status >= 500 ? 'status-5xx' : 'status-4xx')}\`;
        document.getElementById('resTime').textContent = \`\${Math.round(endTime - startTime)} ms\`;

        let bodyText = await response.text();
        try {
          const json = JSON.parse(bodyText);
          document.getElementById('resBody').innerHTML = syntaxHighlight(JSON.stringify(json, null, 2));
        } catch(e) {
          document.getElementById('resBody').textContent = bodyText;
        }
      } catch (err) {
        alert(err.message);
      } finally {
        btn.textContent = 'Send Request';
        btn.disabled = false;
        
        // Cek ulan api key stat kalo sudah req (update limit)
        const key = document.getElementById('globalApiKey').value.trim();
        if(key.length > 10) checkApiKeyStatus(key);
      }
    }

    function syntaxHighlight(json) {
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
        var cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
            match = match.replace(/"/g, '');
          } else { cls = 'json-string'; }
        } else if (/true|false/.test(match)) { cls = 'json-boolean'; } 
        else if (/null/.test(match)) { cls = 'json-null'; }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'public/docs/index.html'), newDocsHtml);
console.log('Successfully rewrote public/docs/index.html with integration snippets and live API Key validation');
