import crypto from 'node:crypto';

export function makeReference(prefix = 'CWU') {
  return `${prefix}-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function makeReceiptNumber() {
  return `CWU-R-${new Date().getUTCFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

export function cleanString(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}
