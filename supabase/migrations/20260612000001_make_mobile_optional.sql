-- Make mobile optional in users table
ALTER TABLE users ALTER COLUMN mobile DROP NOT NULL;
