#!/usr/bin/env node
// Script to convert Noir proof and public inputs to JSON format for benchmarking

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetDir = path.join(__dirname, 'target');

// Read bb prove outputs so proof/public inputs are from the same run.
const proofBinary = fs.readFileSync(path.join(targetDir, 'proof.bench', 'proof'));
const proofHex = '0x' + proofBinary.toString('hex');

// Read the binary public inputs (3 fields, 32 bytes each)
const publicInputsBinary = fs.readFileSync(path.join(targetDir, 'proof.bench', 'public_inputs'));

// Convert each 32-byte big-endian field to decimal string
const fields = [];
for (let i = 0; i < 3; i++) {
  const fieldBytes = publicInputsBinary.slice(i * 32, (i + 1) * 32);
  const fieldHex = fieldBytes.toString('hex') || '0';
  const fieldValue = BigInt(`0x${fieldHex}`);
  fields.push(fieldValue.toString());
}

console.log('Proof (hex):', proofHex.slice(0, 100) + '...');
console.log('Public inputs:', fields);

// Write proof.bench.json - array format simple for now
// Noir proofs are binary encoded, we'll need special handling in benchmark script
fs.writeFileSync(
  path.join(targetDir, 'proof.bench.json'),
  JSON.stringify({ proof: proofHex, format: 'honk' }, null, 2)
);

// Write public.bench.json
fs.writeFileSync(
  path.join(targetDir, 'public.bench.json'),
  JSON.stringify(fields, null, 2)
);

console.log('Generated proof.bench.json and public.bench.json');
