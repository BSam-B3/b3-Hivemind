#!/usr/bin/env node

const childProcess = require('child_process');

function run(command) {
  console.log(`\n> ${command}`);
  childProcess.execSync(command, { stdio: 'inherit' });
}

run('node scripts/b3-control-panel.js --open');
run('node scripts/encoding-doctor.js');
run('node scripts/drive-sync-doctor.js');
run('node scripts/secret-inventory.js');
console.log('\nเริ่มวันได้ ระบบเช็กเสร็จแล้ว');
