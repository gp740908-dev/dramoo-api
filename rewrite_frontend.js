const fs = require('fs');

const adminPath = './public/admin/index.html';
let adminHtml = fs.readFileSync(adminPath, 'utf8');

// Replace standard colors with Sentry colors in CSS
const newAdminCss = `
    :root {
      --bg-primary: #150f23;
      --bg-secondary: #1f1633;
      --bg-card: #1f1633;
      --bg-glass: #1f1633;
      --border-glass: #362d59;
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.72);
      --text-muted: rgba(255,255,255,0.72);
      --accent-purple: #c2ef4e; /* Use lime for highlights */
      --accent-blue: #fa7faa;
      --accent-cyan: #6a5fc1;
      --accent-green: #c2ef4e;
      --accent-red: #fa7faa;
      --accent-amber: #f59e0b;
      --gradient-primary: linear-gradient(135deg, #422082, #79628c);
      --radius: 12px;
      --radius-sm: 8px;
      --transition: all 0.2s ease;
      --sidebar-width: 260px;
      font-family: "Rubik", -apple-system, system-ui, sans-serif;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg-primary); color: var(--text-primary); font-size: 16px; font-weight: 500; font-family: "Rubik", -apple-system, system-ui, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-primary); }
    ::-webkit-scrollbar-thumb { background: #362d59; border-radius: 3px; }

    .flex { display: flex; } .flex-col { display: flex; flex-direction: column; } .items-center { align-items: center; } .justify-between { justify-content: space-between; } .gap-2 { gap: 0.5rem; } .gap-4 { gap: 1rem; } .mt-4 { margin-top: 1rem; } .mb-4 { margin-bottom: 1rem; } .grid { display: grid; } .hidden { display: none !important; }

    button { font-family: inherit; cursor: pointer; transition: var(--transition); outline: none; border: none; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; }
    .btn { padding: 12px 16px; border-radius: 8px; font-size: 14px; }
    .btn-primary { background: #ffffff; color: #150f23; }
    .btn-primary:hover { background: #f0f0f0; color: #1a1a1a; box-shadow: rgba(0,0,0,0.08) 0 2px 8px 0; }
    .btn-outline { background: transparent; border: 1px solid #362d59; color: #ffffff; }
    .btn-outline:hover { background: rgba(255,255,255,0.05); }
    .btn-danger { background: transparent; color: #fa7faa; border: 1px solid #fa7faa; }
    .btn-danger:hover { background: rgba(250,127,170,0.1); }
    
    input, select, textarea { width: 100%; padding: 8px 12px; background: #ffffff; border: 1px solid #cfcfdb; border-radius: 6px; color: #1f1633; font-family: inherit; font-size: 16px; transition: var(--transition); }
    input:focus, select:focus, textarea:focus { border-color: rgba(59,130,246,0.5); box-shadow: rgba(0,0,0,0.15) 0 2px 10px inset; outline: none; }
    option { background: #ffffff; color: #1f1633; }

    .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.25px; display: inline-flex; align-items: center; justify-content: center; }
    .badge-active { background: #150f23; color: #ffffff; }
    .badge-expired { background: #150f23; color: #ffffff; }
    .badge-revoked { background: #150f23; color: #ffffff; }
    .badge-suspended { background: #150f23; color: #ffffff; }
    .badge-maintenance { background: #150f23; color: #ffffff; }
    .badge-coming_soon { background: #150f23; color: #ffffff; }
    .badge-tier { background: #79628c; color: #ffffff; border-radius: 12px; padding: 4px 12px; font-size: 14px; text-transform: none; font-weight: 500; }

    .login-screen { position: fixed; inset: 0; background: #150f23; display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .login-card { background: #1f1633; border: 1px solid #362d59; border-radius: 12px; padding: 32px; width: 100%; max-width: 400px; text-align: center; }
    .login-logo { width: 60px; height: 60px; background: #c2ef4e; color: #1f1633; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; margin: 0 auto 1.5rem; }
    .login-card h2 { margin-bottom: 0.5rem; font-size: 24px; color: #ffffff; }
    .login-card p { color: rgba(255,255,255,0.72); margin-bottom: 32px; font-size: 16px; }
    .login-card input { margin-bottom: 16px; text-align: center; }
    .login-card button { width: 100%; }

    .app-layout { display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 260px; background: #1f1633; border-right: 1px solid #362d59; display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 100; }
    .sidebar-header { padding: 24px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #362d59; }
    .sidebar-header .logo { width: 32px; height: 32px; background: #c2ef4e; color: #1f1633; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-family: "Rubik", sans-serif; }
    .sidebar-header span { font-weight: 700; font-size: 18px; color: #ffffff; }
    .close-sidebar { display: none; cursor: pointer; font-size: 1.2rem; margin-left: auto; color: rgba(255,255,255,0.72); }
    .sidebar-nav { flex: 1; overflow-y: auto; padding: 20px 12px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; color: rgba(255,255,255,0.72); text-decoration: none; font-weight: 500; font-size: 16px; }
    .nav-item:hover { color: #ffffff; }
    .nav-item.active { background: rgba(255,255,255,0.05); color: #ffffff; font-weight: 600; }
    .sidebar-footer { padding: 20px; border-top: 1px solid #362d59; }
    .logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: transparent; color: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #362d59; }
    .logout-btn:hover { background: #1a1a1a; }

    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #150f23; }
    .topbar { height: 70px; border-bottom: 1px solid #362d59; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: #1f1633; }
    .hamburger { display: none; cursor: pointer; font-size: 1.5rem; margin-right: 16px; }
    .topbar-title { font-size: 24px; font-weight: 500; color: #ffffff; }
    .server-status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.72); background: #150f23; padding: 4px 8px; border-radius: 4px; border: none; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #c2ef4e; }

    .content-wrapper { flex: 1; overflow-y: auto; padding: 32px; }
    .page { display: none; } .page.active { display: block; }

    .card { background: #1f1633; border: 1px solid #362d59; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #362d59; }
    .card-title { font-size: 24px; font-weight: 500; color: #ffffff; }

    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .summary-card { background: #1f1633; border: 1px solid #362d59; border-radius: 12px; padding: 32px; display: flex; flex-direction: column; gap: 8px; }
    .summary-value { font-size: 60px; font-weight: 500; line-height: 1.1; color: #ffffff; font-family: "Rubik", sans-serif; }
    .summary-label { color: rgba(255,255,255,0.72); font-size: 15px; font-weight: 500; text-transform: uppercase; }

    .table-responsive { overflow-x: auto; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 16px; background: transparent; color: rgba(255,255,255,0.72); font-weight: 600; font-size: 14px; border-bottom: 1px solid #362d59; }
    td { padding: 16px; border-bottom: 1px solid #362d59; font-size: 16px; color: #ffffff; }
    .code-text { font-family: Monaco, monospace; font-size: 16px; background: #150f23; padding: 4px 8px; border-radius: 6px; }
    .action-btns { display: flex; gap: 6px; }
    .action-btn { padding: 8px; background: #150f23; border: none; border-radius: 6px; color: #ffffff; font-size: 1rem; line-height: 1; }
    .action-btn:hover { background: #422082; }

    .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #362d59; }
    .page-info { color: rgba(255,255,255,0.72); font-size: 14px; }
    .page-controls { display: flex; gap: 8px; }
    .page-btn { padding: 8px 12px; background: #150f23; border: none; border-radius: 6px; color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; }
    .page-btn:hover:not(:disabled) { background: #422082; }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(21, 15, 35, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; pointer-events: none; }
    .modal-overlay.active { opacity: 1; pointer-events: all; }
    .modal { background: #1f1633; border: 1px solid #362d59; border-radius: 12px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-header { padding: 32px; border-bottom: 1px solid #362d59; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { font-size: 24px; font-weight: 500; }
    .modal-close { cursor: pointer; font-size: 1.5rem; color: rgba(255,255,255,0.72); }
    .modal-body { padding: 32px; display: flex; flex-direction: column; gap: 16px; }
    .modal-footer { padding: 32px; border-top: 1px solid #362d59; display: flex; justify-content: flex-end; gap: 12px; background: #150f23; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 16px; color: #ffffff; font-weight: 500; }

    .bar-chart { display: flex; align-items: flex-end; height: 200px; gap: 16px; padding-top: 20px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; max-width: 40px; background: #c2ef4e; border-radius: 4px 4px 0 0; }
    .bar-label { font-size: 12px; color: rgba(255,255,255,0.72); text-align: center; }
    .bar-value { font-size: 14px; font-weight: 600; color: #ffffff; }

    .platforms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; }
    .platform-card { background: #150f23; border: 1px solid #362d59; border-radius: 12px; padding: 24px; display: flex; align-items: center; gap: 16px; cursor: pointer; }
    .platform-card:hover { border-color: #c2ef4e; }
    .p-logo { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #1f1633; font-size: 1.2rem; background: #c2ef4e; }
    .p-info { flex: 1; }
    .p-name { font-weight: 600; margin-bottom: 4px; font-size: 18px; }
    .p-meta { display: flex; gap: 6px; }

    .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
    .health-stat { background: #150f23; padding: 24px; border-radius: 12px; border: 1px solid #362d59; }
    .health-stat .label { color: rgba(255,255,255,0.72); font-size: 15px; margin-bottom: 8px; text-transform: uppercase; }
    .health-stat .val { font-size: 24px; font-family: Monaco, monospace; color: #ffffff; }

    .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; }
    .toast { padding: 16px 24px; border-radius: 8px; font-size: 16px; font-weight: 500; background: #1f1633; color: #ffffff; border: 1px solid #362d59; }
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .center-spinner { display: flex; justify-content: center; padding: 40px; }

    @media (max-width: 768px) {
      .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; transition: left 0.3s ease; }
      .sidebar.open { left: 0; }
      .hamburger { display: block; }
      .close-sidebar { display: block; }
      .summary-grid { grid-template-columns: 1fr 1fr; }
    }
`;

