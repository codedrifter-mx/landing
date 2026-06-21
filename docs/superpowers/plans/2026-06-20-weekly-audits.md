# Weekly GHA Audits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two weekly GitHub Actions workflows that audit alfredoflores.dev for dependency vulnerabilities and security drift, alerting via Telegram + GitHub Issues.

**Architecture:** Two scheduled workflows on the self-hosted RPi4 runner (Saturday 10:00/10:30 AM Mexico City). Both use a shared Telegram notification function and GitHub Issue auto-close/open pattern. Secrets stored in GitHub repo secrets.

**Tech Stack:** GitHub Actions (self-hosted runner), bash, `npm audit`, `npm outdated`, `pacman -Qu`, `arch-audit`, `curl`, `gh` CLI, Telegram Bot API, Cloudflare API.

**Spec:** `docs/superpowers/specs/2026-06-20-weekly-audits-design.md`

---

## File Structure

```
.github/workflows/
  dependency-audit.yml    # Weekly npm vulnerability + outdated check
  security-audit.yml      # Weekly RPi4 system + headers + CF drift + liveness check
```

No application code changes. No new dependencies. All logic is bash inline in the workflow YAML.

---

## Task 1: Install arch-audit on RPi4 + Set GitHub Secrets

**Files:**
- No repo files (infrastructure setup)

- [ ] **Step 1: Install arch-audit on RPi4**

```bash
ssh codedrifter@192.168.1.65 'sudo pacman -S --noconfirm arch-audit && arch-audit --version'
```

Expected: `arch-audit` installed and version printed. This is needed by the security-audit workflow to check installed packages for known CVEs.

- [ ] **Step 2: Set TELEGRAM_BOT_TOKEN secret**

```bash
gh secret set TELEGRAM_BOT_TOKEN --repo codedrifter-mx/landing --body "<TELEGRAM_BOT_TOKEN>"
```

Expected: `✓ Set Actions secret TELEGRAM_BOT_TOKEN for codedrifter-mx/landing`

- [ ] **Step 3: Set TELEGRAM_CHAT_ID secret**

```bash
gh secret set TELEGRAM_CHAT_ID --repo codedrifter-mx/landing --body "<TELEGRAM_CHAT_ID>"
```

Expected: `✓ Set Actions secret TELEGRAM_CHAT_ID for codedrifter-mx/landing`

- [ ] **Step 4: Set CLOUDFLARE_API_TOKEN secret**

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo codedrifter-mx/landing --body "<CLOUDFLARE_API_TOKEN>"
```

Expected: `✓ Set Actions secret CLOUDFLARE_API_TOKEN for codedrifter-mx/landing`

- [ ] **Step 5: Verify all 3 secrets are set**

```bash
gh secret list --repo codedrifter-mx/landing
```

Expected: 3 secrets listed: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CLOUDFLARE_API_TOKEN`.

- [ ] **Step 6: Create audit labels on the repo**

```bash
gh label create security --repo codedrifter-mx/landing --color "D73A4A" --description "Security finding" 2>/dev/null || true
gh label create audit --repo codedrifter-mx/landing --color "FBCA04" --description "Automated audit finding" 2>/dev/null || true
```

Expected: both labels created (or "already exists" which is fine — the `|| true` handles that).

---

## Task 2: Create `dependency-audit.yml` Workflow

**Files:**
- Create: `.github/workflows/dependency-audit.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/dependency-audit.yml` with this exact content:

