const adb = require('adbkit');
const path = require('path');

const adbState = {
  client: adb.createClient({ bin: 'D:\\BT\\AndroidTOOL\\KT_ADB_Tool\\resources\\bin\\adb.exe' })
};

async function execShell(deviceId, command) {
  return new Promise((resolve, reject) => {
    adbState.client
      .shell(deviceId, command)
      .then((stream) => {
        let output = '';
        stream.on('data', (chunk) => {
          output += chunk.toString();
        });
        stream.on('end', () => resolve(output.trim()));
        stream.on('error', (err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

async function test() {
  try {
    console.log('Listing devices...');
    const devices = await adbState.client.listDevices();
    console.log('Devices:', devices);
    if (devices.length === 0) {
      console.log('No devices found!');
      return;
    }
    const deviceId = devices[0].id;
    console.log('Testing device:', deviceId);

    console.log('Getting device profile...');
    const rawProps = await execShell(deviceId, 'getprop');
    console.log('rawProps length:', rawProps.length);
    
    const getPropValue = (propName) => {
      const regex = new RegExp(`\\[${propName.replace(/\./g, '\\.')}\\]:\\s*\\[(.*?)\\]`);
      const match = rawProps.match(regex);
      return match ? match[1].trim() : '';
    };

    const brand = getPropValue('ro.product.brand') || 'Unknown';
    const manufacturer = getPropValue('ro.product.manufacturer') || 'Unknown';
    const model = getPropValue('ro.product.model') || 'Unknown';
    const device = getPropValue('ro.product.device') || 'Unknown';
    const release = getPropValue('ro.build.version.release') || 'Unknown';
    const sdk = parseInt(getPropValue('ro.build.version.sdk')) || 0;
    const miuiVersionName = getPropValue('ro.miui.ui.version.name') || undefined;
    const miuiVersionCode = getPropValue('ro.miui.ui.version.code') || undefined;
    const hyperOsVersionName = getPropValue('ro.mi.os.version.name') || undefined;
    const incremental = getPropValue('ro.build.version.incremental') || 'Unknown';

    const profile = {
      brand,
      manufacturer,
      model,
      device,
      release,
      sdk,
      miuiVersionName,
      miuiVersionCode,
      hyperOsVersionName,
      incremental
    };
    console.log('Device Profile:', profile);

    console.log('Getting packages...');
    const rawPackages = await execShell(deviceId, 'pm list packages -a');
    console.log('rawPackages length:', rawPackages.length);

    console.log('Reading global settings...');
    const rawSettings = await execShell(deviceId, 'settings list global');
    console.log('rawSettings length:', rawSettings.length);

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

test();
