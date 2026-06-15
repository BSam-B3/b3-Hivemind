#!/usr/bin/env node
/**
 * complexity-router.js - B3 AI Complexity Classifier
 * วิเคราะห์ระดับความยากของคำสั่งเพื่อสลับใช้งานโมเดลราคาถูก / ฟรี / พรีเมียม อัตโนมัติ
 */

const LOCAL_KEYWORDS = [
  /แปล/i, /สรุป/i, /thai-explain/i, /อธิบาย.*ภาษาไทย/i, /format/i, /จัดระเบียบ/i,
  /check/i, /เช็ค/i, /status/i, /รายงาน/i, /standup/i, /ประเมิน/i, /review/i
];

const PREMIUM_KEYWORDS = [
  /migration/i, /sql/i, /database/i, /db/i, /rls/i, /policy/i, /rpc/i, /function/i,
  /security/i, /audit/i, /refactor/i, /โครงสร้าง/i, /architecture/i, /api/i, /route/i,
  /auth/i, /loop/i, /infinite/i
];

function classify(instruction) {
  const text = String(instruction || '').toLowerCase();

  // 1. FREE/LOCAL TIER
  const matchesLocal = LOCAL_KEYWORDS.some(pattern => pattern.test(text));
  if (matchesLocal) {
    return 'local';
  }

  // 2. PREMIUM TIER
  const matchesPremium = PREMIUM_KEYWORDS.some(pattern => pattern.test(text));
  if (matchesPremium) {
    return 'premium';
  }

  // 3. MID TIER (Default fallback)
  return 'mid';
}

// Simple test suite runner
if (require.main === module) {
  const testCases = [
    { text: 'ช่วยแปลเอกสารหน้าสรุปเช็คเอาท์', expected: 'local' },
    { text: 'สรุปการประชุม standup วันนี้', expected: 'local' },
    { text: 'เขียน migrations เพิ่ม RLS policy และ RPC backend', expected: 'premium' },
    { text: 'สร้าง component การ์ดของหน้า marketplace ด้วย tailwind', expected: 'mid' }
  ];

  console.log('🧪 Testing Complexity Classifier:');
  testCases.forEach(tc => {
    const result = classify(tc.text);
    const pass = result === tc.expected;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] "${tc.text}" -> Got: ${result} (Expected: ${tc.expected})`);
  });
}

module.exports = {
  classify
};
