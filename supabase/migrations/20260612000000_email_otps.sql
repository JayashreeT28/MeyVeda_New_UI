-- Create email_otps table
CREATE TABLE email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'email_validation',
  otp_hash VARCHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by email
CREATE INDEX idx_email_otps_email ON email_otps(email);

-- Enable RLS to prevent frontend from accessing the table
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- No policies are created, meaning nobody can read or write to this table via the Data API
-- The Service Role key (used in Edge Functions) bypasses RLS automatically.
