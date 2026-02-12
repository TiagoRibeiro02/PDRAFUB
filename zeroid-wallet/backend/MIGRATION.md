# Database Migration Guide

## Migrating from CHAP to SCRAM-SHA-256

If you have an existing database with CHAP authentication, you need to migrate to SCRAM-SHA-256.

### SQL Migration

```sql
USE zeroid_wallet;

-- Drop old CHAP column
ALTER TABLE users DROP COLUMN chap_secret;

-- Add SCRAM columns
ALTER TABLE users ADD COLUMN scram_salt VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN scram_iterations INT NOT NULL DEFAULT 4096;
ALTER TABLE users ADD COLUMN scram_stored_key VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN scram_server_key VARCHAR(64) NOT NULL DEFAULT '';
```

### Important Notes

1. **Existing users cannot login** after this migration until they reset their password or re-register
2. **New installations**: Simply run `db.sql` which includes the SCRAM fields
3. **SCRAM is more secure than CHAP**:
   - Provides mutual authentication (client verifies server identity)
   - Uses PBKDF2 with salt for key derivation
   - Resistant to replay attacks
   - Industry standard (used by MongoDB, LDAP, XMPP, etc.)

### Fresh Installation

For new installations, simply run:

```bash
mysql -u root -p < ../db.sql
```

This will create the table with the SCRAM columns included.
