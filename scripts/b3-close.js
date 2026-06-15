#!/usr/bin/env node

const childProcess = require('child_process');

function run(command) {
  console.log(`\n> ${command}`);
  childProcess.execSync(command, { stdio: 'inherit' });
}

run('node scripts/team-daily-digest.js');
run('node scripts/session-scorecard.js');
run('node scripts/lesson-extractor.js');
run('node scripts/b3-control-panel.js');
run('node scripts/drive-sync-doctor.js');
run('node scripts/secret-inventory.js');
console.log('\nปิดวันได้ สรุปและบทเรียนถูกอัปเดตแล้ว');
