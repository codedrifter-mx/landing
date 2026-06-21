# Design Spec — Weekly GHA Security & Dependency Audits

**Date:** 2026-06-20
**Owner:** Alfredo Flores Garcia
**Repo:** `codedrifter-mx/landing`
**Status:** Approved (all sections) — ready for implementation planning

## Purpose

Two weekly GitHub Actions workflows that monitor the alfredoflores.dev portfolio for dependency vulnerabilities and security drift. Designed for a project that may go unattended for weeks: findings trigger Telegram alerts (immediate poke) and GitHub Issues (durable record that persists until resolved).

## Context

- **Site**: Astro static portfolio deployed to RPi4 via Caddy + Cloudflare Tunnel
- **Existing workflow**: `deploy.yml` (push to main → build → rsync to webroot)
- **Runner**: self-hosted on the RPi4 (Arch Linux ARM, Node 26, npm 11, passwordless sudo, `gh` CLI authenticated)
- **Telegram**: bot token verified working (`<TELEGRAM_BOT_TOKEN>`), chat ID `<TELEGRAM_CHAT_ID>` (Alfredo DM)
- **Cloudflare API**: zone-edit token available for drift checks
- **Schedule**: Saturday 10:00 AM Mexico City (UTC-6, no DST) = `0 16 * * 6` UTC

## Architecture

Two independent workflows, both on the self-hosted runner, 30 minutes apart:

| Workflow | Cron (UTC) | Local time | Purpose |
|---|---|---|---|
| `dependency-audit.yml` | `0 16 * * 6` | Sat 10:00 AM | npm dependency vulnerabilities + outdated packages |
| `security-audit.yml` | `30 16 * * 6` | Sat 10:30 AM | RPi4 system packages, security headers, HTTPS redirect, Cloudflare zone drift, site liveness |

Both workflows:
- Run on `self-hosted` (the RPi4)
- Have `permissions: contents: read, issues: write`
- Support `workflow_dispatch` for manual triggering
- On findings: send Telegram alert + open GitHub Issue
- On clean: send brief Telegram "all clear" + auto-close any open audit issue from the prior week

### Why GHA, not hermes

The RPi4 hosts hermes, but if the RPi4 is the thing that broke (Caddy crashed, tunnel dropped, packages vulnerable), hermes is on the same machine. GHA scheduled workflows run on GitHub's infra — the scheduled trigger fires regardless of RPi4 state. If the runner is offline, the workflow fails to start, but GitHub emails the repo owner if scheduled workflows stop running for 60 days. That's a weaker signal but better than nothing.

### Blind spot

If the RPi4 is completely down, neither workflow runs (runner offline). No Telegram alert fires. Mitigation: GitHub's "workflow hasn't run in 60 days" email. Active uptime monitoring from a separate host is out of scope for v1.

## §1 · `dependency-audit.yml`

**File**: `.github/workflows/dependency-audit.yml`

**Schedule**: `cron: '0 16 * * 6'` (Saturday 10:00 AM Mexico City)

**Checks**:

1. **`npm audit --audit-level=high`** — scans `package-lock.json` for high/critical CVEs. Only alerts on high/critical; low/moderate are noise for a portfolio site. Output captured to temp file for the issue body.
2. **`npm outdated`** — informational only. Included in the issue body if vulnerabilities are found, but does NOT trigger an alert on its own. A weekly ping because Astro went 6.4.8 → 6.4.9 is noise.

**Behavior**:
- **Findings (high/critical CVEs)**: Telegram alert with summary (vulnerability count + package names) + GitHub Issue with full `npm audit` output and `npm outdated` list. Issue includes recommended `npm install package@version` commands.
- **Clean**: brief Telegram message "No high/critical vulnerabilities. N packages outdated."

**Key details**:
- `npm audit` runs against the committed `package-lock.json` via `npm ci` — reflects exactly what's deployed, not a fresh install
- `npm audit` exits non-zero on findings; the step captures output with `|| true` so the workflow continues to the notification step
- `npm outdated` also exits non-zero when packages are outdated; same `|| true` pattern

## §2 · `security-audit.yml`

**File**: `.github/workflows/security-audit.yml`

**Schedule**: `cron: '30 16 * * 6'` (Saturday 10:30 AM Mexico City)

**5 checks, each writes a finding to a temp file if it fails:**

### Check 1: RPi4 system packages
```bash
pacman -Qu        # pending Arch updates
arch-audit        # known CVEs in installed packages (from archlinux security tracker)
```
- If `pacman -Qu` output is non-empty: finding "N system packages pending update" + the list
- If `arch-audit` output is non-empty: finding with CVE list (capped at 50 lines)
- `arch-audit` must be installed (`sudo pacman -S arch-audit`) — installed during implementation if missing

