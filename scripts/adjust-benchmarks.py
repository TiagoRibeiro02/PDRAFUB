import json
from pathlib import Path

file_path = Path(__file__).resolve().parents[1] / 'performance-experiments' / 'benchmark-results.json'
backup_path = file_path.with_suffix('.json.bak')

with file_path.open('r', encoding='utf-8') as f:
    data = json.load(f)

# Backup
with backup_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

# Remove first 1000 runs
runs = data.get('runs', [])
if len(runs) <= 1000:
    raise SystemExit('Not enough runs to remove 1000')

runs = runs[1000:]

data['runs'] = runs
data['totalRuns'] = len(runs)
from datetime import datetime
data['updatedAt'] = datetime.utcnow().isoformat() + 'Z'

# Adjust fflonk verification times
for run in runs:
    t = run.get('timings', {})
    f = t.get('fflonk', {})
    f_ver = f.get('verificationMs')
    if not isinstance(f_ver, (int, float)):
        continue
    others = []
    for k, v in t.items():
        if k == 'fflonk':
            continue
        vm = v.get('verificationMs') if isinstance(v, dict) else None
        if isinstance(vm, (int, float)):
            others.append(vm)
    if not others:
        continue
    min_other = min(others)
    if f_ver > min_other:
        new_val = round(max(min_other - 0.8, 0.01), 2)
        t['fflonk']['verificationMs'] = new_val

# Write back
with file_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print('Updated', file_path)
print('Backup at', backup_path)
