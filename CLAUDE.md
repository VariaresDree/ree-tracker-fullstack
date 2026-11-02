# Project rules for Claude

## CRITICAL REPOSITORY RULE: FEATURES.md maintenance

You are responsible for maintaining the `FEATURES.md` file. Whenever you execute a task that
successfully adds a new feature, modifies the functionality of an existing feature, or removes a
deprecated feature, you MUST immediately update `FEATURES.md` to reflect the new state of the web app
before concluding your task or committing the code.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on this repo, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
