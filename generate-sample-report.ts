/**
 * Standalone script to generate a full FACE Career sample report HTML.
 *
 * Run with:  npx tsx generate-sample-report.ts
 *
 * Requires tsconfig.json with paths alias "@/*" -> "./src/*"
 */

import * as fs from 'fs';
import * as path from 'path';

// Import the report engine (uses @/ alias resolved by tsx + tsconfig)
import { computeAll, replaceTemplate } from '@/lib/reportEngine';

// ── Sample diagnosis data for 이준호, Creative(Cr) primary ──
const sampleData = {
  userName: '이준호',
  desiredJob: '마케팅·브랜드|브랜드전략',
  focus: [
    { first: 'Cr', last: 'Op' },
    { first: 'Cr', last: 'Ar' },
    { first: 'Em', last: 'Op' },
    { first: 'Cr', last: 'Op' },
    { first: 'Cr', last: 'Ar' },
    { first: 'Em', last: 'Op' },
    { first: 'Cr', last: 'Ar' },
    { first: 'Em', last: 'Cr' },
    { first: 'Cr', last: 'Op' },
    { first: 'Em', last: 'Ar' },
    { first: 'Cr', last: 'Op' },
    { first: 'Em', last: 'Ar' },
    { first: 'Cr', last: 'Ar' },
    { first: 'Cr', last: 'Op' },
    { first: 'Em', last: 'Op' },
    { first: 'Cr', last: 'Ar' },
    { first: 'Em', last: 'Op' },
    { first: 'Cr', last: 'Ar' },
  ],
  focusRefine: ['Cr', 'Em'],
  anchorLikert: [5, 7, 6, 3, 5, 4],
  anchorTradeoff: ['growth', 'autonomy', 'mastery'],
  anchorInterest: [
    { first: 'creative', last: 'org' },
    { first: 'tech', last: 'health' },
    { first: 'creative', last: 'green' },
    { first: 'business', last: 'org' },
    { first: 'tech', last: 'health' },
    { first: 'creative', last: 'green' },
  ],
  capacity: [
    { first: 'Ct1', last: 'Dr10' },
    { first: 'Ct3', last: 'Dr6' },
    { first: 'In7', last: 'Dr5' },
    { first: 'Ct2', last: 'In6' },
    { first: 'In2', last: 'Dr7' },
    { first: 'Ct4', last: 'Dr8' },
    { first: 'In1', last: 'Dr9' },
    { first: 'Ct5', last: 'Dr11' },
    { first: 'Cn1', last: 'Dr3' },
    { first: 'In3', last: 'Dr4' },
    { first: 'Ct1', last: 'Dr10' },
    { first: 'Ct3', last: 'Dr6' },
    { first: 'In7', last: 'Dr5' },
    { first: 'Ct2', last: 'In6' },
    { first: 'In2', last: 'Dr7' },
    { first: 'Ct4', last: 'Dr8' },
    { first: 'In1', last: 'Dr9' },
    { first: 'Ct5', last: 'Dr11' },
    { first: 'Cn1', last: 'Dr3' },
    { first: 'In3', last: 'Dr4' },
    { first: 'Cn4', last: 'In8' },
    { first: 'Cn2', last: 'Dr2' },
    { first: 'Cn3', last: 'In5' },
    { first: 'In4', last: 'Cn6' },
  ],
  energy: [6, 6, 7, 5, 6, 5, 6, 5, 5, 5, 2, 6, 6, 5, 5, 6],
};

// ── Main ──
(function main() {
  console.log('[1/4] Computing diagnosis results ...');
  const results = computeAll(sampleData);
  if (!results) {
    console.error('ERROR: computeAll returned null. Check sample data.');
    process.exit(1);
  }
  console.log('  Focus: primary =', results.focus.primary, ', secondary =', results.focus.secondary);
  console.log('  Subtype:', results.focus.subTypeCode);
  console.log('  Top anchors:', results.top2.map((a: any) => a.anchor).join(', '));
  console.log('  Energy stage:', results.energy.stage, '(', results.energy.energyLevel, ')');
  console.log('  Job fits (top 3):', results.jobFits.slice(0, 3).map((j: any) => `${j.job} ${j.pct}%`).join(', '));

  console.log('[2/4] Reading report template ...');
  const templatePath = path.resolve(__dirname, 'public', 'report-template.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  console.log('  Template length:', templateHtml.length, 'chars');

  console.log('[3/4] Generating full report HTML ...');
  const fullHtml = replaceTemplate(templateHtml, results);
  console.log('  Output length:', fullHtml.length, 'chars');

  console.log('[4/4] Saving output ...');
  const outDir = path.resolve('C:/da-sh/READ_Career_Benchmark');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'sample-report-original.html');
  fs.writeFileSync(outPath, fullHtml, 'utf-8');
  console.log('  Saved to:', outPath);
  console.log('DONE! Open the file in a browser to view the report.');
})();
