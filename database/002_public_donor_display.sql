-- Public donor wall controls. Existing donations remain public by default;
-- donors can opt out through the donation form.
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS public_display BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS donations_public_display_idx
  ON donations(status, public_display, created_at DESC);

-- Correct the confirmed Clean Water for Uganda campaign target.
UPDATE projects
SET name = '100-Metre Community Borehole',
    slug = '100-metre-borehole',
    description = 'Fundraising for a 100-metre borehole with a hand pump, including drilling, casing, borehole development, water testing and installation.',
    location = 'Uganda — location to be confirmed',
    target_amount = 7000,
    currency = 'USD',
    status = 'fundraising',
    published = TRUE,
    updated_at = NOW()
WHERE slug = 'community-borehole-project';

INSERT INTO projects (name, slug, description, location, target_amount, currency, status, published)
SELECT '100-Metre Community Borehole', '100-metre-borehole',
       'Fundraising for a 100-metre borehole with a hand pump, including drilling, casing, borehole development, water testing and installation.',
       'Uganda — location to be confirmed', 7000, 'USD', 'fundraising', TRUE
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE slug = '100-metre-borehole');
