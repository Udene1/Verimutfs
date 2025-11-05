import crypto from 'crypto';

const name = 'bootstrap-node';
const owner = 'bootstrap-node';
const nonce = 2957;

const input = `${name}:${owner}:${nonce}`;
const hash = crypto.createHash('sha256').update(input).digest('hex');

console.log('Input:', input);
console.log('Hash:', hash);
console.log('Valid (3 zeros)?', hash.startsWith('000'));
console.log('First 10 chars:', hash.substring(0, 10));
