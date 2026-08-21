CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(320) NOT NULL,
  country VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donors_email_idx ON donors (LOWER(email));

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description TEXT,
  location VARCHAR(200),
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(30) NOT NULL DEFAULT 'fundraising',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_status_valid CHECK (status IN ('planning','fundraising','construction','completed','paused')),
  CONSTRAINT projects_amount_valid CHECK (target_amount >= 0)
);

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_reference VARCHAR(40) NOT NULL UNIQUE,
  donor_id UUID NOT NULL REFERENCES donors(id),
  project_id UUID REFERENCES projects(id),
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  frequency VARCHAR(20) NOT NULL DEFAULT 'one-time',
  designation VARCHAR(80) NOT NULL DEFAULT 'where-needed-most',
  payment_method VARCHAR(30) NOT NULL,
  payment_provider VARCHAR(50),
  provider_transaction_id VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  CONSTRAINT donations_amount_valid CHECK (amount > 0),
  CONSTRAINT donations_frequency_valid CHECK (frequency IN ('one-time','monthly')),
  CONSTRAINT donations_method_valid CHECK (payment_method IN ('online','bank-transfer','remittance')),
  CONSTRAINT donations_status_valid CHECK (status IN ('pending','verified','failed','refunded'))
);

CREATE INDEX IF NOT EXISTS donations_status_idx ON donations(status);
CREATE INDEX IF NOT EXISTS donations_created_idx ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS donations_project_idx ON donations(project_id);

CREATE TABLE IF NOT EXISTS donation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  event_id VARCHAR(200),
  event_type VARCHAR(80) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS donation_events_event_id_idx
  ON donation_events(event_id)
  WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bank_transfer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  transfer_reference VARCHAR(200) NOT NULL,
  transfer_date DATE,
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  proof_file_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bank_transfer_status_valid CHECK (status IN ('pending','verified','rejected'))
);

CREATE TABLE IF NOT EXISTS remittance_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL,
  transfer_reference VARCHAR(200) NOT NULL,
  transfer_date DATE,
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  proof_file_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT remittance_status_valid CHECK (status IN ('pending','verified','rejected'))
);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  receipt_number VARCHAR(60) NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id),
  entry_type VARCHAR(30) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'admin',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CONSTRAINT admin_role_valid CHECK (role IN ('admin','finance','editor','superadmin'))
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_identifier VARCHAR(320) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO projects (name, slug, description, location, target_amount, currency, status, published)
VALUES (
  'Community Borehole Project',
  'community-borehole-project',
  'Fundraising for reliable clean water access for an underserved Ugandan community.',
  'Uganda',
  5000,
  'USD',
  'fundraising',
  TRUE
)
ON CONFLICT (slug) DO NOTHING;
