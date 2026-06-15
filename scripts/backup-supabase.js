#!/usr/bin/env node
/**
 * Supabase Backup Script
 * Export all tables → backups/YYYY-MM-DD/[project]/
 * Saves to B3-Second-Brain (syncs to Google Drive automatically)
 *
 * Usage:
 *   node scripts/backup-supabase.js
 *   npm run backup
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const PROJECTS = [
  {
    name: 'cit-service',
    url: 'https://hwvivibnkytkmbkvbatv.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dml2aWJua3l0a21ia3ZiYXR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIwOTE4NCwiZXhwIjoyMDk1Nzg1MTg0fQ.HhpgumSsUorlTnW1ipBUFMegYAFxtheDXxpGV3zCPrg',
  },
  {
    name: 'b3-team-avenger',
    url: 'https://uidkyvqjwigzidxpwort.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZGt5dnFqd2lnemlkeHB3b3J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5NTA1MywiZXhwIjoyMDg3ODcxMDUzfQ.g3ESkTPQx-ZXzS8u3cO9pf2mry3oCcvC9PGtyzVMpvA',
  },
];

const TODAY = new Date().toISOString().slice(0, 10);
const BACKUP_ROOT = path.join(__dirname, '..', 'backups', TODAY);

// Tables ที่ข้ามได้ — log/audit ข้อมูลเยอะแต่ไม่ critical
const SKIP_LARGE_LOGS = ['cit_audit_logs', 'agent_logs', 'api_usage_logs', 'kyc_audit_log', 'kyc_access_log'];

async function backupProject(project) {
  const supabase = createClient(project.url, project.serviceKey);
  const projectDir = path.join(BACKUP_ROOT, project.name);
  fs.mkdirSync(projectDir, { recursive: true });

  console.log(`\n📦 Backing up: ${project.name}`);

  // Use known tables per project
  let tableNames;
  {
    if (project.name === 'cit-service') {
      tableNames = [
        'cit_customers','cit_user_profiles','cit_staff','cit_computers',
        'cit_devices','cit_knowledge','cit_tickets','ticket_attachments',
        'cit_onsite_reports','cit_onsite_items','cit_ma_contracts',
        'cit_equipment_loans','cit_calendar_events','cit_diagnostics',
        'cit_customer_contacts','cit_switches','cit_network_map',
      ];
    } else {
      tableNames = [
        'profiles','services','app_settings','jobs','job_requests',
        'job_postings','job_proposals','job_messages','job_chats','job_chat_messages',
        'wallets','wallet_transactions','wallet_entries','withdrawals','payment_logs',
        'transactions','slip_verifications','slip_uploads',
        'notifications','messages','reviews',
        'categories','shops','products','orders','order_items',
        'certificates','user_certificates','user_licenses','user_documents',
        'provider_services','provider_kyc','provider_id','rider_vehicles',
        'agent_tasks','agent_messages','agent_contexts','agent_kpi',
        'agent_approvals','agent_knowledge','agent_cost_log',
        'janie_conversations','reflection_logs','b3_tasks',
        'customers','customer_updates','customer_interactions','support_tickets',
        'email_drafts','quotation_templates','quotation_drafts','vendor_db',
        'checklist_templates','onsite_checklists','checklist_items',
        'energy_rates','cli_queue','custom_agents','learning_queue',
        'pong_campaigns','pong_tickets','user_campaign_stats',
        'push_subscriptions','oauth_tokens','voice_commands','voice_results',
        'lottery_tickets','lucky_coupons','draw_results','reward_tickets',
        'service_categories','service_orders','user_monthly_stats',
        'phone_otp_verifications','profile_change_requests','job_unlocks',
        'express_jobs','job_Win_messages',
      ];
    }
  }

  const summary = { project: project.name, date: TODAY, tables: {}, skipped: [] };

  for (const table of tableNames) {
    if (SKIP_LARGE_LOGS.includes(table)) {
      // Backup only last 100 rows for log tables
      const { data, error } = await supabase.from(table).select('*').order('id', { ascending: false }).limit(100);
      if (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
        summary.skipped.push(table);
        continue;
      }
      const file = path.join(projectDir, `${table}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  ✅ ${table}: ${data.length} rows (last 100)`);
      summary.tables[table] = { rows: data.length, note: 'last 100 only' };
      continue;
    }

    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
      summary.skipped.push(table);
      continue;
    }
    const file = path.join(projectDir, `${table}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✅ ${table}: ${data.length} rows`);
    summary.tables[table] = { rows: data.length };
  }

  // Write summary
  const summaryFile = path.join(projectDir, '_backup-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

  const totalRows = Object.values(summary.tables).reduce((s, t) => s + t.rows, 0);
  const tableCount = Object.keys(summary.tables).length;
  console.log(`  📊 Done: ${tableCount} tables, ${totalRows} total rows`);

  return summary;
}

async function main() {
  console.log(`\n🔒 B3 Supabase Backup — ${TODAY}`);
  console.log(`📁 Output: backups/${TODAY}/`);
  console.log('─'.repeat(50));

  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  const results = [];
  for (const project of PROJECTS) {
    const summary = await backupProject(project);
    results.push(summary);
  }

  // Write global manifest
  const manifest = {
    backup_date: TODAY,
    created_at: new Date().toISOString(),
    projects: results.map(r => ({
      name: r.project,
      table_count: Object.keys(r.tables).length,
      total_rows: Object.values(r.tables).reduce((s, t) => s + t.rows, 0),
      skipped: r.skipped,
    })),
  };

  fs.writeFileSync(
    path.join(BACKUP_ROOT, '_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Backup complete!');
  console.log(`📁 Saved to: backups/${TODAY}/`);
  console.log('☁️  Google Drive sync จะอัปโหลดให้อัตโนมัติ');

  // Cleanup old backups (keep last 30 days)
  const backupsRoot = path.join(__dirname, '..', 'backups');
  if (fs.existsSync(backupsRoot)) {
    const dirs = fs.readdirSync(backupsRoot)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    if (dirs.length > 30) {
      const toDelete = dirs.slice(0, dirs.length - 30);
      toDelete.forEach(d => {
        fs.rmSync(path.join(backupsRoot, d), { recursive: true, force: true });
        console.log(`🗑️  Removed old backup: ${d}`);
      });
    }
  }
}

main().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
