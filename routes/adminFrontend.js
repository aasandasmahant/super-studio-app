const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/meta', (req, res) => {
  res.json({
    ok: true,
    stage: 8,
    ui: {
      dashboard: '/admin',
      mobileResponsive: true,
      themes: ['dark', 'light'],
      modules: ['owner', 'payments', 'ads', 'chat', 'users']
    }
  });
});

router.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'public', 'admin.html');
  res.sendFile(filePath);
});

module.exports = router;
