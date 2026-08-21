# Production database readiness

## Environment

Set `DATABASE_URL` only in the deployment provider's encrypted environment configuration. Never commit it to GitHub.

## Provisioning

1. Create a production PostgreSQL database.
2. Restrict database access to the application runtime/network where possible.
3. Apply `database/schema.sql` using a controlled migration process.
4. Confirm required indexes and unique constraints exist.
5. Create the first administrator through a secure provisioning process.
6. Run a backup and restore test before accepting real donations.

## Integrity checks

Verify these invariants before launch:

- Donation references are unique.
- Receipt numbers are unique.
- Provider transaction IDs are unique when present.
- A donation ledger entry cannot be duplicated for the same donation and entry type.
- Only verified donations contribute to public project progress.
- Bank and remittance submissions cannot be verified twice.
- Admin audit records are created for privileged financial actions.

## Operational policy

Use separate development/staging/production databases. Do not copy production donor data into development unless it has been appropriately anonymized and authorized.

## Backups

Configure automated backups with a retention policy appropriate to the organization's legal and operational requirements. Periodically perform a restore drill and document the result.
