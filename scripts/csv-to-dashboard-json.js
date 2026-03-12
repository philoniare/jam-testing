#!/usr/bin/env node
/**
 * Converts picofuzz CSV artifacts into the JSON format expected by
 * the jam-conformance-dashboard.
 *
 * Usage:
 *   node scripts/csv-to-dashboard-json.js <artifacts-dir> <output-dir> [jam-version]
 *
 * <artifacts-dir> should contain sub-directories named
 *   picofuzz-csv-{target}-{benchmark}/
 *     └── {benchmark}.csv
 *
 * <output-dir> will be populated as:
 *   {jam-version}/{target}/{benchmark}.json
 */

const fs = require('fs');
const path = require('path');

const CSV_COLUMNS = [
  'peer', 'timestamp', 'count', 'sum', 'mean', 'median',
  'min', 'max', 'range', 'standardDeviation', 'variance',
  'p1', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p99',
];

function parseRow(line) {
  const parts = line.split(',');
  if (parts.length < CSV_COLUMNS.length) return null;
  const row = {};
  CSV_COLUMNS.forEach((col, i) => { row[col] = parts[i]; });
  return row;
}

function csvRowToJson(row, targetName) {
  // Extract version from peer string like "@typeberry/jam@0.5.9"
  const versionMatch = row.peer.match(/@(\d+\.\d+\.\d+)$/);
  const appVersion = versionMatch ? versionMatch[1].split('.').map(Number) : [0, 1, 0];

  return {
    info: {
      name: targetName,
      app_version: { major: appVersion[0], minor: appVersion[1], patch: appVersion[2] },
      jam_version: { major: 0, minor: 5, patch: 0 },
    },
    stats: {
      steps: parseInt(row.count, 10),
      imported: parseInt(row.count, 10),
      import_max_step: 0,
      import_min: parseFloat(row.min),
      import_max: parseFloat(row.max),
      import_mean: parseFloat(row.mean),
      import_p50: parseFloat(row.p50),
      import_p75: parseFloat(row.p75),
      import_p90: parseFloat(row.p90),
      import_p99: parseFloat(row.p99),
      import_std_dev: parseFloat(row.standardDeviation),
    },
  };
}

function main() {
  const [,, artifactsDir, outputDir, jamVersion = '0.5.0'] = process.argv;

  if (!artifactsDir || !outputDir) {
    console.error('Usage: csv-to-dashboard-json.js <artifacts-dir> <output-dir> [jam-version]');
    process.exit(1);
  }

  if (!fs.existsSync(artifactsDir)) {
    console.error(`Artifacts directory not found: ${artifactsDir}`);
    process.exit(1);
  }

  const versionDir = path.join(outputDir, jamVersion);

  // Pattern: picofuzz-csv-{target}-{benchmark}
  const artifactPattern = /^picofuzz-csv-(.+)-(\w+)$/;
  const entries = fs.readdirSync(artifactsDir).filter(d =>
    fs.statSync(path.join(artifactsDir, d)).isDirectory() && artifactPattern.test(d)
  );

  if (entries.length === 0) {
    console.error('No picofuzz-csv-* artifact directories found');
    process.exit(1);
  }

  let converted = 0;
  for (const entry of entries) {
    const match = entry.match(artifactPattern);
    if (!match) continue;

    const [, target, benchmark] = match;
    // Find CSV file inside the artifact directory
    const csvFile = path.join(artifactsDir, entry, `${benchmark}.csv`);
    if (!fs.existsSync(csvFile)) {
      console.warn(`  Skipping ${entry}: no ${benchmark}.csv found`);
      continue;
    }

    const content = fs.readFileSync(csvFile, 'utf-8').trim();
    if (!content) {
      console.warn(`  Skipping ${entry}: empty CSV`);
      continue;
    }

    // Use the last row (most recent run if multiple rows)
    const lines = content.split('\n').filter(l => l.trim());
    const row = parseRow(lines[lines.length - 1]);
    if (!row) {
      console.warn(`  Skipping ${entry}: could not parse CSV row`);
      continue;
    }

    const teamDir = path.join(versionDir, target);
    fs.mkdirSync(teamDir, { recursive: true });

    const json = csvRowToJson(row, target);
    const outFile = path.join(teamDir, `${benchmark}.json`);
    fs.writeFileSync(outFile, JSON.stringify(json, null, 2));
    console.log(`  ${target}/${benchmark}.json ✓`);
    converted++;
  }

  console.log(`\nConverted ${converted} benchmark files to ${versionDir}`);
}

main();