```yaml
name: Dependency Audit

on:
  schedule:
    - cron: '0 16 * * 6'
  workflow_dispatch: {}

jobs:
  audit:
    runs-on: self-hosted
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: npm audit (high+critical)
        id: audit
        run: |
          OUTPUT=$(npm audit --audit-level=high 2>&1) || true
          echo "$OUTPUT"
          if echo "$OUTPUT" | grep -qE "high|critical"; then
            echo "has_findings=true" >> $GITHUB_OUTPUT
            echo "$OUTPUT" > /tmp/audit-output.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: npm outdated
        id: outdated
        run: |
          OUTDATED=$(npm outdated 2>&1) || true
          OUTDATED_COUNT=$(echo "$OUTDATED" | grep -c ":" || true)
          if [ "$OUTDATED_COUNT" -gt 0 ]; then
            echo "has_outdated=true" >> $GITHUB_OUTPUT
            echo "outdated_count=$OUTDATED_COUNT" >> $GITHUB_OUTPUT
            echo "$OUTDATED" > /tmp/outdated.txt
          else
            echo "has_outdated=false" >> $GITHUB_OUTPUT
            echo "outdated_count=0" >> $GITHUB_OUTPUT
          fi

      - name: Close prior audit issue
        if: always()
        run: |
          EXISTING=$(gh issue list --repo codedrifter-mx/landing --label "audit,security" \
            --state open --search "in:title dependency-audit" --json number --jq '.[0].number' 2>/dev/null) || true
          if [ -n "$EXISTING" ]; then
            gh issue close "$EXISTING" --repo codedrifter-mx/landing \
              --comment "Auto-closed: audit run on $(date -u +%F)" 2>/dev/null || true
          fi

      - name: Open issue + send Telegram alert
        if: steps.audit.outputs.has_findings == 'true'
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          AUDIT_SUMMARY=$(cat /tmp/audit-output.txt | grep -oE "[0-9]+ (high|critical)" | head -5)
          OUTDATED_INFO=""
          if [ "${{ steps.outdated.outputs.has_outdated }}" = "true" ]; then
            OUTDATED_COUNT="${{ steps.outdated.outputs.outdated_count }}"
            OUTDATED_INFO="
          $OUTDATED_COUNT packages outdated:
          $(cat /tmp/outdated.txt | head -10)"
          fi

          # Open GitHub Issue
          ISSUE_URL=$(gh issue create --repo codedrifter-mx/landing \
            --label "security,audit" \
            --title "[audit] dependency-audit findings — $(date -u +%F)" \
            --body "$(cat /tmp/audit-output.txt)

          ---
          Outdated packages:
          $(cat /tmp/outdated.txt 2>/dev/null || echo 'none')")

          # Send Telegram alert
          MESSAGE="🚨 alfredoflores.dev — dependency-audit

          Vulnerabilities found:
          $AUDIT_SUMMARY
          $OUTDATED_INFO
          Issue: $ISSUE_URL"

          curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            --data-urlencode "text=$MESSAGE"

      - name: Send Telegram clean notification
        if: steps.audit.outputs.has_findings == 'false'
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          OUTDATED_COUNT="${{ steps.outdated.outputs.outdated_count }}"
          MESSAGE="✅ alfredoflores.dev — dependency-audit
          No high/critical vulnerabilities. $OUTDATED_COUNT packages outdated."

          curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            --data-urlencode "text=$MESSAGE"
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/dependency-audit.yml'))" && echo "YAML valid"
```

