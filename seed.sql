INSERT INTO announcements (title, body, pinned_until) VALUES
  ('Pool opens May 17', 'Opening-day ice cream social starts at 2 p.m. Wristbands at the front gate.', NULL),
  ('Pine straw sale is on', 'Order by Friday; delivery is next weekend. Proceeds support the swim team.', date('now', '+14 days')),
  ('Clean-up day recap', 'Thanks to the 22 volunteers who came out — the entrance beds look great.', NULL);

INSERT INTO households (address, owner_name, email, phone) VALUES
  ('101 Planters Way', 'Alex Morgan', 'alex@example.com', ''),
  ('102 Planters Way', 'Sam Lee', 'sam@example.com', '770-555-0102'),
  ('103 Planters Way', 'Riley Chen', '', ''),
  ('104 Planters Way', 'Jordan Fox', 'jordan@example.com', ''),
  ('105 Planters Way', 'Casey Diaz', 'casey@example.com', '');

INSERT INTO payments (household_id, year, amount_cents, method, paid_on) VALUES
  (1, 2026, 53500, 'stripe', '2026-03-01'),
  (2, 2026, 53500, 'check', '2026-03-15');

INSERT INTO submissions (form_type, fields) VALUES
  ('issue_report', '{"location":"Pool area","message":"Gate latch sticks when it is hot out"}'),
  ('suggestion', '{"message":"More shade by the baby pool would be great"}');

INSERT INTO site_content (key, value) VALUES
  ('season_glance', '[["2026 annual dues","$535"],["Membership year","May 1, 2026 – Apr 30, 2027"],["Pool open","May 17 – Sep 20"],["Tennis courts","7 a.m. – 11 p.m. daily"],["Trash & recycling","Thursday mornings"],["Refer a new member","Earn $50"]]'),
  ('pool_hours', '[["Monday","11 a.m. – 8 p.m."],["Tuesday","11 a.m. – 8 p.m."],["Wednesday","11 a.m. – 8 p.m."],["Thursday","11 a.m. – 8 p.m."],["Friday","11 a.m. – 9 p.m."],["Saturday","10 a.m. – 9 p.m."],["Sunday","12 p.m. – 8 p.m."]]');

INSERT INTO settings (key, value) VALUES
  ('dues_cents', '53500');
