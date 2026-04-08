# Contributing to Congruity

Thanks for contributing.

## Local setup

1. Clone the repo.
2. Run client locally:
   - `cd client`
   - `npm install`
   - `npm run dev`
3. Run signaling server locally:
   - `cd server`
   - `npm install`
   - `npm run dev`
4. Optional self-host stack:
   - `cd docker`
   - `./setup.sh`
   - `docker compose up -d`

## Branch and PR expectations

- Use feature branches (for example: `feature/<topic>` or `fix/<topic>`).
- Keep PRs focused and small when possible.
- Add/adjust tests for behavioral changes.
- Ensure lint and tests pass before opening a PR:
  - `cd client && npm run lint && npm run test:run`
  - `cd server && npm test`
  - `cd docker && ./tests/test_setup.sh`

## Code standards

- Do not commit secrets, tokens, or private keys.
- Prefer explicit input validation for API routes.
- Do not add wildcard CORS in production paths.
- Keep logs structured and avoid debug noise in committed code.

## Security reports

Please do not file public issues for security vulnerabilities. Send details privately to the maintainer first and include reproduction steps.
