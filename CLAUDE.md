## Decision log (docs/decisions.md)
While building, keep docs/decisions.md current. Append only; never rewrite old entries. Do it in the same task as the change, without being asked, and commit it with that change.

Log a decision when I or you:
- choose a library, data model, API shape, or architecture
- interpret a rule or fill a gap in the problem statement (matching rules, ranking formula, tie-breaking, timezones, assumptions)
- change the API contract or the schema
- make a security or error-handling choice
- cut scope or accept a known limitation
- adapt to a changed requirement (mark it CHANGE)
Do not log typo fixes, renames, or formatting.

Get the next id and time with: `grep -c "^## D-" docs/decisions.md` and `date "+%Y-%m-%d %H:%M"`. Do not read the whole file.

Entry format, 5 lines max, plain language:
## D-007 | 2026-11-13 14:20 | Short title
- Context: what problem or gap this answers
- Decision: what we chose
- Rejected: alternative (why not), alternative (why not)
- Why: the main reason
- Trade-off / revisit if: what we give up, and when to change it
- Files: paths touched

After each task, end your reply with one line: "Logged: D-007 <title>" (or "Logged: none").