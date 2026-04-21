/**
 * generate_sample_excel.mjs
 * Run from project root: node generate_sample_excel.mjs
 * Outputs: frontend/public/sample_batch_template.xlsx
 *
 * Generates a sample Excel file for batch upload with the 5 model-ready
 * column names and one example row of plausible clinical data.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { utils, write } from '/home/bolt/mediflow/frontend/node_modules/xlsx/xlsx.mjs';

const headers = [
  'duration_labour_min',
  'hiv_status_num',
  'parity_num',
  'booked_unbooked',
  'delivery_method_clean_LSCS',
];

const exampleRow = [
  360,    // duration_labour_min: 6 hours
  0,      // hiv_status_num: 0 = HIV Negative
  1,      // parity_num: 1 previous delivery
  0,      // booked_unbooked: 0 = Booked
  0,      // delivery_method_clean_LSCS: 0 = Not LSCS (NVD)
];

const notes = [
  '>=1 minutes',
  '0=Negative, 1=Positive',
  '0-8',
  '0=Booked, 1=Unbooked',
  '0=NVD/Forceps, 1=LSCS',
];

const ws = utils.aoa_to_sheet([headers, exampleRow, notes]);

// Set column widths for readability
ws['!cols'] = headers.map(() => ({ wch: 30 }));

const wb = utils.book_new();
utils.book_append_sheet(wb, ws, 'Batch Upload Template');

const buf = write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync('/home/bolt/mediflow/frontend/public/sample_batch_template.xlsx', buf);
console.log('Done. Written to frontend/public/sample_batch_template.xlsx');
