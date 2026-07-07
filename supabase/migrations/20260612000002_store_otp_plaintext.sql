-- Alter email_otps to store otp as plaintext instead of hash
ALTER TABLE email_otps ADD COLUMN otp VARCHAR(6);
ALTER TABLE email_otps DROP COLUMN otp_hash;
