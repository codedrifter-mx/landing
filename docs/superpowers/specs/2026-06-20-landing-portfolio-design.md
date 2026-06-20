# Design Spec — alfredoflores.dev Portfolio

**Date:** 2026-06-20
**Owner:** Alfredo Flores Garcia
**Repo:** `codedrifter-mx/landing` (empty `main` branch, remote configured)
**Status:** Approved (all sections) — ready for implementation planning

## Purpose

A portfolio/landing page for Alfredo Flores Garcia, a software engineer specializing in identity and auth (IAM/Keycloak) at scale. Target audience: recruiters and senior software engineers. The site must let visitors know Alfredo deeply, showcase backend depth, be highly performant, and deploy on a self-hosted Raspberry Pi 4 via Cloudflare Tunnel + Caddy to `alfredoflores.dev`.

## Audience & Goals

- **Recruiters**: scan experience, skills, and contact quickly; understand positioning in one screen.
- **Senior engineers**: judge depth via a real architecture case study (Keycloak IAM migration), project technical hooks, and the site's own engineering quality (performance, self-hosting, typed content).

## Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Direction | The Engineer's Terminal (A) | Fits CLI/agentic-workflow background; personal, bold |
| Aesthetic intensity | Terminal-Inspired (B) | Monospace-first, subtle motifs, recruiter-safe, content-first |
| Tech stack | Astro static export | Zero runtime, best perf on shared RPi4, backend shown via content |
| Content scope (v1) | whoami, experience, projects, case-study, stack, talks, contact, colophon | Blog and "now" deferred to v2 |
| Deployment shape | Shape A — Caddy `file_server` static | Removes :9101 app + healthz dependency; correct tool for static |

## §1 · Architecture & Tech Stack

**Site**: Astro static export (`output: 'static'`) → `dist/` served by Caddy's `file_server` on RPi4. Zero runtime. Build via GitHub Actions; deploy via SSH/rsync to RPi4.

**Stack**:
- Astro + TypeScript (strict)
- Tailwind CSS v4 for styling (monospace-first design tokens)
- Astro Content Collections for typed content (experience, projects, talks, case-study)
- No React/JS framework. Astro islands only where needed (minimal: optional typed-terminal hero animation, copy-to-clipboard for contact)
- Markdown content in `src/content/` — fully typed via `src/content.config.ts` schema

**Performance budget**: Lighthouse 100/100/100/100, LCP <1s, TBT <50ms, total JS <5KB (target 0 KB). Static HTML + CSS, no web font.

**Repo structure**:
```
src/
  components/        # Hero, ExperienceItem, ProjectCard, CaseStudy, SkillMatrix, TalkItem, Footer
  content/
    experience/      # *.md (Dexcom, Walmart, SC Computacion, Magnimus)
    projects/        # *.md (LiveOps, auto-servidores)
    talks/           # *.md (ITJ soft-skills, DgoTecHub OAuth)
    case-study/      # *.md (Keycloak IAM migration, structured fields)
  layouts/
    Base.astro
  pages/
    index.astro
  styles/
    tokens.css       # design tokens (colors, mono scale, spacing)
docs/
  superpowers/specs/
public/              # favicon, robots.txt, og-image, sitemap (generated)
```

## §2 · Visual Design System

**Aesthetic**: Terminal-Inspired — monospace-first, subtle prompt motifs, modern dark palette, content-first. Single dark theme for v1 (no toggle).

### Palette

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0e14` | page background |
| `--bg-elev` | `#11151f` | cards / case-study panels |
| `--border` | `#1c2230` | hairline dividers, card edges |
| `--text` | `#e6edf3` | body |
| `--text-dim` | `#8b98a9` | secondary / metadata / labels |
| `--accent` | `#5bd1a0` | prompt `$`, section `//` comments, links hover, code highlights |
| `--accent-2` | `#7dd3fc` | links, project tags, navigation |

Two accents only: green = terminal/prompt semantic; sky = links/navigation semantic. No rainbow syntax highlighting.

