# 📊 Equipment Asset Management + Sales Analytics Knowledge Base
**Status:** Work in Progress  
**Created:** 2026-05-30  
**Purpose:** Foundation knowledge for CIT IT Support + AI Agent training

---

## 🎯 Executive Summary

This is a **hybrid system** that combines:
- **Hardware Diagnostics** — Automated collection via PowerShell scripts
- **Smart Analysis** — AI-driven sales opportunity detection
- **CIT Integration** — Equipment inventory for customer IT assets
- **AI Training** — Creates knowledge base for jong-jaroen agents

**Core Value Proposition:**
```
Equipment Scanning → Data Collection → AI Analysis → Sales Opportunities
+ Equipment Tracking in CIT Database for IT support workflows
```

---

## 📋 Part 1: Hardware Diagnostic System Architecture

### 1.1 Data Collection Methods

**Method A: Local Execution (AssetCollector.exe)**
```
Pros:
✅ Bypasses network firewalls
✅ Admin access to WMI
✅ Works on Windows 7-11
✅ Executes locally, no remote dependency

Cons:
❌ Requires manual deployment
❌ Cannot scan remote computers directly
```

**Method B: Network-Based Scanning (Future)**
```
Pros:
✅ Centralized scanning
✅ Real-time monitoring
✅ Works across subnets

Cons:
❌ Requires server admin access
❌ May be blocked by firewalls
```

### 1.2 Hardware Data Collected

#### Core System Data
```json
{
  "ComputerName": "DESKTOP-01",
  "CurrentUser": "staff_user",
  "OS": {
    "Caption": "Windows 10 Pro",
    "Architecture": "64-bit",
    "InstallDate": "2021-03-15"
  },
  "Hardware": {
    "Manufacturer": "HP",
    "Model": "EliteDesk 800 G6",
    "Motherboard": "HP 87A6",
    "CPU": {
      "Name": "Intel Core i7-10700K",
      "Cores": 8
    }
  }
}
```

#### Storage Health (Critical for Sales)
```json
{
  "Storage": [
    {
      "Model": "Samsung SSD 860 Evo",
      "SizeGB": 500,
      "Status": "OK",           // or "Degraded", "Pred Fail"
      "Interface": "SATA",
      "SerialNumber": "S123456"
    }
  ]
}
```

**Sales Rule:** If Status = "Pred Fail" → 🔴 CRITICAL → Propose SSD replacement

#### Memory Analysis
```json
{
  "RAM": {
    "TotalGB": 8,
    "SlotsUsed": 2,
    "Details": [
      {
        "Slot": "DIMM 0",
        "CapacityGB": 8,
        "SpeedMHz": 2933,
        "Manufacturer": "Corsair"
      }
    ]
  }
}
```

**Sales Rule:** If TotalGB < 8GB → 🟡 UPGRADE → Propose 16GB RAM kit

#### Network Performance
```json
{
  "Network": [
    {
      "AdapterName": "Intel Gigabit Network Connection",
      "MACAddress": "00:1A:2B:3C:4D:5E",
      "LinkSpeedMbps": 100    // Expected: 1000 for Gigabit
    }
  ]
}
```

**Sales Rule:** If LinkSpeed ≤ 100 Mbps → 🟡 CHECK → Propose network cable/switch upgrade

#### Battery Health (Laptop Only)
```json
{
  "Battery": {
    "IsLaptop": true,
    "DesignCapacity": 60000,
    "FullChargeCapacity": 38000,
    "WearLevelPercent": 36.7    // Alert if > 35%
  }
}
```

**Sales Rule:** If WearLevel > 35% → 🔴 REPLACE → Propose new battery

#### Security Events
```json
{
  "Security": {
    "AntivirusActive": "Windows Defender, Kaspersky",
    "ThreatHistory": [
      {
        "ThreatName": "Trojan:Win32/Lolo",
        "Time": "2026-05-20 14:32"
      }
    ]
  },
  "LogsAnalysis": {
    "ApplicationCrash": ["Error: DLL missing", "Exception in module..."],
    "SystemErrors": ["Disk write failed", "Memory allocation error"]
  }
}
```

**Sales Rule:** If crashes contain ".dll missing" → 🔴 MALWARE RISK → Propose antivirus + cleanup service

---

## 🔌 Part 2: CIT Integration Points

### 2.1 How Equipment Data Flows into CIT

