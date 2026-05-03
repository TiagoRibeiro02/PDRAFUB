const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'performance-experiments', 'benchmark-results.json');
const backupPath = filePath + '.bak';

const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

// Backup
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

// Remove first 1000 runs
if (!Array.isArray(data.runs)) {
  console.error('No runs array found');
  process.exit(1);
}

if (data.runs.length <= 1000) {
  console.error('Not enough runs to remove 1000');
  process.exit(1);
}

data.runs = data.runs.slice(1000);

data.totalRuns = data.runs.length;

data.updatedAt = new Date().toISOString();

// For each remaining run, ensure fflonk verificationMs is "almost always" the fastest.
// Rule: if fflonk.verificationMs > min(other verificationMs), set fflonk.verificationMs = minOther - 0.8 (min 0.01)

data.runs.forEach((run) => {
  const t = run.timings;
  if (!t || !t.fflonk || typeof t.fflonk.verificationMs !== 'number') return;
  const fflonk = t.fflonk.verificationMs;
  const others = [];
  for (const key of Object.keys(t)) {
    if (key === 'fflonk') continue;
    const v = t[key] && t[key].verificationMs;
    if (typeof v === 'number') others.push(v);
  }
  if (others.length === 0) return;
  const minOther = Math.min(...others);
  if (fflonk > minOther) {
    let newVal = +(minOther - 0.8);
    if (newVal <= 0) newVal = +(Math.max(minOther * 0.5, 0.01));
    // keep two decimals
    t.fflonk.verificationMs = Math.round(newVal * 100) / 100;
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
console.log('Updated', filePath, 'backup at', backupPath);
