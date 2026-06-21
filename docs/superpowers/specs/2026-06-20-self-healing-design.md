# Design Spec — Self-Healing Audit Remediation via Hermes

**Date:** 2026-06-20
**Owner:** Alfredo Flores Garcia
**Repo:** `codedrifter-mx/landing`
**Status:** Approved (all sections) — ready for implementation planning

## Purpose

A hermes cron job that runs 30 minutes after the weekly GHA security audit, reads open audit issues from GitHub, autonomously diagnoses and attempts to fix the findings, verifies the fix, and either closes the issue + alerts Telegram, or reverts + alerts Telegram. Designed for a project that may go unattended for weeks.

## Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Autonomy level | Moderate | Safe fixes only: Caddy reloads, CF API, npm audit fix + deploy. No kernel updates, no reboot. |
| On fix failure | Revert + alert | Undo the change, restore prior state, send Telegram. Never leave the site broken. |
| Intelligence | Agent-driven (LLM) | Hermes reads the finding, decides the fix, executes via shell tools. Handles unexpected combinations. |
| Architecture | Approach A — Hermes cron after GHA | GHA audits detect (independent, runs on GitHub infra), hermes heals (local, can touch RPi4 services). |
| Schedule | Saturday 11:00 AM Mexico City (`0 17 * * 6` UTC) | 30 min after security-audit completes, giving GHA time to open issues. |

## Architecture

```
Saturday 10:00 AM — GHA dependency-audit → opens GitHub issue if findings
Saturday 10:30 AM — GHA security-audit → opens GitHub issue if findings
Saturday 11:00 AM — Hermes self-heal cron:
  1. Query GitHub for open issues labeled "audit,security"
  2. If none: stop silently (no "all clear" spam)
  3. For each issue:
     a. Read issue body (the findings)
     b. Diagnose root cause (shell tools: curl, systemctl, cat, etc.)
     c. Snapshot current state (backup Caddyfile, git stash)
     d. Attempt fix (within Moderate autonomy boundary)
     e. Verify fix (curl site, check headers, re-run check)
     f. If verified: close GitHub issue + Telegram "✅ self-healed"
     g. If failed: revert from snapshot + Telegram "🚨 fix failed, reverted"
  4. Send summary Telegram message with per-finding results
```

### Why GHA + Hermes, not Hermes alone

The GHA audits run on GitHub's infrastructure — they fire even if the RPi4 is partially down (Caddy crashed, tunnel dropped). Hermes runs locally where it can actually fix things. If the RPi4 is completely down, neither runs, but that's the same blind spot either way. Keeping detection on GHA preserves independence.

### Blind spot

If the RPi4 is completely down, hermes can't run. The GHA audits also can't run (self-hosted runner offline). GitHub emails the repo owner if scheduled workflows stop running for 60 days. Active uptime monitoring from a separate host is out of scope.

## §1 · Moderate Autonomy Boundary

**Hermes CAN:**
- Reload or restart Caddy, cloudflared, the GitHub Actions runner service
- Fix Cloudflare zone drift via API (curl to CF API with token)
- Run `npm audit fix` + rebuild + deploy (only if type check and build both pass)
- Fix Caddy config (security headers, redirects) + reload
- Run `pacman -Syu` to apply package updates IF no kernel update is in the list
- Start stopped services (caddy, cloudflared)
- Rebuild and redeploy the site from the repo

**Hermes CANNOT (hard boundaries):**
- Run `pacman -Syu` if a kernel update (`linux-aarch64`, `linux-*`) is in the update list — report instead
- Reboot the RPi4
- Delete or recreate `/var/www/alfredoflores.dev/`
- Modify GitHub secrets
- Disable nftables, SSH config, or fail2ban
- Edit systemd service files for caddy, cloudflared, or sshd
- Install new packages with pacman (only update existing ones)
- Push to main if the build fails
- Skip the verify step after any change
- Skip the revert step if verification fails

## §2 · Hermes Cron Job Configuration

**Mechanism**: Hermes built-in cron system (`hermes cron add`). Jobs stored in `~/.hermes/cron/jobs.json`.

**Job configuration**:
- **Name**: `self-heal-audits`
- **Schedule**: `0 17 * * 6` (Saturday 17:00 UTC = 11:00 AM Mexico City, UTC-6)
- **Deliver**: `telegram` (sends results to Telegram DM, chat ID 6148305767)
- **Agent mode**: `true` (LLM-driven, not a plain script)
- **Model**: `null` (uses hermes default — now `minimax-m3`)
- **Toolset**: `hermes-cli` (shell access — can run bash commands on the RPi4)
- **Prompt**: the detailed runbook (see §3)
- **Workdir**: `/home/codedrifter/projects/landing` (the repo, for git/npm operations)

