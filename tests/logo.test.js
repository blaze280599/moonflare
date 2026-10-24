import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOGO_PATH } from '../lib/logo.js';

test('saved logo files match LOGO_PATH (rebuild them with npm run brand)', () => {
  for (const file of ['brand/poca-mark.svg', 'brand/poca-mark-white.svg', 'brand/poca-icon.svg', 'app/icon.svg']) {
    assert.ok(fs.readFileSync(file, 'utf8').includes(`d="${LOGO_PATH}"`), file);
  }
});
