SELECT current_database() AS database_name,
       current_user AS database_user,
       current_timestamp AS checked_at;

SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'donors','donations','projects','donation_events',
    'bank_transfer_submissions','remittance_submissions',
    'receipts','financial_ledger','admin_users','admin_audit_logs'
  )
ORDER BY table_name;

SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('donations','receipts','financial_ledger')
ORDER BY tablename,indexname;