Expected: `YAML valid` printed. If error, fix indentation in the YAML.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/dependency-audit.yml
git commit -m "ci: add weekly dependency audit workflow with Telegram alerts"
```

- [ ] **Step 4: Push and trigger manual test run**

```bash
git push origin main
gh workflow run "Dependency Audit" --repo codedrifter-mx/landing
sleep 10
gh run list --repo codedrifter-mx/landing --workflow "Dependency Audit" --limit 1
```

Expected: workflow triggered, run appears in list. Monitor it:
```bash
gh run watch --repo codedrifter-mx/landing $(gh run list --repo codedrifter-mx/landing --workflow "Dependency Audit" --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: run completes successfully. You should receive a Telegram message (either "✅ clean" or "🚨 findings"). Verify the message arrived on Telegram.

---

## Task 3: Create `security-audit.yml` Workflow

**Files:**
- Create: `.github/workflows/security-audit.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/security-audit.yml` with this exact content:

```yaml
name: Security Audit

on:
  schedule:
    - cron: '30 16 * * 6'
  workflow_dispatch: {}

jobs:
  audit:
    runs-on: self-hosted
    permissions:
      contents: read
      issues: write
    env:
      ZONE_ID: "7880a13d5f353f7ba42f5ec3626507af"
    steps:
      - uses: actions/checkout@v4

      - name: Check 1 — RPi4 system packages
        id: syspkgs
        run: |
          FINDINGS=""
          UPDATES=$(pacman -Qu 2>/dev/null | wc -l)
          if [ "$UPDATES" -gt 0 ]; then
            FINDINGS="ℹ INFO: $UPDATES system packages pending update
          $(pacman -Qu 2>/dev/null | head -20)
          "
            echo "has_findings=true" >> $GITHUB_OUTPUT
          fi

          CVE_OUTPUT=$(arch-audit 2>/dev/null | head -50)
          if [ -n "$CVE_OUTPUT" ]; then
            CVE_COUNT=$(echo "$CVE_OUTPUT" | wc -l)
            FINDINGS="${FINDINGS}⚠ HIGH: $CVE_COUNT packages with known CVEs
          $(echo "$CVE_OUTPUT" | head -20)
          "
            echo "has_findings=true" >> $GITHUB_OUTPUT
          fi

          if [ -n "$FINDINGS" ]; then
            echo "$FINDINGS" > /tmp/syspkgs-findings.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: Check 2 — Security headers regression
        id: headers
        run: |
          HEADERS=$(curl -sI https://alfredoflores.dev 2>&1)
          EXPECTED="strict-transport-security content-security-policy x-frame-options x-content-type-options referrer-policy permissions-policy"
          MISSING=""
          for h in $EXPECTED; do
            if ! echo "$HEADERS" | grep -qi "$h"; then
              MISSING="$MISSING  • missing: $h"
            fi
          done
          if [ -n "$MISSING" ]; then
            echo "has_findings=true" >> $GITHUB_OUTPUT
            echo "⚠ HIGH: Security headers regressed:$MISSING" > /tmp/headers-findings.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: Check 3 — HTTPS redirect regression
        id: https
        run: |
          RESPONSE=$(curl -sI http://alfredoflores.dev 2>&1)
          STATUS=$(echo "$RESPONSE" | grep -oE "HTTP/[0-9.]+ [0-9]+" | head -1)
          LOCATION=$(echo "$RESPONSE" | grep -i "location:" | head -1)
          if ! echo "$STATUS" | grep -q "301" || ! echo "$LOCATION" | grep -qi "https"; then
            echo "has_findings=true" >> $GITHUB_OUTPUT
            echo "⚠ HIGH: Always Use HTTPS regressed — got $STATUS, Location: $LOCATION" > /tmp/https-findings.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: Check 4 — Cloudflare zone drift
        id: cfzone
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          FINDINGS=""
          SSL=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/ssl" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['value'])" 2>/dev/null)
          if [ "$SSL" != "strict" ]; then
            FINDINGS="⚠ HIGH: CF SSL mode drifted to '$SSL' (expected: strict)
          "
          fi

          HTTPS_SETTING=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['value'])" 2>/dev/null)
          if [ "$HTTPS_SETTING" != "on" ]; then
            FINDINGS="${FINDINGS}⚠ HIGH: CF Always Use HTTPS drifted to '$HTTPS_SETTING' (expected: on)
          "
          fi

          MIN_TLS=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/min_tls_version" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['value'])" 2>/dev/null)
          if [ "$MIN_TLS" != "1.2" ]; then
            FINDINGS="${FINDINGS}ℹ INFO: CF Min TLS version drifted to '$MIN_TLS' (expected: 1.2)
          "
          fi

          if [ -n "$FINDINGS" ]; then
            echo "has_findings=true" >> $GITHUB_OUTPUT
            echo "$FINDINGS" > /tmp/cfzone-findings.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: Check 5 — Site liveness
        id: liveness
        run: |
          STATUS=$(curl -sI https://alfredoflores.dev 2>&1 | grep -oE "HTTP/[0-9.]+ [0-9]+" | head -1)
          if ! echo "$STATUS" | grep -q "200"; then
            echo "has_findings=true" >> $GITHUB_OUTPUT
            echo "🚨 CRITICAL: SITE DOWN — alfredoflores.dev returned $STATUS" > /tmp/liveness-findings.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: Aggregate findings
        id: aggregate
        run: |
          ALL_FINDINGS=""
          for f in /tmp/syspkgs-findings.txt /tmp/headers-findings.txt /tmp/https-findings.txt /tmp/cfzone-findings.txt /tmp/liveness-findings.txt; do
            if [ -f "$f" ]; then
              ALL_FINDINGS="${ALL_FINDINGS}$(cat "$f")
          "
            fi
          done
          if [ -n "$ALL_FINDINGS" ]; then
            echo "has_findings=true" >> $GITHUB_OUTPUT
            echo "$ALL_FINDINGS" > /tmp/all-findings.txt
          else
            echo "has_findings=false" >> $GITHUB_OUTPUT
          fi

      - name: Close prior audit issue
        if: always()
        run: |
          EXISTING=$(gh issue list --repo codedrifter-mx/landing --label "audit,security" \
            --state open --search "in:title security-audit" --json number --jq '.[0].number' 2>/dev/null) || true
          if [ -n "$EXISTING" ]; then
            gh issue close "$EXISTING" --repo codedrifter-mx/landing \
              --comment "Auto-closed: audit run on $(date -u +%F)" 2>/dev/null || true
          fi

      - name: Open issue + send Telegram alert
        if: steps.aggregate.outputs.has_findings == 'true'
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          FINDINGS=$(cat /tmp/all-findings.txt)

          # Open GitHub Issue
          ISSUE_URL=$(gh issue create --repo codedrifter-mx/landing \
            --label "security,audit" \
            --title "[audit] security-audit findings — $(date -u +%F)" \
            --body "$FINDINGS")

          # Send Telegram alert (cap at 4000 chars to stay under Telegram 4096 limit)
          MESSAGE="🚨 alfredoflores.dev — security-audit

          $FINDINGS

          Issue: $ISSUE_URL"

          curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            --data-urlencode "text=$(echo "$MESSAGE" | head -c 4000)"

      - name: Send Telegram clean notification
        if: steps.aggregate.outputs.has_findings == 'false'
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
        run: |
          MESSAGE="✅ alfredoflores.dev — security-audit
          All 5 checks passed: system packages, security headers, HTTPS redirect, CF zone, site liveness."

          curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            --data-urlencode "text=$MESSAGE"
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/security-audit.yml'))" && echo "YAML valid"
```

Expected: `YAML valid` printed. If error, fix indentation.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/security-audit.yml
git commit -m "ci: add weekly security audit workflow with Telegram alerts"
```

- [ ] **Step 4: Push and trigger manual test run**

```bash
git push origin main
gh workflow run "Security Audit" --repo codedrifter-mx/landing
sleep 10
gh run list --repo codedrifter-mx/landing --workflow "Security Audit" --limit 1
```

Expected: workflow triggered. Monitor it:
```bash
gh run watch --repo codedrifter-mx/landing $(gh run list --repo codedrifter-mx/landing --workflow "Security Audit" --limit 1 --json databaseId --jq '.[0].databaseId')
```

Expected: run completes successfully. You should receive a Telegram message ("✅ all 5 checks passed" or "🚨 findings"). Verify on Telegram.

---

## Task 4: End-to-End Verification

- [ ] **Step 1: Verify both workflows are active**

```bash
gh workflow list --repo codedrifter-mx/landing
```

Expected: 3 workflows listed: `Deploy`, `Dependency Audit`, `Security Audit` — all showing `active`.

- [ ] **Step 2: Verify both manual runs succeeded**

```bash
gh run list --repo codedrifter-mx/landing --limit 5
```

Expected: the 2 manual audit runs both show `✓ success / completed`.

- [ ] **Step 3: Verify Telegram messages received**

Check your Telegram DM from the bot. You should have:
- One message from `dependency-audit` (✅ clean or 🚨 findings)
- One message from `security-audit` (✅ clean or 🚨 findings)

- [ ] **Step 4: Verify no stray GitHub Issues left open**

```bash
gh issue list --repo codedrifter-mx/landing --label "audit,security" --state open
```

Expected: empty (if both runs were clean) OR at most 2 open issues (one per workflow if findings existed). The auto-close step runs on every execution, so stale issues from prior runs should be closed.

- [ ] **Step 5: Verify schedule is correct**

```bash
gh workflow view "Dependency Audit" --repo codedrifter-mx/landing | grep -i schedule
gh workflow view "Security Audit" --repo codedrifter-mx/landing | grep -i schedule
```

Expected: both show the cron schedule (`0 16 * * 6` and `30 16 * * 6` respectively).

---

## Summary

| Task | What it delivers |
|------|-----------------|
| 1 | Install arch-audit on RPi4 + set 3 GitHub secrets + create audit labels |
| 2 | `dependency-audit.yml` — weekly npm audit + outdated check with Telegram + Issue |
| 3 | `security-audit.yml` — 5 security checks (syspkgs, headers, HTTPS, CF drift, liveness) |
| 4 | End-to-end verification: both workflows active, Telegram working, no stray issues |
