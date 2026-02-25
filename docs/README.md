# Docs Index

This folder accumulated planning notes, review docs, and implementation summaries during alpha prep. Use this index to find the current references first.

## Current / Primary

- `SELF_HOSTING_GUIDE.md` - Canonical self-hosting guide (direct-connect, hybrid, full self-hosted)
- `SETUP_WORKFLOW.md` - Short step-by-step workflow for alpha setup (including direct-connect path)
- `ALPHA_RELEASE.md` - Build/release playbook (desktop + mobile)
- `ALPHA_SECURITY_AUDIT.md` - Current alpha security hardening summary
- `DEPLOYMENT_COMPARISON.md` - Hybrid vs full self-hosted tradeoffs
- `user-stories.md` - Product and UX requirements backlog

## Useful, But Planning/Design-Oriented

- `CLIENT_RUNTIME_CONFIG_DESIGN.md` - Runtime config/wizard design proposal
- `RUNTIME_CONFIG_TESTING.md` - Test scenarios for runtime config work
- `RUNTIME_CONFIG_SUMMARY.md` - Implementation summary for runtime config work
- `ALPHA_CLIENT_BUILD_GUIDE.md` - Detailed build guide (superseded in part by `ALPHA_RELEASE.md`)
- `ALPHA_READINESS_REVIEW.md` - Broad readiness review (historical snapshot)

## Removed Redundant Summaries

These were condensed status summaries and overlapped heavily with the docs above:
- `ALPHA_QUICK_REF.md`
- `ALPHA_PREP_SUMMARY.md`

## Maintenance Guidance

- Prefer updating the primary docs above instead of creating another summary file.
- If a doc is a point-in-time review, label it clearly as historical in the title.
- Keep `README.md` at repo root aligned with the current alpha workflow and direct-connect behavior.
- Keep self-host docs aligned with actual `docker/setup.sh` behavior and generated file names.