### Typography

- **Everything monospace**: `ui-monospace, "JetBrains Mono", "Fira Code", SFMono, Menlo, Consolas, monospace`.
- **No web font**: system monospace stack only. Zero font transfer = best perf, no FOUT, no layout shift. Fallback chain gives a good mono on every platform.
- **Scale** (clamped, responsive):
  - Hero name: `clamp(1.75rem, 5vw, 2.5rem)`, weight 700, tight tracking
  - Section headers: `// experience` style, `0.75rem` uppercase, letter-spacing `0.08em`, `--accent` color — the "prompt" motif
  - Body: `0.95rem`, line-height 1.7
  - Metadata (dates, tags): `0.8rem`, `--text-dim`

### Motifs (subtle, consistent)

- Section headers rendered as `// experience` in `--accent` green — the CLI-comment motif, used on every section
- Hero opens with a single `$ whoami` prompt line in `--accent`, then the name — one literal moment, not repeated elsewhere
- Inline code: `--bg-elev` background + `--accent` color
- Link hover: `--accent` + underline offset 3px

### Layout & spacing

- Single-column, max-width `42rem` (672px) centered — reading-optimized
- Vertical rhythm: sections separated by `4rem` desktop, `2.5rem` mobile
- Horizontal padding: `1.25rem` mobile, `clamp(1.25rem, 5vw, 2rem)`
- Cards (projects, case study): `--bg-elev` bg, `1px solid --border`, `12px` radius, `1.25rem` padding
- No box shadows, no gradients — flat, terminal-honest. Borders do structural work.
- No nav bar (single page, scroll). Optional sticky `// top` anchor in footer.

### Motion

Minimal. Optional typewriter effect on the hero `$ whoami` prompt (CSS-only preferred; if JS, a single inline `<script>` <1KB). Respects `prefers-reduced-motion` everywhere. No scroll animations, no parallax.

## §3 · Content & Information Architecture

Single-page, scroll-based. Eight sections in order, each anchored by the `// section` comment motif.

### 1. `// whoami` — Hero
```
$ whoami
Alfredo Flores Garcia
Software Engineer · IAM / Keycloak · Dexcom
Durango, Mexico — Remote
[github] [linkedin] [email]
```
One literal `$` prompt, then name in large mono, positioning line, location, contact row (icon + text links). No photo in v1.

### 2. `// experience` — Timeline
Four roles from resume. Each block:
- **Role · Company** (left) | **dates** (right, dim)
- One-line context
- 2-3 bullet impact statements, single sentences with **bolded metrics** where possible
- Dexcom gets the most depth (3 bullets: IAM migration, 7 SPIs, tier-1 incident response). Others: 1-2 bullets.

Sourced from typed Markdown in `src/content/experience/`.

### 3. `// projects` — Featured Projects
Two project cards (LiveOps, auto-servidores). Card layout:
- **Name** + one-line subtitle
- 2-3 sentence description with the key technical hook
- Tag row: tech badges (CopilotKit, Gemini 2.0, SSE, MCP / Rust, Tauri 2.0, SQLite, WAL)
- Footer row: `→ github` link + role/contribution

### 4. `// case-study` — Keycloak IAM Migration (centerpiece)
A deep-dive panel (`--bg-elev` card, larger) for senior-engineer attention. Structure:
- **Title**: "IdentityServer3 → Keycloak · Strangler Fig migration across 16 environments"
- **Context**: FDA-regulated CGM ecosystem, 20+ first-party apps, zero-downtime constraint
- **Approach**: Strangler Fig pattern, Spring Cloud Gateway (WebFlux), backward compatibility
- **What I built**: 7+ custom Keycloak SPIs in Java — Passkeys, WebAuthn, OTP, complex MFA. Styled as a monospace code-block-ish list with `--accent` bullet markers
- **Operations**: Kubernetes/ArgoCD, Redis cache strategy, 10 microservices, 16 envs, Datadog observability, SLA targets
- **Outcome**: serving millions of CGM users
- **Architecture diagram**: inline SVG, monospace-styled, showing old → gateway → Keycloak + SPIs. The one visual element that directly demonstrates system thinking.

