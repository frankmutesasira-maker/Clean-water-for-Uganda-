# Clean Water for Uganda — V3 Admin

The finance dashboard is private and its API endpoints require an authenticated administrator session.

Required environment variable:

`ADMIN_SESSION_SECRET`

Admin roles currently permitted for financial operations: `superadmin`, `admin`, `finance`.

Production deployment must configure authentication before exposing `/admin`.
