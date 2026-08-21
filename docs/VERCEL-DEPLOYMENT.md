# V3 Vercel deployment

## Preview/staging

Connect the V3 branch to Vercel as a preview environment and use a separate staging PostgreSQL database plus sandbox payment credentials.

## Production

Production should use separate encrypted environment variables for the production database, payment provider, webhook secret, email provider, and admin session secret.

## Launch sequence

1. Deploy the V3 branch as a preview.
2. Run the end-to-end test plan against staging.
3. Review deployment logs and function errors.
4. Verify public project and transparency endpoints.
5. Verify authenticated admin endpoints.
6. Configure production environment variables.
7. Run a final smoke test.
8. Promote only the validated deployment to production.

Never commit `.env` files or production credentials to GitHub.
