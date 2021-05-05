#!/usr/bin/env node
const fs = require('fs');
const tx = require('@thi.ng/transducers-binary');

const src = process.argv[2];
if (!src || !src.length) {
  process.stderr.write('missing input file');
  process.exit(1);
}

try {
  const raw = fs.readFileSync(src);
  const encoded = tx.base64Encode(raw);
  process.stdout.write(encoded);
} catch (e) {
  process.stderr.write(`error encoding: ${e.message}`);
  process.exit(1);
}
