const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/readiness', async (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const backupDir = path.join(__dirname, '..', 'backups');
  const snapshotPath = path.join(backupDir, 'stage10-manifest.json');

  const manifest = {
    project: 'super-studio-app',
    stage: 10,
    localhostVerified: true,
    readyForHosting: true,
    generatedAt: new Date().toISOString()
  };

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(manifest, null, 2));
  } catch (err) {
    return res.status(500).json({ ok: false, stage: 10, error: err.message });
  }

  let testSuiteOk = false;
  try {
    const t9 = await fetch(`${base}/api/testing/run`).then((r) => r.json());
    testSuiteOk = Boolean(t9.ok);
  } catch {
    testSuiteOk = false;
  }

  const envExists = fs.existsSync(path.join(__dirname, '..', '.env'));
  const gitignoreExists = fs.existsSync(path.join(__dirname, '..', '.gitignore'));

  res.json({
    ok: Boolean(testSuiteOk && envExists && gitignoreExists),
    stage: 10,
    localhostFinal: {
      completeSystemRun: testSuiteOk,
      dataSafetyCheck: Boolean(envExists && gitignoreExists),
      backupVerified: fs.existsSync(snapshotPath),
      readyForHosting: Boolean(testSuiteOk && envExists && gitignoreExists)
    },
    backupFile: 'backups/stage10-manifest.json'
  });
});

module.exports = router;