### 5. `// stack` — Technical Skills
Grouped mono key-value blocks (not a word-cloud), reading like a config file:
```
languages    kotlin · java · rust · python · typescript · sql
backend      spring boot · express.js · reactor / rxjava
frontend     react · next.js · tailwind
cloud        aws · gcp · k8s · docker · argocd · terraform · gh-actions
auth         keycloak · oauth 2.1 · oidc · webauthn · passkeys · mfa
ai           copilotkit · mcp servers · llm integration · prompt eng
```
Label in `--text-dim`, values in `--text`.

### 6. `// talks` — Leadership & Mentoring
Two compact entries:
- **Mastering Soft Skills for Team Success** — ITJ company-wide tech talk, May 2025 — 55+ engineers
- **101 OAuth & OpenID** — DgoTecHub lightning talk, Jan 2026 — 30+ engineers

### 7. `// contact` — Contact
Repeat contact row plus one-line CTA: "Open to senior backend / IAM / platform roles. Let's talk." Email is primary action (mailto link; optional copy-to-clipboard on click).

### 8. Footer / colophon
Single dim line, the meta flex:
```
self-hosted on raspberry pi 4 · cloudflare tunnel · caddy · astro static
© 2026 alfredo flores
```
Optional: link the site's own source on GitHub (`landing` repo).

### Content as data
All experience/projects/talks entries live in `src/content/` as Markdown with typed frontmatter (Astro Content Collections + `src/content.config.ts` schema). The case study is a dedicated Markdown file under `src/content/case-study/` with structured fields (context, approach, built, operations, outcome) rendering into the panel consistently. This keeps content editable and type-checked — itself a backend-engineer signal.

## §4 · Deployment & CI/CD

**Target**: `alfredoflores.dev` served from RPi4 via the existing Cloudflare Tunnel + Caddy stack.

### Current RPi4 state (verified via SSH on 2026-06-20)
- Arch Linux ARM aarch64; Caddy v2.11.3 (systemd, active); Cloudflared (systemd, active)
- Caddyfile: `http://alfredoflores.dev` → `reverse_proxy 127.0.0.1:9101 { health_uri /healthz }` with `auto_https off` (Cloudflare terminates TLS) and `default_bind 127.0.0.1`
- Docker available; `/var/www/http` webroot exists
- SSH access: `ssh codedrifter@192.168.1.65`

### Deployment shape — Shape A (approved): Caddy `file_server` static
- Webroot on RPi4: `/var/www/alfredoflores.dev/` (new dir, owned by `codedrifter`)
- Replace the `alfredoflores.dev` block in Caddyfile:
  ```caddy
  http://alfredoflores.dev {
      root * /var/www/alfredoflores.dev
      encode zstd gzip
      file_server
      try_files {path} /index.html
  }
  ```
- No `/healthz` process needed; Caddy itself is the origin. Health is implicit (Caddy serves 200).
- Drops the `:9101` app + health-check dependency — simplest, most robust for a static site.

### CI/CD — GitHub Actions workflow (`.github/workflows/deploy.yml`)
1. Trigger: push to `main`
2. Install Node 22 + pnpm; `pnpm install`
3. `pnpm run build` → `dist/`
4. `rsync -avz --delete dist/ codedrifter@192.168.1.65:/var/www/alfredoflores.dev/` via SSH key secret
5. Optional SSH step to `caddy reload` (only when Caddyfile changes — manual for v1)
6. Workflow secrets: `RPi_SSH_KEY` (ed25519), `RPi_HOST` (`192.168.1.65`)

### SSH key setup (one-time, manual)
- Generate a dedicated ed25519 key; add public key to `~/.ssh/authorized_keys` on RPi4 for `codedrifter`
- Add private key as a GitHub Actions secret
- Ensure `codedrifter` has write access to `/var/www/alfredoflores.dev/` (chown once)

