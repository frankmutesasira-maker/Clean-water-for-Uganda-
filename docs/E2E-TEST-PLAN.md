# V3 End-to-end test plan

Use a staging database and test credentials. Do not use real donor money or production secrets.

## 1. Donation creation

- Create a test donor.
- Submit a one-time donation.
- Confirm a unique donation reference is returned.
- Confirm the database status is `pending`.

## 2. Bank transfer

- Submit a bank transfer against the test donation.
- Confirm the submission is `pending`.
- Confirm it appears in the authenticated finance queue.
- Verify it once.
- Confirm the donation becomes `verified`.
- Confirm exactly one donation ledger entry exists.
- Confirm a donation event exists.
- Confirm a second verification attempt is rejected.

## 3. Remittance

Repeat the bank-transfer test using the remittance flow and confirm duplicate review is rejected.

## 4. Receipt

- Issue a receipt for a verified test donation.
- Confirm exactly one receipt exists.
- Repeat the request and confirm the existing receipt is returned.
- Confirm the receipt action is recorded in the audit log.

## 5. Project accounting

- Assign a verified test donation to a project.
- Confirm project `amountRaised` increases.
- Confirm pending/rejected donations do not increase it.
- Confirm progress is capped at 100%.

## 6. Public transparency

- Confirm public endpoints expose only published projects.
- Confirm public totals include only verified donations.
- Confirm no admin-only donor fields are exposed by public endpoints.

## 7. Authentication

- Request admin endpoints without a token: expect `401`.
- Request with an invalid token: expect `401`.
- Request with an expired token: expect `401`.
- Request with an unauthorized role: expect `401`/authorization failure.
- Request with a valid finance/admin token: expect success.

## 8. Payment provider

Before production, configure a sandbox provider and test successful, failed, cancelled, duplicate, invalid-signature, amount-mismatch, and currency-mismatch webhook cases.

## 9. Final gate

Do not accept real donations until all critical tests pass and production secrets, database, payment provider, email provider, bank instructions, remittance instructions, and authoritative organization/project figures have been reviewed.
