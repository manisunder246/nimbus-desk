// Custom Jest reporter — emits results/latest.json + results/latest.md and an
// archived JSON copy under results/archive/<iso>.json.
const fs   = require('fs');
const path = require('path');
require('./loadEnv'); // ensure API_BASE_URL is resolved in the parent process too

const TC_RE = /\b((?:TC|UNIT)-\d+):\s*(.+)$/;
const STATUS_MAP = { passed: 'passed', failed: 'failed', pending: 'skipped', skipped: 'skipped', todo: 'skipped' };

class NimbusReporter {
  onRunComplete(_contexts, results) {
    const target = process.env.TEST_TARGET || 'production';
    const apiBase = process.env.API_BASE_URL || '(unknown)';
    const runId   = new Date().toISOString();

    const flat = [];
    for (const f of results.testResults) {
      for (const t of f.testResults) {
        const name = t.fullName || t.title;
        const m = TC_RE.exec(name);
        flat.push({
          id:         m ? m[1] : null,
          name:       m ? m[2] : name,
          status:     STATUS_MAP[t.status] || t.status,
          durationMs: t.duration || 0,
          error:      (t.failureMessages && t.failureMessages.length)
                        ? stripAnsi(t.failureMessages.join('\n')).slice(0, 600)
                        : null,
        });
      }
    }
    flat.sort(byTcId);

    const summary = {
      total:      flat.length,
      passed:     flat.filter((r) => r.status === 'passed').length,
      failed:     flat.filter((r) => r.status === 'failed').length,
      skipped:    flat.filter((r) => r.status === 'skipped').length,
      durationMs: flat.reduce((s, r) => s + (r.durationMs || 0), 0),
    };

    const json = { runId, target, apiBase, summary, results: flat };
    const outDir  = path.join(__dirname, '..', 'results');
    const arcDir  = path.join(outDir, 'archive');
    fs.mkdirSync(arcDir, { recursive: true });

    const latestJson = path.join(outDir, 'latest.json');
    const latestMd   = path.join(outDir, 'latest.md');
    const archiveJson = path.join(arcDir, runId.replace(/[:.]/g, '-') + '.json');

    fs.writeFileSync(latestJson, JSON.stringify(json, null, 2));
    fs.writeFileSync(archiveJson, JSON.stringify(json, null, 2));
    fs.writeFileSync(latestMd, renderMarkdown(json));

    console.log(`\n[reporter] wrote ${path.relative(process.cwd(), latestJson)}`);
    console.log(`[reporter] wrote ${path.relative(process.cwd(), latestMd)}`);
    console.log(`[reporter] archived to ${path.relative(process.cwd(), archiveJson)}`);
  }
}

function stripAnsi(s) {
  return s.replace(/\[[0-?]*[ -/]*[@-~]/g, '');
}

function byTcId(a, b) {
  // TC- before UNIT-, then numeric within prefix, then everything else.
  const rank = (id) => {
    if (!id) return [9, 999];
    const [, prefix, numStr] = /^(TC|UNIT)-(\d+)$/.exec(id) || [];
    return [prefix === 'TC' ? 0 : prefix === 'UNIT' ? 1 : 9, parseInt(numStr || '999', 10)];
  };
  const [pa, na] = rank(a.id);
  const [pb, nb] = rank(b.id);
  return pa !== pb ? pa - pb : na - nb;
}

function renderMarkdown({ runId, target, apiBase, summary, results }) {
  const lines = [];
  lines.push(`# NimbusDesk Test Run — ${runId}`);
  lines.push('');
  lines.push(`**Target:** \`${target}\` · **API:** \`${apiBase}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Total | Passed | Failed | Skipped | Duration (ms) |');
  lines.push('|------:|-------:|-------:|--------:|--------------:|');
  lines.push(`| ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.skipped} | ${summary.durationMs} |`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| ID | Name | Status | Duration (ms) | Error |');
  lines.push('|----|------|--------|--------------:|-------|');
  for (const r of results) {
    const icon = r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : '⚪';
    const err  = r.error ? '`' + r.error.split('\n')[0].replace(/\|/g, '\\|').slice(0, 200) + '`' : '';
    lines.push(`| ${r.id || ''} | ${r.name} | ${icon} ${r.status} | ${r.durationMs || 0} | ${err} |`);
  }
  lines.push('');
  lines.push(`_Run against ${apiBase}_`);
  lines.push('');
  return lines.join('\n');
}

module.exports = NimbusReporter;
