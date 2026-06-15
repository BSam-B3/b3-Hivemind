-- Migration: Add Equipment Management Tables
-- Date: 2026-05-30
-- Purpose: Support equipment asset tracking + sales opportunity detection

-- =====================================================================
-- TABLE 1: customer_equipment
-- =====================================================================
CREATE TABLE IF NOT EXISTS customer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES cit_customers(id) ON DELETE CASCADE,

  -- Basic identification
  computer_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(100),  -- "Desktop", "Laptop", "Server", "Workstation"

  -- Hardware identifiers
  manufacturer VARCHAR(255),
  model VARCHAR(255),

  -- Operating system
  os_version VARCHAR(255),
  os_architecture VARCHAR(20),  -- "32-bit", "64-bit"
  os_install_date DATE,

  -- Processor
  cpu_name VARCHAR(255),
  cpu_cores INT,

  -- Memory
  ram_total_gb DECIMAL(10, 2),
  ram_slots_used INT,

  -- Storage configuration (JSONB array)
  storage_config JSONB,
  -- Example: [
  --   {
  --     "model": "Samsung SSD 860",
  --     "size_gb": 500,
  --     "status": "OK",
  --     "interface": "SATA"
  --   }
  -- ]

  -- Network
  network_info JSONB,
  -- Example: [
  --   {
  --     "adapter_name": "Intel Gigabit",
  --     "mac_address": "00:1A:2B:3C:4D:5E",
  --     "link_speed_mbps": 1000
  --   }
  -- ]

  -- Laptop-specific
  battery_info JSONB,
  -- Example: {
  --   "is_laptop": true,
  --   "design_capacity": 60000,
  --   "full_charge_capacity": 38000,
  --   "wear_percent": 36.7
  -- }

  -- Display
  monitor_info JSONB,

  -- Security
  antivirus_active VARCHAR(255),
  threat_history JSONB,

  -- Scan metadata
  last_scan_date TIMESTAMP,
  full_diagnostic_json JSONB,  -- Store complete scan JSON for reference

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by_staff_id UUID REFERENCES cit_staff(id),
  updated_by_staff_id UUID REFERENCES cit_staff(id),

  CONSTRAINT unique_computer_per_customer UNIQUE(customer_id, computer_name)
);

CREATE INDEX idx_customer_equipment_customer ON customer_equipment(customer_id);
CREATE INDEX idx_customer_equipment_device_type ON customer_equipment(device_type);
CREATE INDEX idx_customer_equipment_scan_date ON customer_equipment(last_scan_date DESC);


-- =====================================================================
-- TABLE 2: equipment_sales_opportunities
-- =====================================================================
CREATE TABLE IF NOT EXISTS equipment_sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,

  -- Opportunity classification
  opportunity_type VARCHAR(100) NOT NULL,
  -- Possible values:
  -- "SSD_REPLACEMENT" - Storage failing/degraded
  -- "RAM_UPGRADE" - Low memory
  -- "BATTERY_REPLACEMENT" - Laptop battery degraded
  -- "NETWORK_UPGRADE" - Link speed < gigabit
  -- "SECURITY_PACKAGE" - Malware detected
  -- "OS_REFRESH" - Old OS installation
  -- "MONITOR_UPGRADE" - Old/low-res monitor
  -- "PSU_UPGRADE" - Power supply near capacity

  severity VARCHAR(50) NOT NULL,
  -- "CRITICAL" - Act immediately (revenue: high priority)
  -- "HIGH" - Recommend soon (revenue: medium priority)
  -- "MEDIUM" - Optional (revenue: lower priority)
  -- "LOW" - Nice to have

  -- Details
  title VARCHAR(255),
  description TEXT,
  recommended_product VARCHAR(255),
  estimated_price DECIMAL(10, 2),

  -- AI analysis
  ai_reasoning TEXT,
  ai_confidence_percent INT,  -- 0-100

  -- Staff notes
  staff_notes TEXT,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'OPEN',
  -- "OPEN" - Detected, not yet proposed
  -- "PROPOSED" - Staff recommended to customer
  -- "QUOTED" - Customer received quote
  -- "SOLD" - Purchase completed
  -- "REJECTED" - Customer declined
  -- "CANCELLED" - No longer relevant

  -- Resolution
  resolved_date TIMESTAMP,
  resolved_by_staff_id UUID REFERENCES cit_staff(id),
  resolution_notes TEXT,

  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_scan_date TIMESTAMP REFERENCES customer_equipment(last_scan_date),

  CONSTRAINT opportunity_must_have_details
    CHECK (description IS NOT NULL OR ai_reasoning IS NOT NULL)
);

