import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAdminLoginForm } from './adminValidation.ts';

test('validateAdminLoginForm rejects empty identifier and password', () => {
  const result = validateAdminLoginForm({ identifier: '', password: '' });
  assert.equal(result.isValid, false);
  assert.ok(result.errors.identifier);
  assert.ok(result.errors.password);
});

test('validateAdminLoginForm rejects malformed email address', () => {
  const result = validateAdminLoginForm({
    identifier: 'invalid-email@',
    password: 'securePassword123',
  });
  assert.equal(result.isValid, false);
  assert.match(result.errors.identifier ?? '', /valid administrator email/i);
  assert.equal(result.errors.password, undefined);
});

test('validateAdminLoginForm rejects short or invalid Administrator ID', () => {
  const result = validateAdminLoginForm({
    identifier: 'ab',
    password: 'securePassword123',
  });
  assert.equal(result.isValid, false);
  assert.match(result.errors.identifier ?? '', /3–32 characters/i);
});

test('validateAdminLoginForm rejects short password', () => {
  const result = validateAdminLoginForm({
    identifier: 'admin@zestora.in',
    password: '123',
  });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.identifier, undefined);
  assert.match(result.errors.password ?? '', /at least 6 characters/i);
});

test('validateAdminLoginForm accepts valid email or Administrator ID with valid password length', () => {
  const emailResult = validateAdminLoginForm({
    identifier: 'admin@zestora.in',
    password: 'ValidPassword123',
  });
  assert.equal(emailResult.isValid, true);
  assert.deepEqual(emailResult.errors, {});

  const idResult = validateAdminLoginForm({
    identifier: 'ZEST-ADMIN-01',
    password: 'ValidPassword123',
  });
  assert.equal(idResult.isValid, true);
  assert.deepEqual(idResult.errors, {});
});
