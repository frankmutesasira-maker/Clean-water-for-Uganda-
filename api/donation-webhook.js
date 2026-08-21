import crypto from "crypto";
import { pool } from "./lib/db.js";

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function signatureFor(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: "Payment webhook is not configured." });

  // This endpoint expects the provider adapter to supply an HMAC-SHA256
  // signature over the exact raw request body. Provider-specific headers,
  // timestamp validation, and signing rules must be implemented when the
  // real payment provider is selected.
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const supplied = req.headers["x-webhook-signature"] || "";
  const expected = signatureFor(rawBody, secret);

  if (!safeEqual(supplied, expected)) {
    return res.status(401).json({ error: "Invalid webhook signature." });
  }

  let event;
  try {
    event = typeof req.body === "object" ? req.body : JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }

  const eventId = event.id || event.event_id;
  const donationReference = event.donation_reference || event.reference;
  const transactionId = event.transaction_id || event.provider_transaction_id;
  const status = event.status;
  const amount = Number(event.amount);
  const currency = String(event.currency || "").toUpperCase();

  if (!eventId || !donationReference || !status || !Number.isFinite(amount) || amount <= 0 || !currency) {
    return res.status(400).json({ error: "Incomplete webhook payload." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const duplicate = await client.query(
      "SELECT 1 FROM donation_events WHERE event_id = $1 LIMIT 1",
      [eventId]
    );

    if (duplicate.rowCount) {
      await client.query("COMMIT");
      return res.status(200).json({ success: true, duplicate: true });
    }

    const donationResult = await client.query(
      `SELECT id, amount, currency, status
       FROM donations
       WHERE donation_reference = $1
       FOR UPDATE`,
      [donationReference]
    );

    if (!donationResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Donation not found." });
    }

    const donation = donationResult.rows[0];

    if (Number(donation.amount) !== amount || donation.currency !== currency) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Webhook amount or currency does not match the donation." });
    }

    const normalizedStatus = String(status).toLowerCase();

    if (["paid", "succeeded", "successful", "completed", "verified"].includes(normalizedStatus)) {
      await client.query(
        `UPDATE donations
         SET status = 'verified',
             provider_transaction_id = $1,
             verified_at = COALESCE(verified_at, NOW()),
             updated_at = NOW()
         WHERE id = $2`,
        [transactionId || null, donation.id]
      );

      await client.query(
        `INSERT INTO financial_ledger
         (donation_id, entry_type, amount, currency, description)
         VALUES ($1, 'donation', $2, $3, $4)`,
        [donation.id, amount, currency, `Verified payment webhook ${eventId}`]
      );
    } else if (["failed", "cancelled", "canceled"].includes(normalizedStatus)) {
      await client.query(
        `UPDATE donations
         SET status = 'failed', failed_at = COALESCE(failed_at, NOW()), updated_at = NOW()
         WHERE id = $1 AND status <> 'verified'`,
        [donation.id]
      );
    }

    await client.query(
      `INSERT INTO donation_events
       (donation_id, event_id, event_type, payload)
       VALUES ($1, $2, $3, $4)`,
      [donation.id, eventId, `provider.${normalizedStatus}`, event]
    );

    await client.query("COMMIT");
    return res.status(200).json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Webhook processing failed." });
  } finally {
    client.release();
  }
}
