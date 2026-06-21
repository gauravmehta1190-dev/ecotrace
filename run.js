/**
 * Node Test Execution Harness
 * Invokes unit test scripts and prints status.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Carbon Footprint Awareness Platform Test Runner...');

const testScript = join(__dirname, 'calculator.test.js');

const child = spawn('node', [testScript], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ All tests completed successfully!');
  } else {
    console.error(`❌ Test suite exited with error code ${code}`);
  }
  process.exit(code);
});
