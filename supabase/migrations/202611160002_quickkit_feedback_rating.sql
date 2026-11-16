-- QUICKKIT homepage feedback: optional star rating, quick answers and the
-- tool the feedback is about.
-- Adds three columns to the existing private feedback table and relaxes one
-- rule so a visitor may send a rating without writing a message. No row is
-- changed or removed, and existing messages keep working exactly as before:
-- every message that was valid under the old rule is valid under the new one.
begin;

alter table public.quickkit_feedback_submissions
  add column rating smallint null
    check (rating is null or rating between 1 and 5),
  add column tags text[] not null default '{}'::text[]
    check (cardinality(tags) <= 4),
  -- The "About" choice: a catalogue slug such as merge-pdf, or null when the
  -- feedback is about QUICKKIT as a whole. The intake handler only accepts
  -- slugs that exist in the catalogue; this is the shape backstop.
  add column tool_slug text null
    check (
      tool_slug is null
      or (tool_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(tool_slug) <= 100)
    );

-- Before: the message had to be 1–180 characters.
-- After: still at most 180 characters, and it may be empty only when a
-- rating is present, so a submission can never be completely blank.
alter table public.quickkit_feedback_submissions
  drop constraint quickkit_feedback_submissions_message_check;
alter table public.quickkit_feedback_submissions
  add constraint quickkit_feedback_submissions_message_check
    check (
      char_length(message) <= 180
      and (char_length(message) >= 1 or rating is not null)
    );

-- Quick answers only make sense next to the rating they describe.
alter table public.quickkit_feedback_submissions
  add constraint quickkit_feedback_submissions_tags_need_rating_check
    check (rating is not null or cardinality(tags) = 0);

create index quickkit_feedback_rating_created_idx
  on public.quickkit_feedback_submissions (rating, created_at desc)
  where rating is not null;

-- The public intake handler may now also write the three visitor-supplied
-- columns. Browser roles still have no access (RLS deny policy and
-- revokes from the earlier migrations are unchanged), and the admin API
-- already holds table-level SELECT, which covers the new columns.
grant insert (rating, tags, tool_slug)
  on public.quickkit_feedback_submissions to service_role;

notify pgrst, 'reload schema';

commit;
