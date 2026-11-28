const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

function checkAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key || (req.body && req.body.key);
  const expected = process.env.ADMIN_KEY || 'ChangeMe123';
  if (!key || key !== expected) {
    return res.status(401).json({ ok: false, error: 'Unauthorized: invalid admin key' });
  }
  next();
}

router.get('/status', checkAdmin, (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  res.json({
    ok: true,
    dbState: state,
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || null,
    uptimeSec: Math.floor(process.uptime())
  });
});

router.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Admin Panel</title>
<style>
  body{margin:0;font-family:system-ui,sans-serif;background:#0b1117;color:#e6edf3;padding:16px}
  .card{max-width:640px;margin:0 auto;background:#131c26;border:1px solid #263445;border-radius:10px;padding:16px}
  h1{margin:0 0 12px;font-size:20px}
  input,button{width:100%;box-sizing:border-box;padding:10px;margin-top:8px;border-radius:8px;border:1px solid #304154;background:#0b1117;color:#e6edf3;font-size:15px}
  button{background:#1f6feb;border:none;font-weight:600;cursor:pointer}
  pre{background:#090d12;padding:12px;border-radius:8px;overflow:auto;font-size:13px;border:1px solid #1e2a38}
</style>
</head>
<body>
  <div class="card">
    <h1>Admin Panel</h1>
    <input id="adminKey" type="password" placeholder="ADMIN_KEY डालें" />
    <button onclick="loadStatus()">Status जाँचें</button>
    <pre id="out">Key डालकर Status जाँचें।</pre>
  </div>
  <script>
    async function loadStatus(){
      const key = document.getElementById('adminKey').value.trim();
      const out = document.getElementById('out');
      out.textContent = 'Loading...';
      try{
        const r = await fetch('/admin/status', { headers: { 'x-admin-key': key } });
        const data = await r.json();
        out.textContent = JSON.stringify(data, null, 2);
      }catch(e){
        out.textContent = String(e);
      }
    }
  </script>
</body>
</html>`);
});

module.exports = router;
