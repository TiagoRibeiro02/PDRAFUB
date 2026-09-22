#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.join(__dirname, 'target');

// Barretenberg outputs directly into target/
const proofPath = path.join(targetDir, 'proof');
const publicInputsPath = path.join(targetDir, 'public_inputs');

// Read proof
const proofBinary = fs.readFileSync(proofPath);
const proofHex = '0x' + proofBinary.toString('hex');

// Read public inputs
const publicInputsBinary = fs.readFileSync(publicInputsPath);

// Current circuit has 5 public inputs:
// DID, status, commitment, issuer, expiry
const NUM_PUBLIC_INPUTS = 5;
const FIELD_SIZE = 32;

const expectedSize = NUM_PUBLIC_INPUTS * FIELD_SIZE;

if (publicInputsBinary.length !== expectedSize) {
    throw new Error(
        `Unexpected public_inputs size: ` +
        `${publicInputsBinary.length} bytes. ` +
        `Expected ${expectedSize} bytes for ${NUM_PUBLIC_INPUTS} fields.`
    );
}

// Convert each 32-byte big-endian field to decimal string
const fields = [];

for (let i = 0; i < NUM_PUBLIC_INPUTS; i++) {
    const fieldBytes = publicInputsBinary.slice(
        i * FIELD_SIZE,
        (i + 1) * FIELD_SIZE
    );

    const fieldHex = fieldBytes.toString('hex');
    const fieldValue = BigInt(`0x${fieldHex}`);

    fields.push(fieldValue.toString());
}

console.log('Proof size:', proofBinary.length, 'bytes');
console.log('Proof (hex):', proofHex.slice(0, 100) + '...');
console.log('Public inputs:', fields);

// Save proof in JSON format
fs.writeFileSync(
    path.join(targetDir, 'proof.bench.json'),
    JSON.stringify(
        {
            proof: proofHex,
            format: 'ultrahonk'
        },
        null,
        2
    )
);

// Save public inputs
fs.writeFileSync(
    path.join(targetDir, 'public.bench.json'),
    JSON.stringify(fields, null, 2)
);

console.log('Generated:');
console.log('  target/proof.bench.json');
console.log('  target/public.bench.json');