```
┌─────────────────────────────────────┐
│  IT Staff runs AssetCollector.exe   │
│  (On customer's computer)           │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  JSON file saved to Desktop or USB  │
│  (Diagnostic_DESKTOP-01.json)       │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Upload to CIT System               │
│  (New endpoint: /api/equipment/upload) │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  AI Analysis (Gemini/Claude)        │
│  - Extract key metrics              │
│  - Generate sales recommendations   │
│  - Create equipment profile         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  CIT Database Recording             │
│  - New equipment created, OR        │
│  - Existing equipment updated       │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  IT Staff Dashboard                 │
│  - Equipment inventory              │
│  - Sales opportunities flagged      │
│  - Maintenance alerts               │
└─────────────────────────────────────┘
```

### 2.2 New CIT Tables Needed

#### Table: `customer_equipment`
```sql
CREATE TABLE customer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES cit_customers(id),
  computer_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(100),  -- "Desktop", "Laptop", "Server"
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  os_version VARCHAR(255),
  cpu_name VARCHAR(255),
  cpu_cores INT,
  ram_total_gb DECIMAL,
  storage_config JSONB,  -- Array of storage devices
  network_info JSONB,    -- Network adapter details
  battery_info JSONB,    -- Laptop battery data (null for desktop)
  last_scan_date TIMESTAMP,
  scan_json JSONB,       -- Full diagnostic JSON
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `equipment_sales_opportunities`
```sql
CREATE TABLE equipment_sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES customer_equipment(id),
  opportunity_type VARCHAR(100),  -- "SSD_Replacement", "RAM_Upgrade", "Battery", "Network", "Malware_Cleanup"
  severity VARCHAR(50),  -- "CRITICAL", "WARNING", "INFO"
  description TEXT,
  recommended_product VARCHAR(255),
  estimated_price DECIMAL,
  ai_reasoning TEXT,
  staff_notes TEXT,
  status VARCHAR(50) DEFAULT 'OPEN',  -- "OPEN", "PROPOSED", "SOLD", "REJECTED"
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### Table: `equipment_maintenance_logs`
```sql
CREATE TABLE equipment_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES customer_equipment(id),
  maintenance_type VARCHAR(100),  -- "HDD_REPLACEMENT", "RAM_UPGRADE", "CLEANUP", "UPDATE"
  description TEXT,
  performed_by_staff_id UUID REFERENCES cit_staff(id),
  performed_date TIMESTAMP,
  cost DECIMAL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Part 3: File Upload + AI Analysis Pipeline

### 3.1 Upload Workflow

**UI/UX Flow:**

```
1. IT Staff in CIT Dashboard
   → Click: "Upload Equipment Diagnostic"
   → Select: Diagnostic_*.json file
   → System: Validates JSON schema
   
2. File Processing
   → Extract metadata (computer name, customer, model)
   → Run AI Analysis (Gemini)
   → Identify sales opportunities
   
3. Database Decision
   IF equipment_name exists in DB:
     → UPDATE existing record
     → Flag changed fields
   ELSE:
     → INSERT new equipment
     → Create initial profile
     
4. Sales Opportunity Detection
   → Parse hardware metrics
   → Apply sales rules (SSD failing, RAM low, battery worn, etc.)
   → Auto-create opportunity records
   
5. Staff Notification
   → Dashboard shows new equipment
   → Sales opportunities highlighted
   → AI recommendations visible
```

### 3.2 API Endpoint Design

**POST /api/equipment/upload**

```typescript
Request:
{
  "customer_id": "uuid",
  "diagnostic_file": <JSON file>,
  "staff_id": "uuid"
}

Response:
{
  "success": true,
  "equipment_id": "uuid",
  "action": "CREATED" | "UPDATED",
  "opportunities": [
    {
      "type": "SSD_Replacement",
      "severity": "CRITICAL",
      "recommendation": "Replace 500GB HDD with 1TB SSD"
    }
  ],
  "scan_summary": {
    "computer_name": "DESKTOP-01",
    "os": "Windows 10",
    "ram_gb": 8,
    "storage_status": "CRITICAL"
  }
}
```

### 3.3 AI Analysis System Prompt

```
You are an IT Equipment Analyst. Analyze the diagnostic JSON and:

1. Extract key hardware metrics
2. Identify hardware health issues (failing drives, degraded batteries, etc.)
3. Suggest sales opportunities (upgrades, replacements)
4. Estimate business value of recommendations
5. Generate actionable insights for IT staff

CRITICAL: Return ONLY valid JSON, no other text.

