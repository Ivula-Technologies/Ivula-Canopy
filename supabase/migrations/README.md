# Database migrations

Run each one once, in order, in the Supabase SQL editor of the Canopy project.
A new database needs all of them; on the live database, run only the ones it does not have yet.

| File | What it does |
| --- | --- |
| 001_initial_schema.sql | Organizations, profiles, members, teams, events, attendance, announcements, row-level security |
| 002_custom_roles.sql | Roles each organization defines, with permission flags |
| 003_backfill_role_ids.sql | One-time: gives older profiles the matching role |
| 004_secure_engagement_view.sql | Makes the engagement view respect row-level security |
| 005_volunteer_hours_and_donors.sql | Volunteer hours and the donors and giving section |
| 006_tasks.sql | Tasks |
| 007_shifts.sql | Volunteer shifts and public sign-ups |
| 008_expenses.sql | Expenses |
| 009_event_budget.sql | Event budgets |
| 010_lock_roles_and_billing.sql | Stops users changing their own role or billing status |
| 011_org_timezone.sql | Each organization's time zone |
| 012_shift_reminder_sent.sql | Records sent shift reminders so nobody gets two |
| 013_volunteer_link.sql | One sign-up link per organization for every upcoming shift |

`supabase/dangerous/reset_all_data.sql` deletes everything and is only for a
throwaway test project. It is kept out of this folder so nobody runs it by
working through the list.
