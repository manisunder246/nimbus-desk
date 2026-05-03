// Pretty-prints a results json summary. Usage: node helpers/printSummary.js results/latest.json
const fs = require('fs');
const path = process.argv[2] || 'results/latest.json';
if (!fs.existsSync(path)) { console.error(`No file at ${path}`); process.exit(1); }
const j = JSON.parse(fs.readFileSync(path, 'utf8'));
const { runId, target, apiBase, summary, results } = j;
console.log(`\nNimbusDesk Test Summary — ${runId}`);
console.log(`Target: ${target}    API: ${apiBase}`);
console.log(`Total ${summary.total}  Passed ${summary.passed}  Failed ${summary.failed}  Skipped ${summary.skipped}  Time ${summary.durationMs}ms`);
console.log();
for (const r of results) {
  const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⚪';
  console.log(`${icon} ${r.id || '   '}  ${r.name}  (${r.durationMs}ms)`);
  if (r.error) console.log('    ' + r.error.split('\n')[0]);
}