### Caddyfile change steps (during implementation)
1. SSH to RPi4; `sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)`
2. Edit the `alfredoflores.dev` block → `file_server` shape
3. `sudo caddy validate --config /etc/caddy/Caddyfile`
4. `sudo systemctl reload caddy`
5. `curl -I http://alfredoflores.dev` to confirm 200

### Cloudflare Tunnel
No change needed — `cloudflared` already maps `alfredoflores.dev` to the Caddy origin. Only the Caddyfile origin config changes.

### Local dev
- `pnpm dev` → Astro dev server on `localhost:4321`
- `pnpm build && pnpm preview` → production preview

## §5 · Performance & SEO

### Performance strategy
- **Zero JS by default**: Astro static HTML + CSS. Target **0 KB JS** in v1. If the typewriter needs JS, it's a single inline `<script>` (<1KB), gated behind `prefers-reduced-motion`.
- **No web font**: system monospace stack — zero font bytes, no FOUT, no layout shift.
- **Inline critical CSS**: Astro handles; minimal stylesheet (~3-5KB gzipped from Tailwind v4 + tokens).
- **Images**: none in v1 (no photo). Optional architecture diagram is inline SVG (no request beyond HTML). `og:image` is a single branded SVG/PNG 1200×630 committed to `public/`.
- **Compression**: Caddy `encode zstd gzip`.
- **Caching**: `Cache-Control: public, max-age=31536000, immutable` for hashed assets; `no-cache` for `index.html` (deploys picked up). Astro emits hashed filenames automatically.
- **HTML minification**: Astro built-in.
- **Budget guard**: `pnpm run check:size` or a Lighthouse CI step in GitHub Actions that fails deploy if JS > 5KB or Lighthouse perf < 95.

### SEO & metadata
- `<title>`: "Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
- `<meta name="description">`: one-line hero positioning
- **Open Graph + Twitter cards**: `og:title`, `og:description`, `og:type=website`, `og:url=https://alfredoflores.dev`, `og:image`; Twitter `summary_large_image`
- **JSON-LD `Person` schema**: name, jobTitle, address (Durango, MX), sameAs (GitHub, LinkedIn, email). Inline in `<head>`.
- `robots.txt`: allow all, point to sitemap
- **Sitemap**: `@astrojs/sitemap` integration → `sitemap-index.xml` auto-generated, static
- **Canonical**: `<link rel="canonical" href="https://alfredoflores.dev/">`
- **Favicon**: small monospace-styled SVG (green `$_` on dark), tiny bytes

### Accessibility
- Semantic HTML (`<main>`, `<section>`, `<nav>`, `<footer>`, `<h1>`-`<h3>`)
- Color contrast: `--text` (#e6edf3) on `--bg` (#0b0e14) ~15:1 (AAA); `--text-dim` (#8b98a9) on bg ~5.7:1 (AA normal, AAA large) — used only for metadata/labels, never body
- Focus states: visible `--accent` outline on all interactive elements
- `prefers-reduced-motion`: disables typewriter, no transitions
- Dark-only for v1 (explicit colors, not system-derived, so renders correctly on forced-light)
- Links have discernible names; contact icons have `aria-label`

## Out of scope (v1)

- Blog / writing section (deferred to v2)
- "Now / currently" personal section (deferred to v2)
- Light theme toggle (v1 is dark-only)
- Live backend endpoints / healthz (static site; Shape A)
- Photo / portrait
- Comments, analytics (may add privacy-respecting analytics in v2)

## Open items (to resolve during implementation planning)

- Whether the typewriter hero is CSS-only or needs the <1KB inline JS (decide during build; prefer CSS-only)
- Exact og-image format (SVG vs PNG) — PNG has wider social-preview support; decide during build
- Whether to add the optional `// top` sticky anchor in the footer (trivial; decide during build)
