#!/usr/bin/env node
/**
 * Patches the dashboard page.tsx to add a "Download raw data" link in the footer.
 * Applied at build time because the dashboard is a git submodule.
 *
 * Usage:
 *   node scripts/patch-dashboard-download-link.cjs [path/to/page.tsx]
 */

const fs = require('fs');
const path = require('path');

const pagePath = process.argv[2]
  || path.join(__dirname, '..', 'dashboard', 'src', 'app', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error(`page.tsx not found: ${pagePath}`);
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf-8');

const marker = [
  '                View all clients',
  '              </a>',
  '            </p>',
].join('\n');

const replacement = [
  '                View all clients',
  '              </a>',
  "              {' '}|{' '}",
  '              <a',
  '                href={`${basePath}/data/history.json`}',
  '                download',
  '                className="text-cyan-400 hover:text-cyan-300 transition-colors"',
  '              >',
  '                Download raw data',
  '              </a>',
  '            </p>',
].join('\n');

if (!content.includes(marker)) {
  console.warn('Warning: Could not find insertion point in page.tsx — download link not added');
  process.exit(0);
}

content = content.replace(marker, replacement);
fs.writeFileSync(pagePath, content);
console.log('Patched page.tsx: added "Download raw data" link to footer');
