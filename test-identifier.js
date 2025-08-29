// Test device identifier type
const { identifyDeviceIdentifierType } = require('./src/lib/deviceResolver.ts');

const testDeviceId = '0F33V9G25083HJ';
const identifierType = identifyDeviceIdentifierType(testDeviceId);

console.log('Testing device identifier type:');
console.log('Device ID:', testDeviceId);
console.log('Identified as:', identifierType);

// Test the pattern matching
const assetTagPattern = /^[A-Z][0-9A-Z]*[0-9][0-9A-Z]*$/i;
console.log('Matches asset tag pattern:', assetTagPattern.test(testDeviceId));

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log('Matches UUID pattern:', uuidPattern.test(testDeviceId));

const deviceNamePattern = /^[A-Za-z][A-Za-z0-9\s\-_.]*$/;
console.log('Matches device name pattern:', deviceNamePattern.test(testDeviceId));
console.log('Additional device name check:', !testDeviceId.match(/^[0-9A-F]{10,}$/i));