Output schema:
{
  "equipment_profile": {
    "computer_name": "...",
    "equipment_age_years": X,
    "overall_health": "GOOD|FAIR|CRITICAL"
  },
  "sales_opportunities": [
    {
      "category": "SSD_Replacement|RAM_Upgrade|Battery|Network|Security",
      "urgency": "CRITICAL|HIGH|MEDIUM|LOW",
      "recommendation": "...",
      "business_value": "Prevents data loss, improves performance"
    }
  ],
  "maintenance_insights": "..."
}
```

---

## 📊 Part 4: Sales Rules Engine

### 4.1 Automatic Sales Opportunity Rules

```javascript
// Storage Health
if (storage.status === "Pred Fail" || storage.status === "Degraded") {
  addOpportunity("SSD_Replacement", "CRITICAL", "Drive failure imminent");
}

// RAM Capacity
if (ram.totalGB < 8) {
  addOpportunity("RAM_Upgrade", "MEDIUM", "Insufficient RAM for modern workloads");
}

// Battery Wear
if (battery.wearPercent > 35) {
  addOpportunity("Battery_Replacement", "CRITICAL", "Battery degradation risk");
}

// Network Performance
if (network.linkSpeedMbps <= 100) {
  addOpportunity("Network_Upgrade", "MEDIUM", "Upgrade to Gigabit network");
}

// OS Age
if (osInstallDate.yearsOld > 5) {
  addOpportunity("OS_Refresh", "HIGH", "Consider OS reinstall or upgrade");
}

// Malware Indicators
if (securityLogs.containsMalware) {
  addOpportunity("Security_Package", "CRITICAL", "Active malware threats detected");
}
```

### 4.2 Sales Value Estimation

```
SSD Replacement:    $50-150 per device
RAM Upgrade:        $30-80 per device
Battery:            $50-120 per device
Network Upgrade:    $20-50 per device
Security Service:   $100-200 per device
Antivirus License:  $50-100/year per device
```

---

## 🛠️ Part 5: Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Supabase tables (equipment, opportunities, logs)
- [ ] Design upload API endpoint
- [ ] Create AI analysis system prompt
- [ ] Test with sample diagnostic files

### Phase 2: CIT Integration (Week 2)
- [ ] Add upload UI to CIT dashboard
- [ ] Implement file validation
- [ ] Connect to AI analysis service
- [ ] Auto-create equipment records

### Phase 3: Intelligence (Week 3)
- [ ] Implement sales rules engine
- [ ] Add staff dashboard (equipment list + opportunities)
- [ ] Create notification system
- [ ] Track conversion metrics

### Phase 4: Optimization (Week 4)
- [ ] Analyze which recommendations sell best
- [ ] Refine AI prompts based on outcomes
- [ ] Add predictive maintenance alerts
- [ ] Integrate with jong-jaroen for agent training

---

## 📚 Knowledge Base for AI Agents

### What Jong-Jaroen Agents Will Learn

1. **Equipment Health Assessment**
   - How to interpret diagnostic data
   - Which metrics matter most
   - When to escalate to human

2. **Sales Opportunity Recognition**
   - Pattern matching (old hardware = upgrade opportunity)
   - Business logic (failing drive = expensive data loss)
   - Timing (beta wear > 35% = replacement coming)

3. **Customer Communication**
   - How to explain technical issues to non-technical staff
   - How to frame upgrades as business value, not expenses
   - How to prioritize recommendations

4. **Cost-Benefit Analysis**
   - Estimating replacement costs
   - Calculating preventive maintenance ROI
   - Understanding customer budget constraints

---

## 🔍 Key Metrics for Success

```
Tracking:
- % of diagnosed equipment with opportunities
- Average opportunities per equipment
- Conversion rate (recommended → sold)
- Revenue per equipment scanned
- Customer satisfaction (on maintenance performed)

Targets:
- 60%+ equipment has at least 1 upgrade opportunity
- 3+ recommendations per equipment average
- 30%+ conversion on CRITICAL severity items
- $200+ average revenue per full diagnostic
```

---

**Next Steps:**
1. ✅ Review this knowledge base
2. ⏳ Approve integration approach
3. 🔨 Build Part 1 (equipment tracking tables)
4. 🚀 Build Part 2 (upload pipeline)
5. 📈 Build Part 3 (sales rules)

---

**Status:** Ready for B3 review & refinement
**Created By:** Claude
**For:** B3 IT Support Outsource System