CREATE INDEX idx_equipment_sales_equipment ON equipment_sales_opportunities(equipment_id);
CREATE INDEX idx_equipment_sales_status ON equipment_sales_opportunities(status);
CREATE INDEX idx_equipment_sales_severity ON equipment_sales_opportunities(severity);
CREATE INDEX idx_equipment_sales_type ON equipment_sales_opportunities(opportunity_type);
CREATE INDEX idx_equipment_sales_created ON equipment_sales_opportunities(created_at DESC);


-- =====================================================================
-- TABLE 3: equipment_maintenance_logs
-- =====================================================================
CREATE TABLE IF NOT EXISTS equipment_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,

  -- Maintenance tracking
  maintenance_type VARCHAR(100) NOT NULL,
  -- Possible values:
  -- "HARDWARE_REPLACEMENT" - SSD, RAM, battery, etc.
  -- "HARDWARE_UPGRADE" - Memory increase, storage expansion
  -- "SOFTWARE_CLEANUP" - Malware removal, system cleanup
  -- "OS_REINSTALL" - Fresh Windows installation
  -- "OS_UPDATE" - Windows update/patch
  -- "NETWORK_REPAIR" - Cable, adapter, switch replacement
  -- "DIAGNOSTIC" - Equipment scanned/diagnosed
  -- "OTHER"

  description TEXT NOT NULL,

  -- Personnel
  performed_by_staff_id UUID NOT NULL REFERENCES cit_staff(id),
  performed_date TIMESTAMP NOT NULL,

  -- Cost tracking
  hardware_cost DECIMAL(10, 2),
  service_cost DECIMAL(10, 2),

  -- Related sales opportunity
  from_sales_opportunity_id UUID REFERENCES equipment_sales_opportunities(id),

  -- Notes
  notes TEXT,
  parts_used TEXT,  -- List of hardware parts used

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by_staff_id UUID REFERENCES cit_staff(id),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT maintenance_must_have_date
    CHECK (performed_date <= NOW())
);

CREATE INDEX idx_maintenance_equipment ON equipment_maintenance_logs(equipment_id);
CREATE INDEX idx_maintenance_type ON equipment_maintenance_logs(maintenance_type);
CREATE INDEX idx_maintenance_performed_date ON equipment_maintenance_logs(performed_date DESC);
CREATE INDEX idx_maintenance_staff ON equipment_maintenance_logs(performed_by_staff_id);


-- =====================================================================
-- VIEW: Equipment Status Summary (for dashboard)
-- =====================================================================
CREATE OR REPLACE VIEW equipment_status_summary AS
SELECT
  ce.id,
  ce.computer_name,
  ce.customer_id,
  ce.device_type,
  ce.manufacturer,
  ce.model,
  ce.last_scan_date,
  COUNT(DISTINCT CASE WHEN eso.severity = 'CRITICAL' THEN eso.id END) as critical_count,
  COUNT(DISTINCT CASE WHEN eso.severity = 'HIGH' THEN eso.id END) as high_count,
  COUNT(DISTINCT CASE WHEN eso.severity = 'MEDIUM' THEN eso.id END) as medium_count,
  COUNT(DISTINCT eso.id) as total_opportunities,
  COUNT(DISTINCT eml.id) as maintenance_count,
  COALESCE(SUM(CASE WHEN eso.status = 'SOLD' THEN eso.estimated_price ELSE 0 END), 0) as total_revenue_generated
FROM customer_equipment ce
LEFT JOIN equipment_sales_opportunities eso ON ce.id = eso.equipment_id
LEFT JOIN equipment_maintenance_logs eml ON ce.id = eml.equipment_id
GROUP BY ce.id, ce.computer_name, ce.customer_id, ce.device_type,
         ce.manufacturer, ce.model, ce.last_scan_date;


-- =====================================================================
-- Enable RLS (Row Level Security)
-- =====================================================================
ALTER TABLE customer_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can only see equipment from their assigned customers
CREATE POLICY equipment_customer_isolation ON customer_equipment
  FOR SELECT
  USING (
    customer_id IN (
      SELECT customer_id FROM cit_staff_customers
      WHERE staff_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM cit_staff WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY equipment_update_isolation ON customer_equipment
  FOR UPDATE
  USING (customer_id IN (SELECT customer_id FROM cit_staff_customers WHERE staff_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT customer_id FROM cit_staff_customers WHERE staff_id = auth.uid()));

-- Similar policies for sales opportunities and maintenance logs
CREATE POLICY opportunities_customer_isolation ON equipment_sales_opportunities
  FOR SELECT
  USING (
    equipment_id IN (
      SELECT id FROM customer_equipment
      WHERE customer_id IN (SELECT customer_id FROM cit_staff_customers WHERE staff_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM cit_staff WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY maintenance_customer_isolation ON equipment_maintenance_logs
  FOR SELECT
  USING (
    equipment_id IN (
      SELECT id FROM customer_equipment
      WHERE customer_id IN (SELECT customer_id FROM cit_staff_customers WHERE staff_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM cit_staff WHERE id = auth.uid() AND role = 'super_admin')
  );
