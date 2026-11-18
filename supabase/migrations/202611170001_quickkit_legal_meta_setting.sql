-- QUICKKIT site settings: allow the `legal_meta` key.
--
-- The Admin → Site settings panel can now restate the "last updated" date shown
-- on the policy pages, stored as `legal_meta`. The original table definition
-- pinned `setting_key` to a fixed list of eight keys, so the new key would have
-- been rejected by the database even though the Admin API accepted it.
--
-- This migration widens that check by exactly one value. It is additive in the
-- only sense that matters: every row that was valid under the old constraint is
-- still valid under the new one, no row is read, changed or removed, and no
-- grant, policy or trigger is touched. Nothing is dropped except the constraint
-- itself, which is immediately recreated with the superset of allowed keys.
begin;

alter table public.quickkit_admin_site_settings
  drop constraint quickkit_admin_site_settings_setting_key_check;

alter table public.quickkit_admin_site_settings
  add constraint quickkit_admin_site_settings_setting_key_check
    check (setting_key in (
      'website_name', 'tagline', 'contact_email', 'social_links',
      'footer_links', 'announcement', 'maintenance', 'homepage_content',
      'legal_meta'
    ));

commit;
