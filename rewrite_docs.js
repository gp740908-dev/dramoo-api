const fs = require('fs');

const docsPath = './public/docs/index.html';
let docsHtml = fs.readFileSync(docsPath, 'utf8');

const newDocsCss = `
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
      --method-patch: #f59e0b;
      --method-delete: #fa7faa;
      
      --gradient-glow: none;
      --gradient-brand: linear-gradient(135deg, #1f1633, #362d59);
      
      --radius-xl: 16px;
      --radius-lg: 12px;
      --radius-md: 8px;
      --radius-sm: 4px;
      
      --shadow-glow: none;
      --sidebar-width: 280px;
      font-family: "Rubik", -apple-system, system-ui, sans-serif;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Rubik", sans-serif; }
    body { background-color: var(--bg-base); color: var(--text-main); font-size: 15px; line-height: 1.6; height: 100vh; display: flex; overflow: hidden; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #362d59; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #c2ef4e; }

    .sidebar { width: var(--sidebar-width); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: #1f1633; z-index: 50; transition: left 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .sidebar-header { padding: 32px 24px 24px; border-bottom: 1px solid var(--border-color); }
    .brand { display: flex; align-items: center; gap: 14px; text-decoration: none; color: var(--text-main); }
    .brand-logo { width: 40px; height: 40px; background: #c2ef4e; color: #150f23; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
    .brand-name { font-size: 1.3rem; font-weight: 700; letter-spacing: -0.5px; }

    .nav-sections { flex: 1; overflow-y: auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }
    .nav-group-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dark); font-weight: 700; margin-bottom: 12px; padding-left: 12px; }
    .nav-item { display: flex; flex-direction: column; padding: 12px 14px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; margin-bottom: 4px; position: relative; overflow: hidden; }
    .nav-item:hover { background: var(--bg-glass-hover); transform: translateX(4px); }
    .nav-item.active { background: #150f23; border-color: #362d59; }
    .nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #c2ef4e; }
    .nav-item-name { font-weight: 600; font-size: 0.9rem; color: var(--text-main); margin-bottom: 4px; }
    .nav-item-path { font-family: Monaco, monospace; font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }

    .method-badge { font-size: 0.65rem; font-weight: 800; padding: 3px 6px; border-radius: 4px; font-family: "Rubik", sans-serif; letter-spacing: 0.5px; text-transform: uppercase; }
    .method-GET { background: #c2ef4e; color: #1f1633; border: none; }
    .method-POST { background: #6a5fc1; color: #ffffff; border: none; }

    .main-content { flex: 1; display: flex; flex-direction: column; height: 100%; overflow-y: auto; position: relative; }

    .top-bar { height: 80px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: #1f1633; position: sticky; top: 0; z-index: 20; }
    .api-setup-wrapper { display: flex; align-items: center; gap: 16px; }
    .api-key-setup { display: flex; align-items: center; gap: 12px; background: #150f23; border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 8px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .api-key-setup:focus-within { border-color: #c2ef4e; }
    .api-key-setup input { background: transparent; border: none; color: var(--text-main); font-family: Monaco, monospace; font-size: 0.85rem; outline: none; width: 300px; }
    .api-key-setup input::placeholder { color: var(--text-dark); font-family: "Rubik", sans-serif; }

    .content-grid { display: grid; grid-template-columns: 1fr 500px; gap: 40px; padding: 50px 40px; max-width: 1600px; margin: 0 auto; width: 100%; align-items: start; }

    .doc-section { display: flex; flex-direction: column; gap: 32px; animation: fadeUp 0.5s ease forwards; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    
    .endpoint-header h1 { font-size: 40px; font-weight: 500; margin-bottom: 12px; line-height: 1.1; color: #ffffff; }
    .endpoint-header p { color: var(--text-muted); font-size: 16px; line-height: 1.7; font-weight: 500; }
    
    .endpoint-url-box { display: flex; align-items: center; gap: 16px; background: #1f1633; border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-lg); font-family: Monaco, monospace; font-size: 16px; }

    .auth-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 4px; font-size: 14px; font-weight: 600; background: #1f1633; border: 1px solid #362d59; color: #ffffff; width: fit-content; }

    .params-section { background: #1f1633; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; }
    .params-section h3 { font-size: 18px; margin-bottom: 20px; color: #ffffff; font-weight: 500; }
    
    .params-table { width: 100%; border-collapse: collapse; }
    .params-table th { text-align: left; padding: 0 0 12px 0; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2px; }
    .params-table td { padding: 16px 0; border-bottom: 1px solid #362d59; }
    .params-table tr:last-child td { border-bottom: none; padding-bottom: 0; }
    
    .param-name { font-family: Monaco, monospace; font-weight: 600; color: #ffffff; font-size: 14px; }
    .param-req { font-size: 12px; color: #150f23; margin-left: 6px; padding: 2px 6px; background: #c2ef4e; border-radius: 4px; font-weight: 600; }
    .param-desc { color: var(--text-muted); font-size: 14px; margin-top: 6px; line-height: 1.5; font-weight: 400; }
    .param-example { display: inline-block; margin-top: 8px; font-family: Monaco, monospace; font-size: 12px; color: #ffffff; background: #150f23; padding: 4px 8px; border-radius: 4px; }

    .platforms-support { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .platform-badge { padding: 4px 10px; background: #150f23; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; font-weight: 600; color: #ffffff; text-transform: uppercase; }

    .interactive-panel { background: #1f1633; border: 1px solid var(--border-color); border-radius: var(--radius-lg); position: sticky; top: 130px; overflow: hidden; display: flex; flex-direction: column; }
    .panel-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); background: #150f23; display: flex; justify-content: space-between; align-items: center; }
    .panel-header h3 { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px; text-transform: uppercase; letter-spacing: 0.2px; }
    .panel-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

    .input-group { display: flex; flex-direction: column; gap: 8px; }
    .input-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.2px; }
    .input-group input { background: #150f23; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; color: var(--text-main); font-family: Monaco, monospace; font-size: 14px; transition: all 0.2s; }
    .input-group input:focus { border-color: #c2ef4e; outline: none; }

    .btn-send { background: #ffffff; color: #150f23; border: none; border-radius: var(--radius-sm); padding: 16px; font-weight: 700; font-family: "Rubik", sans-serif; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; text-transform: uppercase; letter-spacing: 0.2px; }
    .btn-send:hover { background: #f0f0f0; }
    .btn-send:active { transform: translateY(0); }

    .response-area { border-top: 1px solid var(--border-color); background: #150f23; display: flex; flex-direction: column; }
    .res-header { padding: 12px 24px; border-bottom: 1px solid #362d59; display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--text-muted); background: #1f1633; }
    .status-code { font-weight: 700; font-family: Monaco, monospace; padding: 4px 8px; border-radius: 4px; background: #150f23; }
    .status-200 { color: #c2ef4e; }
    .status-4xx { color: #f59e0b; }
    .status-5xx { color: #fa7faa; }

    .res-body { padding: 24px; margin: 0; font-family: Monaco, monospace; font-size: 14px; color: #ffffff; overflow-x: auto; max-height: 500px; overflow-y: auto; line-height: 1.5; }

    .json-key { color: #fa7faa; font-weight: 600; }
    .json-string { color: #c2ef4e; }
    .json-number { color: #ffffff; }
    .json-boolean { color: #6a5fc1; }
    .json-null { color: var(--text-dark); font-style: italic; }

    .toast-container { position: fixed; bottom: 32px; right: 32px; z-index: 9999; display: flex; flex-direction: column; gap: 12px; }
    .toast { padding: 16px 24px; border-radius: var(--radius-md); font-size: 15px; font-weight: 600; background: #1f1633; border: 1px solid #c2ef4e; color: #fff; display: flex; align-items: center; gap: 12px; }

    .spinner { width: 20px; height: 20px; border: 2px solid rgba(0,0,0,0.1); border-top-color: #150f23; border-radius: 50%; animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
    .mobile-overlay.open { opacity: 1; pointer-events: all; }

    @media (max-width: 1200px) { .content-grid { grid-template-columns: 1fr; padding: 30px; } .interactive-panel { position: static; margin-top: 20px; } }
    @media (max-width: 768px) { .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; width: 300px; } .sidebar.open { left: 0; } .content-grid { padding: 20px 16px; } .top-bar { padding: 0 20px; } .api-key-setup input { width: 140px; } .hamburger { display: flex; } .brand-title { display: none; } .endpoint-header h1 { font-size: 32px; } }

    .hamburger { display: none; flex-direction: column; gap: 6px; cursor: pointer; padding: 5px; z-index: 100; }
    .hamburger span { display: block; width: 26px; height: 2px; background: #fff; border-radius: 2px; transition: 0.3s; }
`;

docsHtml = docsHtml.replace(/<style>[\s\S]*?<\/style>/, `<style>${newDocsCss}</style>`);
fs.writeFileSync(docsPath, docsHtml, 'utf8');

console.log('Successfully rewrote docs HTML CSS');
