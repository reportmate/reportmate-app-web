const response = await fetch('https://reportmate-api.azurewebsites.net/api/devices');
const data = await response.json();

console.log('=== AZURE FUNCTIONS DEVICES RESPONSE DEBUG ===');
console.log('Data type:', typeof data);
console.log('Is array:', Array.isArray(data));
console.log('Data:', data);

if (Array.isArray(data) && data.length > 0) {
  const device = data[0];
  console.log('\n=== FIRST DEVICE ANALYSIS ===');
  console.log('Device keys:', Object.keys(device));
  console.log('serialNumber (camelCase):', device.serialNumber);
  console.log('serial_number (snake_case):', device.serial_number);
  console.log('Device object:', device);
} else {
  console.log('No devices in array or not an array');
}
