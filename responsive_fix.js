const fs = require('fs');

// 1. Fix public/index.html
let indexHtml = fs.readFileSync('./public/index.html', 'utf8');
if (!indexHtml.includes('navbar-toggle')) {
  // Add mobile menu logic
  indexHtml = indexHtml.replace('</head>', `
  <style>
    /* Mobile First Enhancements */
    .navbar { flex-wrap: wrap; }
    .navbar-toggle { display: none; cursor: pointer; flex-direction: column; gap: 4px; }
    .navbar-toggle span { display: block; width: 24px; height: 2px; background: var(--on-primary); transition: 0.3s; }
    
    @media (max-width: 768px) {
      .navbar-toggle { display: flex; }
      .nav-links { display: none; width: 100%; flex-direction: column; padding-top: 16px; gap: 16px; }
      .nav-links.active { display: flex; }
      .nav-cta { display: none; }
      .nav-cta.active { display: block; width: 100%; text-align: center; margin-top: 16px; }
      
      .hero { padding: 120px 16px 64px; }
      .hero h1 { font-size: 48px; }
      .hero-buttons { flex-direction: column; width: 100%; }
      .hero-buttons a { width: 100%; text-align: center; }
      
      section { padding: 64px 16px; }
      .section-header h2 { font-size: 36px; }
      
      .pricing-grid { grid-template-columns: 1fr; }
    }
    
    @media (max-width: 480px) {
      .hero h1 { font-size: 36px; }
    }
  </style>
</head>`);
  indexHtml = indexHtml.replace('<ul class="nav-links">', `<div class="navbar-toggle" onclick="document.querySelector('.nav-links').classList.toggle('active'); document.querySelector('.nav-cta').classList.toggle('active');"><span></span><span></span><span></span></div>\n    <ul class="nav-links">`);
  fs.writeFileSync('./public/index.html', indexHtml, 'utf8');
}


// 2. Fix public/docs.html
let docsHtml = fs.readFileSync('./public/docs.html', 'utf8');
if (!docsHtml.includes('mobile-menu-btn')) {
  docsHtml = docsHtml.replace('</head>', `
  <style>
    /* Mobile First Enhancements */
    .mobile-menu-btn { display: none; position: fixed; bottom: 24px; right: 24px; z-index: 1000; background: var(--ink-deep); color: var(--on-primary); width: 56px; height: 56px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.2); border: none; font-size: 24px; align-items: center; justify-content: center; cursor: pointer; }
    
    @media (max-width: 1024px) {
      .sidebar { transform: translateX(-100%); transition: transform 0.3s; box-shadow: 4px 0 24px rgba(0,0,0,0.1); }
      .sidebar.active { transform: translateX(0); }
      .main-content { margin-left: 0; padding: 48px 24px; max-width: 100%; }
      .mobile-menu-btn { display: flex; }
      
      .display-large { font-size: 40px; }
      .heading-xl { font-size: 24px; }
      .code-block { font-size: 14px; padding: 12px; }
      
      .table { display: block; overflow-x: auto; white-space: nowrap; }
    }
    
    @media (max-width: 480px) {
      .display-large { font-size: 32px; }
      .endpoint-card { padding: 16px; }
      .endpoint-url { font-size: 14px; flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  </style>
</head>`);
  docsHtml = docsHtml.replace('<body>', `<body>
  <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('active');">☰</button>`);
  fs.writeFileSync('./public/docs.html', docsHtml, 'utf8');
}


// 3. Fix public/admin/index.html
let adminHtml = fs.readFileSync('./public/admin/index.html', 'utf8');
if (!adminHtml.includes('/* Admin Mobile Enhancements */')) {
  adminHtml = adminHtml.replace('</head>', `
  <style>
    /* Admin Mobile Enhancements */
    @media (max-width: 768px) {
      .content-wrapper { padding: 16px; }
      .card { padding: 16px; margin-bottom: 16px; }
      .summary-grid { gap: 16px; grid-template-columns: 1fr; }
      .summary-card { padding: 24px; }
      .summary-value { font-size: 40px; }
      
      .topbar { padding: 0 16px; }
      .topbar-title { font-size: 18px; }
      
      .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      table { min-width: 600px; }
      
      .modal { margin: 16px; width: calc(100% - 32px); }
      .modal-header, .modal-body, .modal-footer { padding: 16px; }
      
      .login-card { margin: 16px; padding: 24px; width: calc(100% - 32px); }
      
      .platforms-grid, .health-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>`);
  fs.writeFileSync('./public/admin/index.html', adminHtml, 'utf8');
}


// 4. Fix public/docs/index.html
let interactiveDocsHtml = fs.readFileSync('./public/docs/index.html', 'utf8');
if (!interactiveDocsHtml.includes('/* Interactive Docs Mobile Enhancements */')) {
  interactiveDocsHtml = interactiveDocsHtml.replace('</head>', `
  <style>
    /* Interactive Docs Mobile Enhancements */
    @media (max-width: 1024px) {
      .content-grid { grid-template-columns: 1fr; padding: 24px; gap: 24px; }
      .interactive-panel { position: static; }
    }
    
    @media (max-width: 768px) {
      .top-bar { padding: 0 16px; height: 60px; }
      .api-setup-wrapper { width: 100%; }
      .api-key-setup { width: 100%; }
      .api-key-setup input { width: 100%; }
      
      .endpoint-header h1 { font-size: 28px; }
      .endpoint-url-box { flex-direction: column; align-items: flex-start; font-size: 14px; padding: 12px; word-break: break-all; }
      
      .params-section { padding: 16px; }
      .params-table, .params-table tbody, .params-table tr, .params-table td { display: block; width: 100%; }
      .params-table thead { display: none; }
      .params-table td { padding: 8px 0; border: none; }
      .params-table tr { border-bottom: 1px solid var(--border-color); padding: 8px 0; }
      
      .panel-header, .panel-body { padding: 16px; }
      .res-body { font-size: 12px; padding: 16px; }
    }
  </style>
</head>`);
  fs.writeFileSync('./public/docs/index.html', interactiveDocsHtml, 'utf8');
}

console.log('Successfully injected mobile responsive fixes.');