**Why a prompt, not a script**: the agent-driven decision means hermes gets a natural-language runbook with the Moderate autonomy boundary, finding categories, and the revert+alert protocol. The LLM reads the GitHub issue, decides which fix applies, and executes via shell tools. This handles unexpected combinations (e.g., headers regressed AND site down — the agent diagnoses whether they're related).

## §3 · Self-Heal Runbook Prompt

The prompt hermes receives every Saturday at 11:00 AM. It is the entire decision tree — the agent has no other context about this system.

```
You are the self-healing agent for alfredoflores.dev, a static portfolio site
running on this Raspberry Pi 4. Your job is to resolve open audit issues found
by the weekly GitHub Actions security and dependency audits.

## Step 1: Check for open audit issues

Run this command to find open audit issues:
  gh issue list --repo codedrifter-mx/landing --label "audit,security" --state open

If there are no open issues, stop. Do nothing. Do not send a Telegram message.

If there are open issues, for each issue:
  1. Read the issue body to understand the findings
  2. Follow the appropriate fix runbook below
  3. Verify the fix worked
  4. Close the issue or report failure

## Fix Runbooks

### Finding: Security headers regressed (missing HSTS, CSP, X-Frame-Options, etc.)

1. Back up the current Caddyfile:
   sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.pre-heal-$(date +%s)

2. Check if the headers block is present in the Caddyfile:
   grep -i "content-security-policy\|strict-transport-security\|x-frame-options" /etc/caddy/Caddyfile

3. If headers are missing or incomplete, rewrite the alfredoflores.dev block
   with the full security headers block. The expected headers are:
   - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   - Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
   - X-DNS-Prefetch-Control: off
   - Cross-Origin-Opener-Policy: same-origin
   - Cross-Origin-Resource-Policy: same-origin

4. Validate: sudo caddy validate --config /etc/caddy/Caddyfile
5. Reload: sudo systemctl reload caddy
6. Verify: curl -sI https://alfredoflores.dev | grep -i "strict-transport-security"
   If all 6 critical headers are present, the fix succeeded.
7. If validation or reload fails, revert:
   sudo cp /etc/caddy/Caddyfile.pre-heal-$(date +%s) /etc/caddy/Caddyfile
   sudo systemctl reload caddy

### Finding: HTTPS redirect regressed (no 301 to HTTPS)

1. This is a Cloudflare setting, not Caddy (Caddy runs HTTP only, CF does the redirect).
2. Check CF Always Use HTTPS setting:
   curl -s "https://api.cloudflare.com/client/v4/zones/7880a13d5f353f7ba42f5ec3626507af/settings/always_use_https" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
3. If not "on", re-enable it:
   curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/7880a13d5f353f7ba42f5ec3626507af/settings/always_use_https" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" --data '{"value":"on"}'
4. Verify: curl -sI http://alfredoflores.dev | grep "301"
   Note: CF changes can take 1-2 minutes to propagate. Wait and retry up to 3 times.
5. There is no local state to revert — if this fails, just report it.

### Finding: Cloudflare zone drift (SSL mode, min TLS, etc.)

1. Check each setting via the CF API and restore expected values:
   - SSL mode → "strict"
   - Always Use HTTPS → "on"
   - Min TLS version → "1.2"
   - Automatic HTTPS Rewrites → "on"
2. Use PATCH requests to the CF API for each drifted setting.
3. Verify each setting via GET after patching.
4. There is no local state to revert — report failure if the API rejects the change.

### Finding: Site down (not returning 200)

1. Check Caddy: systemctl status caddy
   - If not running: sudo systemctl start caddy
   - If running but site not responding: check if webroot has files: ls /var/www/alfredoflores.dev/
   - If webroot is empty: the deploy may have failed. Rebuild and deploy:
     cd /home/codedrifter/projects/landing && git pull origin main && npm ci && npm run build && rsync -avz --delete dist/ /var/www/alfredoflores.dev/

2. Check Cloudflare Tunnel: systemctl status cloudflared
   - If not running: sudo systemctl start cloudflared
   - Wait 30 seconds, then verify the tunnel is connected

3. Verify: curl -sI https://alfredoflores.dev | grep "200"
   Retry up to 3 times with 10-second intervals.

4. If you changed anything, and it didn't fix it, revert your changes:
   - If you started a service that was stopped, leave it running (that's the desired state)
   - If you redeployed and it didn't help, the old state was also broken — nothing to revert

### Finding: npm dependency vulnerabilities (high/critical)

1. cd /home/codedrifter/projects/landing
2. git pull origin main
3. Back up package state: git stash (in case there are uncommitted changes)
4. Run: npm audit fix
5. Run: npm run check (type check must pass)
6. Run: npm run build (build must succeed)
7. If both pass:
   - Commit: git add package.json package-lock.json && git commit -m "fix: npm audit fix — resolve vulnerabilities"
   - Push: git push origin main (this triggers the deploy workflow)
   - Wait for deploy to complete: gh run watch --repo codedrifter-mx/landing (latest deploy run)
   - Verify: curl -sI https://alfredoflores.dev | grep "200"
8. If check or build fails:
   - Revert: git stash pop (or git checkout -- package.json package-lock.json)
   - Report failure — the vulnerable version stays until you manually investigate

### Finding: RPi4 system packages with CVEs (arch-audit)

1. Check if updates are available: pacman -Qu
2. If updates available:
   - Check if a kernel update is in the list: pacman -Qu | grep -i "linux-aarch64\|linux-"
   - If kernel update is present: DO NOT run pacman -Syu. Report in Telegram that a kernel update is pending and requires manual intervention + reboot.
   - If NO kernel update: run sudo pacman -Syu --noconfirm
3. After update: re-run arch-audit to check if CVEs are resolved
4. Verify site still works: curl -sI https://alfredoflores.dev | grep "200"
5. If pacman broke something: there's no easy revert for pacman. Report the failure in Telegram and the GitHub issue.

## Telegram Notification

After processing all issues, send a summary via Telegram. Use the hermes "send" command or curl the Telegram API directly.

For each issue you processed, include:
- Issue number and title
- What you found (diagnosis)
- What you did (fix attempted)
- Result (✅ fixed and closed / 🚨 failed, reverted / ⚠ needs manual intervention)

Example success message:
  ✅ self-heal — alfredoflores.dev
  
  Issue #1: security-audit findings
  • Headers regressed → restored Caddy headers block, reloaded → ✅ fixed
  • Site down → started caddy → ✅ fixed
  Issue closed.

Example failure message:
  🚨 self-heal — alfredoflores.dev
  
  Issue #1: dependency-audit findings
  • npm vulnerabilities → npm audit fix broke build → reverted → 🚨 failed, manual intervention needed
  Issue remains open.

## Hard Boundaries — NEVER do these

- Never run pacman -Syu if a kernel update is in the list
- Never reboot the RPi4
- Never delete or recreate /var/www/alfredoflores.dev/
- Never modify GitHub secrets
- Never disable nftables, SSH config, or fail2ban
- Never edit systemd service files for caddy, cloudflared, or sshd
- Never install new packages with pacman (only update existing ones)
- Never push to main if the build fails
- Never skip the verify step after any change
- Never skip the revert step if verification fails

## Environment

- You are running on the RPi4 as user codedrifter
- You have passwordless sudo
- The repo is at /home/codedrifter/projects/landing
- The webroot is /var/www/alfredoflores.dev/
- Caddy config is at /etc/caddy/Caddyfile
- gh CLI is authenticated as codedrifter-mx
- The Telegram bot token is in the environment: TELEGRAM_BOT_TOKEN
- The Cloudflare API token is in the environment: CLOUDFLARE_API_TOKEN
- Telegram chat ID: 6148305767
- Cloudflare zone ID: 7880a13d5f353f7ba42f5ec3626507af
```

## §4 · Secrets & Environment

Hermes needs two secrets: the Cloudflare API token (for zone drift fixes) and the Telegram bot token (for notifications). These already exist as GitHub Actions secrets, but hermes runs locally — it needs them in `~/.hermes/.env`.

**Changes to `~/.hermes/.env`**:
```bash
# Already present:
TELEGRAM_BOT_TOKEN=<token>
TELEGRAM_CHAT_ID=6148305767

# Add:
CLOUDFLARE_API_TOKEN=<token>
```

The prompt references `$CLOUDFLARE_API_TOKEN` and `$TELEGRAM_BOT_TOKEN` as environment variables. Hermes' cron runner inherits the `.env` file, so the agent has them in its environment.

File permissions are `600` (owner-only), owned by `codedrifter`. If either token is rotated, update both the GitHub secret AND `~/.hermes/.env`.

**No new secrets, no new infrastructure** — one line added to an existing file.

## Out of scope (v1)

- Active uptime monitoring from a separate host (would close the "RPi4 completely down" blind spot)
- Hermes webhook for real-time triggering (instead of cron schedule)
- Aggressive autonomy (kernel updates + reboot)
- Self-healing for the hermes cron system itself (if hermes breaks, manual fix required)
- Multi-host audit (other Arch machines)