adminHtml = adminHtml.replace(/<style>[\s\S]*?<\/style>/, `<style>${newAdminCss}</style>`);
fs.writeFileSync(adminPath, adminHtml, 'utf8');

// Also do index.html (Main marketing page)
const indexPath = './public/index.html';
const newIndexHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dramoo API — Platform Drama Pendek Asia Terlengkap</title>
  <meta name="description" content="Dramoo API Aggregator - Akses 38+ platform drama pendek Asia dalam satu API.">
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #150f23;
      --ink-deep: #1f1633;
      --on-primary: #ffffff;
      --accent-lime: #c2ef4e;
      --accent-pink: #fa7faa;
      --surface-night: #150f23;
      --surface-canvas-light: #ffffff;
      --surface-canvas-dark: #1f1633;
      --hairline-violet: #362d59;
      --hairline-cloud: #e5e7eb;
      --ink: #1f1633;
      font-family: "Rubik", -apple-system, system-ui, sans-serif;
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { background: var(--surface-canvas-dark); color: var(--on-primary); line-height: 1.5; overflow-x: hidden; font-family: var(--font-family); }

    .navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; background: var(--surface-canvas-dark); border-bottom: 1px solid var(--hairline-violet); }
    .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--on-primary); font-weight: 700; font-size: 24px; }
    .nav-links { display: flex; gap: 24px; list-style: none; }
    .nav-links a { color: var(--on-primary); text-decoration: none; font-size: 16px; font-weight: 500; }
    .nav-links a:hover { color: var(--accent-lime); }
    .nav-cta { padding: 12px 16px; background: var(--on-primary); color: var(--ink-deep); border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.2px; }

    .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; padding: 96px 24px; background: var(--surface-canvas-dark); text-align: center; }
    .hero-content { max-width: 1000px; z-index: 1; }
    .hero h1 { font-size: 88px; font-weight: 700; line-height: 1.2; margin-bottom: 24px; }
    .chip-lime-keyword { background: var(--accent-lime); color: var(--ink-deep); padding: 0 12px; border-radius: 4px; display: inline-block; }
    .hero p { font-size: 16px; line-height: 2.0; color: var(--on-primary); margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto; }
    
    .btn-primary { padding: 12px 16px; background: var(--on-primary); color: var(--ink-deep); border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.2px; }
    .btn-ghost { padding: 8px 16px; background: rgba(255,255,255,0.18); color: var(--on-primary); border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.2px; }
    .hero-buttons { display: flex; gap: 16px; justify-content: center; }

    section { padding: 96px 24px; max-width: 1200px; margin: 0 auto; }
    .section-header { text-align: center; margin-bottom: 48px; }
    .section-header h2 { font-size: 60px; font-weight: 500; line-height: 1.1; margin-bottom: 16px; }

    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .pricing-card { background: var(--surface-canvas-light); color: var(--ink-deep); padding: 32px; border-radius: 12px; border: 1px solid var(--hairline-cloud); }
    .pricing-card-featured { background: var(--surface-night); color: var(--on-primary); padding: 32px; border-radius: 12px; }
    
    .price { font-size: 60px; font-weight: 500; margin-bottom: 16px; }
    .pricing-features { list-style: none; margin-bottom: 32px; line-height: 1.5; font-size: 16px; }
    .pricing-features li { padding: 8px 0; border-bottom: 1px solid var(--hairline-cloud); }
    .pricing-card-featured .pricing-features li { border-bottom: 1px solid var(--hairline-violet); }
    
    .btn-pricing { width: 100%; padding: 12px 16px; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2px; text-align: center; display: block; text-decoration: none; border: none; }
    .btn-pricing-light { background: var(--primary); color: var(--on-primary); }
    .btn-pricing-dark { background: var(--on-primary); color: var(--ink-deep); }

    .footer { background: var(--surface-canvas-light); color: var(--ink-deep); padding: 32px 24px; font-size: 14px; text-align: center; }
    .footer-squiggle { border-top: 3px solid var(--accent-lime); width: 100%; display: block; margin-bottom: 32px; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 56px; }
      .section-header h2 { font-size: 40px; }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <a href="#" class="nav-brand">Dramoo</a>
    <ul class="nav-links">
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="/docs.html">Docs</a></li>
      <li><a href="/admin/">Admin</a></li>
    </ul>
    <a href="https://t.me/dramoobot" class="nav-cta">Get Started</a>
  </nav>

  <section class="hero">
    <div class="hero-content">
      <h1>API for Asian <br><span class="chip-lime-keyword">Short Dramas</span></h1>
      <p>The developer-first streaming API. 38+ platforms aggregated into one endpoint. Pure JSON, zero friction.</p>
      <div class="hero-buttons">
        <a href="#pricing" class="btn-primary">View Pricing</a>
        <a href="/docs.html" class="btn-ghost">Read Docs</a>
      </div>
    </div>
  </section>

  <section id="pricing" style="background: var(--surface-canvas-light); color: var(--ink-deep); max-width: 100%; padding: 96px 24px;">
    <div style="max-width: 1200px; margin: 0 auto;">
      <div class="section-header">
        <h2>Pricing</h2>
        <p style="font-size: 16px; font-weight: 500;">Transparent pricing for developers.</p>
      </div>
      <div class="pricing-grid">
        <div class="pricing-card">
          <h3 style="font-size: 24px; font-weight: 500; margin-bottom: 8px;">Starter</h3>
          <div class="price">Rp 40.000</div>
          <ul class="pricing-features">
            <li>12 Platforms Access</li>
            <li>100.000 Req / Month</li>
            <li>Community Support</li>
          </ul>
          <a href="https://t.me/dramoobot" class="btn-pricing btn-pricing-light">Buy Starter</a>
        </div>
        <div class="pricing-card-featured">
          <h3 style="font-size: 24px; font-weight: 500; margin-bottom: 8px;">Professional</h3>
          <div class="price">Rp 100.000</div>
          <ul class="pricing-features">
            <li>38+ Platforms Access</li>
            <li>Unlimited Requests</li>
            <li>Priority Support</li>
          </ul>
          <a href="https://t.me/dramoobot" class="btn-pricing btn-pricing-dark">Buy Pro</a>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="footer-squiggle"></div>
    <p>&copy; 2026 Dramoo API. Built for developers.</p>
  </footer>
</body>
</html>`;

fs.writeFileSync(indexPath, newIndexHtml, 'utf8');

console.log('Successfully rewrote HTML files');
