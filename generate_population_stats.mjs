/**
 * generate_population_stats.mjs
 * Run from project root: node generate_population_stats.mjs
 * Outputs: frontend/public/population_stats.json
 */

import fs from 'fs';
import path from 'path';

const csv = fs.readFileSync('cleaned_data_zimbabwe.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',');

const col = (name) => headers.indexOf(name);

const rows = lines.slice(1).map(line => {
  const vals = line.split(',');
  return {
    est_blood_loss_ml: parseFloat(vals[col('est_blood_loss_ml')]),
    duration_labour_min: parseFloat(vals[col('duration_labour_min')]),
    parity_num: parseFloat(vals[col('parity_num')]),
    hiv_status_num: parseFloat(vals[col('hiv_status_num')]),
    booked: vals[col('booked')]?.trim(),
    delivery_method_clean: vals[col('delivery_method_clean')]?.trim(),
  };
}).filter(r => !isNaN(r.est_blood_loss_ml));

function getSeverity(bloodLoss) {
  if (bloodLoss < 1000) return 'Mild';
  if (bloodLoss < 1500) return 'Moderate';
  return 'Severe';
}

rows.forEach(r => { r.severity_tier = getSeverity(r.est_blood_loss_ml); });

function computeStats(values) {
  const sorted = [...values].filter(v => !isNaN(v)).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { mean: 0, std: 0, p5: 0, p25: 0, p50: 0, p75: 0, p95: 0, min: 0, max: 0, n: 0 };
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const percentile = (p) => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return +(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)).toFixed(2);
  };
  return {
    mean: +mean.toFixed(2), std: +std.toFixed(2),
    p5: percentile(5), p25: percentile(25), p50: percentile(50),
    p75: percentile(75), p95: percentile(95),
    min: +sorted[0].toFixed(2), max: +sorted[n-1].toFixed(2), n
  };
}

const tiers = ['Mild', 'Moderate', 'Severe'];
const continuousFeatures = ['duration_labour_min', 'parity_num'];

const output = {
  generated_at: new Date().toISOString(),
  n_records: rows.length,
  severity_tiers: {},
  features: {},
  population_medians: {},
  categorical: { delivery_method: {}, booking_status: {}, hiv_status: {} }
};

// Severity tier counts
tiers.forEach(tier => {
  const subset = rows.filter(r => r.severity_tier === tier);
  output.severity_tiers[tier] = {
    n: subset.length,
    blood_loss_range: tier === 'Mild' ? '500–999 ml' : tier === 'Moderate' ? '1000–1499 ml' : '>=1500 ml'
  };
});

// Per-feature stats
continuousFeatures.forEach(feat => {
  output.features[feat] = {};
  output.features[feat].overall = computeStats(rows.map(r => r[feat]));
  tiers.forEach(tier => {
    const subset = rows.filter(r => r.severity_tier === tier);
    output.features[feat][tier] = computeStats(subset.map(r => r[feat]));
  });
  const sorted = rows.map(r => r[feat]).filter(v => !isNaN(v)).sort((a,b) => a-b);
  output.population_medians[feat] = +(sorted[Math.floor(sorted.length / 2)].toFixed(2));
});

// Categorical distributions
[['NVD','NVD'],['LSCS','LSCS'],['FORCEPS','Forceps']].forEach(([val, label]) => {
  const subset = rows.filter(r => r.delivery_method_clean === val);
  output.categorical.delivery_method[label] = {
    n: subset.length,
    severe_pph_n: subset.filter(r => r.severity_tier === 'Severe').length,
    severe_pph_pct: subset.length > 0 ? +(subset.filter(r => r.severity_tier === 'Severe').length / subset.length * 100).toFixed(1) : 0
  };
});

[['booked','Booked'],['unbooked','Unbooked']].forEach(([val, label]) => {
  const subset = rows.filter(r => r.booked === val);
  output.categorical.booking_status[label] = {
    n: subset.length,
    severe_pph_n: subset.filter(r => r.severity_tier === 'Severe').length,
    severe_pph_pct: subset.length > 0 ? +(subset.filter(r => r.severity_tier === 'Severe').length / subset.length * 100).toFixed(1) : 0
  };
});

[[0,'HIV Negative'],[1,'HIV Positive']].forEach(([val, label]) => {
  const subset = rows.filter(r => r.hiv_status_num === val);
  output.categorical.hiv_status[label] = {
    n: subset.length,
    severe_pph_n: subset.filter(r => r.severity_tier === 'Severe').length,
    severe_pph_pct: subset.length > 0 ? +(subset.filter(r => r.severity_tier === 'Severe').length / subset.length * 100).toFixed(1) : 0
  };
});

fs.writeFileSync('frontend/public/population_stats.json', JSON.stringify(output, null, 2));
console.log('Done. Written to frontend/public/population_stats.json');
console.log('Records:', output.n_records);
console.log('Severity:', JSON.stringify(output.severity_tiers));
console.log('Medians:', JSON.stringify(output.population_medians));