### Check 2: Security headers regression
```bash
HEADERS=$(curl -sI https://alfredoflores.dev)
# Grep for each of the 6 critical headers:
# strict-transport-security, content-security-policy, x-frame-options,
# x-content-type-options, referrer-policy, permissions-policy
```
- Loops the 6 critical headers, flags any missing from the live response
- Catches Caddy reload regressions, Cloudflare header stripping, config drift

### Check 3: HTTPS redirect regression
```bash
curl -sI http://alfredoflores.dev
# Expect: HTTP/1.1 301 + Location: https://alfredoflores.dev/
```
- If not a 301 or no https Location: finding "Always Use HTTPS regressed"

### Check 4: Cloudflare zone drift
```bash
# Query CF API for 3 settings, compare to expected:
ssl = "strict" | always_use_https = "on" | min_tls_version = "1.2"
```
- Uses `CLOUDFLARE_API_TOKEN` secret + zone ID `7880a13d5f353f7ba42f5ec3626507af`
- If any setting drifted: finding "CF zone drift: X changed from Y to Z"

### Check 5: Site liveness
```bash
curl -sI https://alfredoflores.dev
# Expect: HTTP/2 200
```
- If not 200: finding "SITE DOWN — alfredoflores.dev returned STATUS"
- Catches Caddy crashes, tunnel drops, webroot issues

**After all 5 checks**: if any findings exist, send Telegram alert (categorized by severity) + open GitHub Issue with all findings. If all clean, send Telegram "security audit clean" + auto-close prior week's issue.

## §3 · Telegram Notification

**Method**: direct curl to Telegram Bot API (no hermes dependency — most robust, works even if hermes is down).

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=$MESSAGE"
```

**Message formats**:

Alert (dependencies):
```
🚨 alfredoflores.dev — dependency-audit

3 high vulnerabilities found:
• sharp 0.35.2 — prototype pollution (high)
• astro 6.4.8 — SSRX (critical)

Issue: https://github.com/codedrifter-mx/landing/issues/N
```

Alert (security):
```
🚨 alfredoflores.dev — security-audit

2 findings:
⚠ HIGH: SITE DOWN — alfredoflores.dev returned 502
ℹ INFO: 14 system packages pending update

Issue: https://github.com/codedrifter-mx/landing/issues/N
```

Clean:
```
✅ alfredoflores.dev — dependency-audit
No high/critical vulnerabilities. 0 packages outdated.
```

**Constraints**:
- Messages capped at 4096 chars (Telegram limit)
- Long output (full `arch-audit` list, complete `npm audit` report) goes in the GitHub Issue body, not Telegram
- Telegram message is the summary poke; the issue is the full record

## §4 · GitHub Issue Management

**Opening**:
- Title: `[audit] <workflow-name> findings — <YYYY-MM-DD>`
- Labels: `security`, `audit`
- Body: full raw output from failing checks

**Closing (auto)**:
- At the start of each run, search for open issues with label `audit` matching the workflow name
- If this run is clean: close the existing issue(s) with comment "Auto-closed: audit clean on <date>"
- If this run has new findings: close the old issue (stale) and open a fresh one
- At most one open audit issue per workflow at any time — prevents accumulation

**Implementation**: uses `gh` CLI (authenticated on the RPi4 runner):
```bash
EXISTING=$(gh issue list --repo codedrifter-mx/landing --label "audit,security" \
  --state open --search "in:title $WORKFLOW_NAME" --json number --jq '.[0].number')
if [ -n "$EXISTING" ]; then
  gh issue close "$EXISTING" --repo codedrifter-mx/landing \
    --comment "Auto-closed: audit clean on $(date +%F)"
fi
gh issue create --repo codedrifter-mx/landing --label "security,audit" \
  --title "..." --body "..."
```

## §5 · Required Secrets

| Secret | Value | Used by |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `<TELEGRAM_BOT_TOKEN>` | both workflows |
| `TELEGRAM_CHAT_ID` | `<TELEGRAM_CHAT_ID>` | both workflows |
| `CLOUDFLARE_API_TOKEN` | zone-edit token (`<CLOUDFLARE_API_TOKEN>`) | security-audit only |

Added during implementation via `gh secret set`.

## Out of scope (v1)

- Active uptime monitoring from a separate host (would close the "RPi4 completely down" blind spot)
- Discord/Slack notifications (Telegram is the chosen channel)
- Automated dependency updates (dependabot/renovate — could be added later, but the audit workflow gives you the info to decide manually)
- Low/moderate npm vulnerability alerts (noise for a portfolio site)
- Performance regression monitoring (Lighthouse CI — could be a third weekly workflow later)
