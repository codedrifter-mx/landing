# Alfredo Flores Portfolio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a terminal-inspired static portfolio for Alfredo Flores Garcia and deploy it to alfredoflores.dev via a self-hosted RPi4 (Cloudflare Tunnel + Caddy).

**Architecture:** Astro static export → Tailwind v4 (CSS-first `@theme` tokens) → zero JS. Content typed via Astro Content Collections (Markdown + Zod schemas). Deploy: GitHub Actions self-hosted runner on RPi4 builds and copies `dist/` to `/var/www/alfredoflores.dev/`, served by Caddy `file_server` behind a Cloudflare Tunnel.

**Tech Stack:** Astro 6, Tailwind CSS v4 (`@tailwindcss/vite`), `@astrojs/sitemap`, TypeScript (strict), Node 22+, npm.

**Spec:** `docs/superpowers/specs/2026-06-20-landing-portfolio-design.md`

**Tooling note:** The spec mentioned pnpm; pnpm is not installed. This plan uses **npm** (available on dev machine, Node 26). Commands are `npm install`, `npm run build`, `npm run check`.

---

## File Structure

```
package.json                    # deps + scripts
astro.config.mjs                # Astro config: site URL, sitemap, Tailwind vite plugin
tsconfig.json                   # strict TS config
src/
  content.config.ts             # Zod schemas for all content collections
  styles/global.css             # @import tailwindcss + @theme tokens + base styles
  layouts/Base.astro            # <html>, <head>, SEO, JSON-LD, global CSS import
  components/
    SectionHeader.astro         # "// section" comment motif
    Hero.astro                  # $ whoami prompt + name + positioning + contact links
    ExperienceItem.astro        # single role entry (role, dates, bullets)
    ProjectCard.astro           # single project card (name, desc, tags, github link)
    CaseStudy.astro             # Keycloak deep-dive panel (structured fields)
    ArchitectureDiagram.astro   # inline SVG: apps → gateway → keycloak + SPIs → ops
    SkillMatrix.astro           # config-file style key-value skill blocks
    TalkItem.astro              # single talk entry
    Contact.astro               # contact links + CTA line
    Footer.astro                # colophon line
  content/
    experience/dexcom.md
    experience/walmart.md
    experience/sc-computacion.md
    experience/magnimus.md
    projects/liveops.md
    projects/auto-servidores.md
    talks/itj-soft-skills.md
    talks/dgotechub-oauth.md
    case-study/keycloak-iam-migration.md
  pages/index.astro             # single page composing all sections
public/
  favicon.svg                   # green $_ on dark
  robots.txt                    # allow all + sitemap reference
scripts/generate-og-image.mjs   # sharp SVG→PNG for og-image
.github/workflows/deploy.yml    # self-hosted runner CI/CD
```

---

## Task 1: Scaffold Astro Project + Tailwind v4 + Design Tokens

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/styles/global.css`
- Create: `src/pages/index.astro`

- [ ] **Step 0: Update `.gitignore` for Astro project**

The existing `.gitignore` only has `.superpowers/`. Add Node/Astro build artifacts:

```text
.superpowers/
node_modules/
dist/
.astro/
```

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "alfredoflores-dev",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "astro": "astro",
    "og-image": "node scripts/generate-og-image.mjs"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install astro @astrojs/sitemap
npm install -D @astrojs/check typescript tailwindcss @tailwindcss/vite sharp
```

Expected: dependencies installed, `package-lock.json` created, `node_modules/` populated.

- [ ] **Step 3: Create `astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://alfredoflores.dev',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 5: Create `src/styles/global.css` with Tailwind v4 theme tokens**

```css
@import "tailwindcss";

@theme {
  --color-bg: #0b0e14;
  --color-surface: #11151f;
  --color-line: #1c2230;
  --color-ink: #e6edf3;
  --color-ink-dim: #8b98a9;
  --color-accent: #5bd1a0;
  --color-sky: #7dd3fc;

  --font-mono: ui-monospace, "JetBrains Mono", "Fira Code", SFMono, Menlo, Consolas, monospace;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.7;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

a {
  color: var(--color-sky);
  text-decoration: none;
  transition: color 0.15s ease;
}

a:hover {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

::selection {
  background: var(--color-accent);
  color: var(--color-bg);
}
```

- [ ] **Step 6: Create placeholder `src/pages/index.astro`**

```astro
---
import '../styles/global.css';
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Alfredo Flores Garcia — Software Engineer</title>
  </head>
  <body>
    <main>
      <h1>alfredoflores.dev</h1>
      <p>Scaffold working.</p>
    </main>
  </body>
</html>
```

- [ ] **Step 7: Verify build works**

Run:
```bash
npx astro sync && npm run build
```

Expected: build succeeds, `dist/index.html` created, no errors.

- [ ] **Step 8: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: dev server running on `http://localhost:4321`. Open it to confirm the placeholder renders. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src/
git commit -m "feat: scaffold astro project with tailwind v4 and design tokens"
```

---

## Task 2: Content Collections Schema + Content Files

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/experience/dexcom.md`
- Create: `src/content/experience/walmart.md`
- Create: `src/content/experience/sc-computacion.md`
- Create: `src/content/experience/magnimus.md`
- Create: `src/content/projects/liveops.md`
- Create: `src/content/projects/auto-servidores.md`
- Create: `src/content/talks/itj-soft-skills.md`
- Create: `src/content/talks/dgotechub-oauth.md`
- Create: `src/content/case-study/keycloak-iam-migration.md`

- [ ] **Step 1: Create `src/content.config.ts` with Zod schemas**

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    via: z.string().optional(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    order: z.number(),
    bullets: z.array(z.string()),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    subtitle: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    github: z.string().url(),
    role: z.string(),
    order: z.number(),
  }),
});

const talks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/talks' }),
  schema: z.object({
    title: z.string(),
    venue: z.string(),
    date: z.string(),
    audience: z.string(),
    order: z.number(),
  }),
});

const caseStudy = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-study' }),
  schema: z.object({
    title: z.string(),
    context: z.string(),
    approach: z.string(),
    built: z.array(z.string()),
    operations: z.string(),
    outcome: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { experience, projects, talks, caseStudy };
```

- [ ] **Step 2: Create `src/content/experience/dexcom.md`**

```markdown
---
role: Software Engineer
company: Dexcom
via: ITJ
location: "San Diego, CA (Remote)"
startDate: Aug. 2023
current: true
order: 0
bullets:
  - "Spearheaded migration from IdentityServer3 to **Keycloak** (OIDC/OAuth 2.0) via Strangler Fig pattern, ensuring backward compatibility for 20+ first-party applications in an **FDA-regulated** CGM ecosystem using **Kotlin** and **Spring Cloud Gateway (WebFlux)**."
  - "Implemented 7+ custom **Keycloak** SPIs in **Java** to enable Passkeys, WebAuthn, OTP, and complex MFA flows for applications serving **millions of CGM users**."
  - "Served as Tier-1 incident responder for auth services across **10 microservices** and **16 environments**, managing zero-downtime deployments with **Kubernetes/ArgoCD** and **Redis** cache strategies; drove production observability with **Datadog** to maintain SLA targets across healthcare-critical infrastructure."
  - "Actively training peers on **AI agentic development workflows** — Opencode, pi.dev, GitHub Copilot, skills, MCPs, commands, hooks, context engineering."
---
```

- [ ] **Step 3: Create `src/content/experience/walmart.md`**

```markdown
---
role: Big Data Engineer (Contract)
company: Walmart
via: AgileThought
location: "Mexico City, Mexico (Remote)"
startDate: Aug. 2022
endDate: Jan. 2023
order: 1
bullets:
  - "Architected ETL pipelines using **Azure Data Factory** and **Python** for high-volume retail analytics, reducing end-to-end processing time by **60%** across 100GB+ datasets."
  - "Integrated diverse data sources into centralized **Azure** data infrastructure, enabling self-service analytics for supply chain and pricing teams."
---
```

- [ ] **Step 4: Create `src/content/experience/sc-computacion.md`**

```markdown
---
role: Software Developer
company: SC Computacion
location: "Durango, Mexico"
startDate: Dec. 2020
endDate: Jun. 2021
order: 2
bullets:
  - "Engineered **Python** ETL scripts to migrate legacy DBF data into **PostgreSQL** and developed Mexican tax compliance logic in **C#/.NET**."
---
```

- [ ] **Step 5: Create `src/content/experience/magnimus.md`**

```markdown
---
role: Full Stack Developer
company: Magnimus Software
location: "Durango, Mexico"
startDate: Jul. 2019
endDate: Jun. 2020
order: 3
bullets:
  - "Built **CI/CD** pipelines with **GitHub Actions** (80%+ coverage) and integrated **Redis** caching to reduce API response times by **70%**."
---
```

- [ ] **Step 6: Create `src/content/projects/liveops.md`**

```markdown
---
name: LiveOps
subtitle: Agentic AI Incident Manager
description: "An A2UI (Agent-to-UI) incident response platform using CopilotKit and Gemini 2.0 Flash. AI agents generate dynamic remediation interfaces for NOC teams in real time via SSE, with context-driven prompts for agnostic agentic CLIs and a local MCP server in Markdown replacing cloud-based context tools under data privacy constraints."
tags:
  - CopilotKit
  - Gemini 2.0 Flash
  - SSE
  - MCP Server
  - A2UI
github: https://github.com/codedrifter-mx/LiveOps
role: Creator / Full-stack
order: 0
---
```

- [ ] **Step 7: Create `src/content/projects/auto-servidores.md`**

```markdown
---
name: auto-servidores
subtitle: Rust/Tauri Desktop App for Government API Queries
description: "A Tauri 2.0 desktop app in Rust with SQLite cache (SHA256 + WAL), adaptive rate limiting, and Excel reporting for bulk querying of Mexican public servant declarations. 3 releases published."
tags:
  - Rust
  - Tauri 2.0
  - SQLite
  - WAL
  - Rate Limiting
github: https://github.com/codedrifter-mx/auto-servidores
role: Creator / Full-stack
order: 1
---
```

- [ ] **Step 8: Create `src/content/talks/itj-soft-skills.md`**

```markdown
---
title: Mastering Soft Skills for Team Success
venue: ITJ Company-wide Tech Talk
date: May 2025
audience: 55+ engineers
order: 0
---
```

- [ ] **Step 9: Create `src/content/talks/dgotechub-oauth.md`**

```markdown
---
title: 101 OAuth & OpenID
venue: DgoTecHub Lightning Talks
date: Jan 2026
audience: 30+ engineers
order: 1
---
```

- [ ] **Step 10: Create `src/content/case-study/keycloak-iam-migration.md`**

```markdown
---
title: "IdentityServer3 \u2192 Keycloak \u00b7 Strangler Fig migration across 16 environments"
context: "FDA-regulated continuous glucose monitoring ecosystem serving millions of users. 20+ first-party applications depended on IdentityServer3 for auth. Zero-downtime was non-negotiable \u2014 healthcare-critical infrastructure where auth outages directly impact patient safety."
approach: "Applied the Strangler Fig pattern to incrementally replace IdentityServer3 with Keycloak (OIDC/OAuth 2.0). Spring Cloud Gateway (WebFlux, reactive) served as the routing layer that gradually shifted traffic from the legacy IdP to Keycloak, ensuring backward compatibility throughout the transition. Kotlin as the primary language."
built:
  - "Passkeys SPI \u2014 WebAuthn-based passwordless auth"
  - "WebAuthn SPI \u2014 device-bound credentials"
  - "OTP SPI \u2014 time-based one-time passwords"
  - "MFA orchestration SPI \u2014 complex multi-step flows"
  - "Custom claim mappers \u2014 legacy token compatibility"
  - "Custom authenticators \u2014 step-up auth flows"
  - "Event listeners \u2014 audit + Datadog integration"
operations: "10 microservices, 16 environments managed with Kubernetes/ArgoCD. Redis cache strategy for session and token stores. Zero-downtime deployments via rolling updates with health-gated rollouts. Datadog for production observability \u2014 traces, metrics, logs \u2014 maintaining SLA targets across healthcare-critical infrastructure."
outcome: "Millions of CGM users authenticating through the new Keycloak-based identity platform with zero downtime during migration. 7+ custom SPIs shipped. 20+ first-party applications migrated with full backward compatibility."
order: 0
---
```

- [ ] **Step 11: Verify content collections validate**

Run:
```bash
npx astro sync && npm run check
```

Expected: `astro check` passes with no errors, all content files validate against schemas. If any schema mismatch, fix the frontmatter to match the Zod schema.

- [ ] **Step 12: Commit**

```bash
git add src/content.config.ts src/content/
git commit -m "feat: add content collections schema and all content files"
```

---

## Task 3: Base Layout + SEO + SectionHeader

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/components/SectionHeader.astro`
- Create: `public/favicon.svg`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#0b0e14"/>
  <text x="6" y="22" font-family="ui-monospace,monospace" font-size="16" font-weight="bold" fill="#5bd1a0">$_</text>
</svg>
```

- [ ] **Step 2: Create `src/components/SectionHeader.astro`**

```astro
---
interface Props {
  label: string;
  id?: string;
}
const { label, id } = Astro.props;
---

<h2 class="section-header" id={id}>// {label}</h2>

<style>
  .section-header {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-accent);
    margin: 0 0 1.5rem 0;
    font-weight: 600;
  }
</style>
```

- [ ] **Step 3: Create `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalURL} />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content="/og-image.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content="/og-image.png" />

    <!-- JSON-LD Person -->
    <script type="application/ld+json" set:html={JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Alfredo Flores Garcia",
      "jobTitle": "Software Engineer",
      "email": "mailto:alfredofloresgarcia156@gmail.com",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Durango",
        "addressCountry": "MX"
      },
      "sameAs": [
        "https://github.com/codedrifter-mx",
        "https://www.linkedin.com/in/alfredo-flores-mx"
      ]
    })} />
  </head>
  <body>
    <main class="mx-auto max-w-[42rem] px-5 py-16 sm:py-24">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 4: Update `src/pages/index.astro` to use Base layout**

```astro
---
import Base from '../layouts/Base.astro';
import SectionHeader from '../components/SectionHeader.astro';
---

<Base
  title="Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
  description="Software Engineer with 5+ years architecting identity and auth systems at scale. Keycloak, OAuth 2.0, Kubernetes, AI-augmented development."
>
  <SectionHeader label="whoami" />
  <p>Layout + SEO working. Content sections coming next.</p>
</Base>
```

- [ ] **Step 5: Verify build + check**

Run:
```bash
npm run check && npm run build
```

Expected: type check passes, build succeeds. Open `dist/index.html` and confirm `<title>`, `<meta name="description">`, `og:` tags, `twitter:` tags, and JSON-LD `<script>` are present in `<head>`.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/ src/components/SectionHeader.astro src/pages/index.astro public/favicon.svg
git commit -m "feat: add base layout with SEO metadata, JSON-LD, and section header"
```

---

## Task 4: Hero Section

**Files:**
- Create: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `src/components/Hero.astro`**

```astro
---
---

<section class="hero">
  <p class="prompt">$ whoami</p>
  <h1 class="name">Alfredo Flores Garcia</h1>
  <p class="tagline">Software Engineer &middot; IAM / Keycloak &middot; Dexcom</p>
  <p class="location">Durango, Mexico &mdash; Remote</p>
  <nav class="contact-links" aria-label="Contact links">
    <a href="https://github.com/codedrifter-mx" rel="noopener noreferrer" target="_blank">github</a>
    <span class="sep">/</span>
    <a href="https://www.linkedin.com/in/alfredo-flores-mx" rel="noopener noreferrer" target="_blank">linkedin</a>
    <span class="sep">/</span>
    <a href="mailto:alfredofloresgarcia156@gmail.com">email</a>
  </nav>
</section>

<style>
  .hero {
    padding: 2rem 0 3rem;
  }
  .prompt {
    color: var(--color-accent);
    font-size: 0.9rem;
    margin: 0 0 0.5rem 0;
  }
  .name {
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-ink);
    margin: 0 0 0.5rem 0;
    line-height: 1.2;
  }
  .tagline {
    color: var(--color-ink);
    font-size: 0.95rem;
    margin: 0 0 0.25rem 0;
  }
  .location {
    color: var(--color-ink-dim);
    font-size: 0.85rem;
    margin: 0 0 1.5rem 0;
  }
  .contact-links {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.9rem;
    flex-wrap: wrap;
  }
  .contact-links a {
    color: var(--color-sky);
  }
  .contact-links a:hover {
    color: var(--color-accent);
  }
  .sep {
    color: var(--color-ink-dim);
  }
</style>
```

- [ ] **Step 2: Update `src/pages/index.astro` to include Hero**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHeader from '../components/SectionHeader.astro';
---

<Base
  title="Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
  description="Software Engineer with 5+ years architecting identity and auth systems at scale. Keycloak, OAuth 2.0, Kubernetes, AI-augmented development."
>
  <Hero />
  <SectionHeader label="experience" />
  <p>Hero working. More sections coming.</p>
</Base>
```

- [ ] **Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: build succeeds. Run `npm run dev`, open `http://localhost:4321`, confirm the `$ whoami` prompt, name, tagline, location, and three contact links render. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/Hero.astro src/pages/index.astro
git commit -m "feat: add hero section with whoami prompt and contact links"
```

---

## Task 5: Experience Timeline

**Files:**
- Create: `src/components/ExperienceItem.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `src/components/ExperienceItem.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'experience'>;
}

const { entry } = Astro.props;
const { role, company, via, location, startDate, endDate, current, bullets } = entry.data;
const dateRange = current ? `${startDate} — present` : `${startDate} — ${endDate}`;
const companyLabel = via ? `${company} (via ${via})` : company;
---

<article class="experience-item">
  <div class="item-header">
    <div>
      <span class="role">{role}</span>
      <span class="sep"> &middot; </span>
      <span class="company">{companyLabel}</span>
    </div>
    <span class="dates">{dateRange}</span>
  </div>
  <p class="location">{location}</p>
  <ul class="bullets">
    {bullets.map((bullet) => <li set:html={bullet} />)}
  </ul>
</article>

<style>
  .experience-item {
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-line);
  }
  .experience-item:last-child {
    border-bottom: none;
  }
  .item-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .role {
    font-weight: 700;
    color: var(--color-ink);
  }
  .company {
    color: var(--color-ink);
  }
  .sep {
    color: var(--color-ink-dim);
  }
  .dates {
    color: var(--color-ink-dim);
    font-size: 0.8rem;
    white-space: nowrap;
  }
  .location {
    color: var(--color-ink-dim);
    font-size: 0.8rem;
    margin: 0.25rem 0 0.5rem 0;
  }
  .bullets {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .bullets li {
    padding: 0.25rem 0 0.25rem 1rem;
    position: relative;
    color: var(--color-ink);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .bullets li::before {
    content: '$';
    position: absolute;
    left: 0;
    color: var(--color-accent);
  }
  .bullets :global(strong) {
    color: var(--color-accent);
    font-weight: 600;
  }
</style>
```

- [ ] **Step 2: Update `src/pages/index.astro` to render experience**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHeader from '../components/SectionHeader.astro';
import ExperienceItem from '../components/ExperienceItem.astro';
import { getCollection } from 'astro:content';

const experience = (await getCollection('experience')).sort((a, b) => a.data.order - b.data.order);
---

<Base
  title="Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
  description="Software Engineer with 5+ years architecting identity and auth systems at scale. Keycloak, OAuth 2.0, Kubernetes, AI-augmented development."
>
  <Hero />

  <section>
    <SectionHeader label="experience" />
    {experience.map((entry) => <ExperienceItem entry={entry} />)}
  </section>
</Base>
```

- [ ] **Step 3: Verify build + check**

Run:
```bash
npm run check && npm run build
```

Expected: type check passes, build succeeds. Run `npm run dev`, confirm all four experience entries render in order (Dexcom, Walmart, SC Computacion, Magnimus) with role, company, dates, location, and bullet items. Bold text in bullets should appear in accent green. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ExperienceItem.astro src/pages/index.astro
git commit -m "feat: add experience timeline with content collection rendering"
```

---

## Task 6: Projects Showcase

**Files:**
- Create: `src/components/ProjectCard.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `src/components/ProjectCard.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'projects'>;
}

const { entry } = Astro.props;
const { name, subtitle, description, tags, github, role } = entry.data;
---

<article class="project-card">
  <h3 class="name">{name}</h3>
  <p class="subtitle">{subtitle}</p>
  <p class="description">{description}</p>
  <div class="tags">
    {tags.map((tag) => <span class="tag">{tag}</span>)}
  </div>
  <div class="card-footer">
    <a href={github} rel="noopener noreferrer" target="_blank">&rarr; github</a>
    <span class="role">{role}</span>
  </div>
</article>

<style>
  .project-card {
    background: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-ink);
    margin: 0 0 0.25rem 0;
  }
  .subtitle {
    color: var(--color-accent);
    font-size: 0.85rem;
    margin: 0 0 0.75rem 0;
  }
  .description {
    color: var(--color-ink);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 0.75rem 0;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .tag {
    color: var(--color-sky);
    font-size: 0.75rem;
    border: 1px solid var(--color-line);
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
  }
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }
  .card-footer a {
    color: var(--color-sky);
  }
  .card-footer a:hover {
    color: var(--color-accent);
  }
  .role {
    color: var(--color-ink-dim);
  }
</style>
```

- [ ] **Step 2: Update `src/pages/index.astro` to render projects**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHeader from '../components/SectionHeader.astro';
import ExperienceItem from '../components/ExperienceItem.astro';
import ProjectCard from '../components/ProjectCard.astro';
import { getCollection } from 'astro:content';

const experience = (await getCollection('experience')).sort((a, b) => a.data.order - b.data.order);
const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
---

<Base
  title="Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
  description="Software Engineer with 5+ years architecting identity and auth systems at scale. Keycloak, OAuth 2.0, Kubernetes, AI-augmented development."
>
  <Hero />

  <section>
    <SectionHeader label="experience" />
    {experience.map((entry) => <ExperienceItem entry={entry} />)}
  </section>

  <section class="mt-16">
    <SectionHeader label="projects" />
    {projects.map((entry) => <ProjectCard entry={entry} />)}
  </section>
</Base>
```

- [ ] **Step 3: Verify build**

Run:
```bash
npm run check && npm run build
```

Expected: type check passes, build succeeds. Run `npm run dev`, confirm both project cards (LiveOps, auto-servidores) render with name, subtitle, description, tech tags, and GitHub links. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectCard.astro src/pages/index.astro
git commit -m "feat: add projects showcase with card layout and tech tags"
```

---

## Task 7: Case Study + Architecture Diagram

**Files:**
- Create: `src/components/ArchitectureDiagram.astro`
- Create: `src/components/CaseStudy.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `src/components/ArchitectureDiagram.astro`**

```astro
---
---

<figure class="diagram">
  <svg viewBox="0 0 600 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Architecture diagram: 20+ apps route through Spring Cloud Gateway to Keycloak with 7 custom SPIs, backed by Kubernetes, ArgoCD, Redis, and Datadog">
    <!-- 20+ Apps -->
    <rect x="10" y="20" width="120" height="40" rx="6" fill="#11151f" stroke="#1c2230" stroke-width="1"/>
    <text x="70" y="45" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" fill="#e6edf3">20+ Apps</text>

    <!-- Arrow -->
    <line x1="130" y1="40" x2="175" y2="40" stroke="#5bd1a0" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Spring Cloud Gateway -->
    <rect x="180" y="20" width="140" height="40" rx="6" fill="#11151f" stroke="#5bd1a0" stroke-width="1"/>
    <text x="250" y="38" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="#5bd1a0">Spring Cloud</text>
    <text x="250" y="52" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="#5bd1a0">Gateway (WebFlux)</text>

    <!-- Arrow -->
    <line x1="320" y1="40" x2="365" y2="40" stroke="#5bd1a0" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Keycloak -->
    <rect x="370" y="20" width="100" height="40" rx="6" fill="#11151f" stroke="#5bd1a0" stroke-width="1"/>
    <text x="420" y="45" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" fill="#e6edf3">Keycloak</text>

    <!-- 7 SPIs -->
    <rect x="370" y="80" width="100" height="100" rx="6" fill="#11151f" stroke="#1c2230" stroke-width="1"/>
    <text x="420" y="98" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" fill="#7dd3fc">7+ Custom SPIs</text>
    <text x="380" y="115" font-family="ui-monospace,monospace" font-size="8" fill="#8b98a9">Passkeys</text>
    <text x="380" y="130" font-family="ui-monospace,monospace" font-size="8" fill="#8b98a9">WebAuthn</text>
    <text x="380" y="145" font-family="ui-monospace,monospace" font-size="8" fill="#8b98a9">OTP</text>
    <text x="380" y="160" font-family="ui-monospace,monospace" font-size="8" fill="#8b98a9">MFA flows</text>
    <text x="380" y="175" font-family="ui-monospace,monospace" font-size="8" fill="#8b98a9">Claim mappers</text>

    <!-- Line from Keycloak to SPIs -->
    <line x1="420" y1="60" x2="420" y2="80" stroke="#1c2230" stroke-width="1"/>

    <!-- Ops layer -->
    <rect x="50" y="210" width="500" height="40" rx="6" fill="#11151f" stroke="#1c2230" stroke-width="1"/>
    <text x="300" y="235" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="#8b98a9">K8s / ArgoCD &middot; Redis &middot; Datadog &middot; 16 environments</text>

    <!-- Arrow defs -->
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#5bd1a0"/>
      </marker>
    </defs>
  </svg>
</figure>

<style>
  .diagram {
    margin: 1rem 0;
    overflow-x: auto;
  }
  .diagram svg {
    width: 100%;
    max-width: 600px;
    height: auto;
  }
</style>
```

- [ ] **Step 2: Create `src/components/CaseStudy.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import ArchitectureDiagram from './ArchitectureDiagram.astro';

interface Props {
  entry: CollectionEntry<'caseStudy'>;
}

const { entry } = Astro.props;
const { title, context, approach, built, operations, outcome } = entry.data;
---

<section class="case-study">
  <h3 class="title">{title}</h3>

  <div class="field">
    <span class="label">context</span>
    <p class="value">{context}</p>
  </div>

  <div class="field">
    <span class="label">approach</span>
    <p class="value">{approach}</p>
  </div>

  <div class="field">
    <span class="label">built</span>
    <ul class="built-list">
      {built.map((item) => <li>{item}</li>)}
    </ul>
  </div>

  <ArchitectureDiagram />

  <div class="field">
    <span class="label">operations</span>
    <p class="value">{operations}</p>
  </div>

  <div class="field">
    <span class="label">outcome</span>
    <p class="value outcome">{outcome}</p>
  </div>
</section>

<style>
  .case-study {
    background: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 1.5rem;
  }
  .title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-ink);
    margin: 0 0 1rem 0;
    line-height: 1.4;
  }
  .field {
    margin-bottom: 1rem;
  }
  .label {
    display: block;
    color: var(--color-accent);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.25rem;
  }
  .value {
    color: var(--color-ink);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }
  .outcome {
    color: var(--color-accent);
  }
  .built-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .built-list li {
    padding: 0.2rem 0 0.2rem 1rem;
    position: relative;
    color: var(--color-ink);
    font-size: 0.85rem;
  }
  .built-list li::before {
    content: '$';
    position: absolute;
    left: 0;
    color: var(--color-accent);
  }
</style>
```

- [ ] **Step 3: Update `src/pages/index.astro` to render case study**

Add the `CaseStudy` import and section. The full `index.astro` at this point:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHeader from '../components/SectionHeader.astro';
import ExperienceItem from '../components/ExperienceItem.astro';
import ProjectCard from '../components/ProjectCard.astro';
import CaseStudy from '../components/CaseStudy.astro';
import { getEntry } from 'astro:content';
import { getCollection } from 'astro:content';

const experience = (await getCollection('experience')).sort((a, b) => a.data.order - b.data.order);
const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
const caseStudyEntry = await getEntry('caseStudy', 'keycloak-iam-migration');
---

<Base
  title="Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
  description="Software Engineer with 5+ years architecting identity and auth systems at scale. Keycloak, OAuth 2.0, Kubernetes, AI-augmented development."
>
  <Hero />

  <section>
    <SectionHeader label="experience" />
    {experience.map((entry) => <ExperienceItem entry={entry} />)}
  </section>

  <section class="mt-16">
    <SectionHeader label="projects" />
    {projects.map((entry) => <ProjectCard entry={entry} />)}
  </section>

  <section class="mt-16">
    <SectionHeader label="case-study" />
    {caseStudyEntry && <CaseStudy entry={caseStudyEntry} />}
  </section>
</Base>
```

- [ ] **Step 4: Verify build + check**

Run:
```bash
npm run check && npm run build
```

Expected: type check passes, build succeeds. Run `npm run dev`, confirm the case study panel renders with title, context, approach, built list (7 SPIs with `$` bullet markers), architecture diagram SVG, operations, and outcome (in accent green). Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ArchitectureDiagram.astro src/components/CaseStudy.astro src/pages/index.astro
git commit -m "feat: add keycloak IAM case study with architecture diagram"
```

---

## Task 8: Skills, Talks, Contact, Footer

**Files:**
- Create: `src/components/SkillMatrix.astro`
- Create: `src/components/TalkItem.astro`
- Create: `src/components/Contact.astro`
- Create: `src/components/Footer.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create `src/components/SkillMatrix.astro`**

```astro
---
const skills = [
  { label: 'languages', values: 'kotlin \u00b7 java \u00b7 rust \u00b7 python \u00b7 typescript \u00b7 sql' },
  { label: 'backend',   values: 'spring boot \u00b7 express.js \u00b7 reactor / rxjava' },
  { label: 'frontend',  values: 'react \u00b7 next.js \u00b7 tailwind' },
  { label: 'cloud',     values: 'aws \u00b7 gcp \u00b7 k8s \u00b7 docker \u00b7 argocd \u00b7 terraform \u00b7 gh-actions' },
  { label: 'auth',      values: 'keycloak \u00b7 oauth 2.1 \u00b7 oidc \u00b7 webauthn \u00b7 passkeys \u00b7 mfa' },
  { label: 'ai',        values: 'copilotkit \u00b7 mcp servers \u00b7 llm integration \u00b7 prompt eng' },
];
---

<div class="skill-matrix">
  {skills.map((row) => (
    <div class="skill-row">
      <span class="skill-label">{row.label}</span>
      <span class="skill-values">{row.values}</span>
    </div>
  ))}
</div>

<style>
  .skill-matrix {
    font-size: 0.85rem;
    line-height: 1.8;
  }
  .skill-row {
    display: flex;
    gap: 1rem;
  }
  .skill-label {
    color: var(--color-ink-dim);
    min-width: 5rem;
    flex-shrink: 0;
  }
  .skill-values {
    color: var(--color-ink);
  }
</style>
```

- [ ] **Step 2: Create `src/components/TalkItem.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  entry: CollectionEntry<'talks'>;
}

const { entry } = Astro.props;
const { title, venue, date, audience } = entry.data;
---

<article class="talk-item">
  <div class="talk-header">
    <span class="title">{title}</span>
    <span class="date">{date}</span>
  </div>
  <p class="meta">{venue} &middot; {audience}</p>
</article>

<style>
  .talk-item {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-line);
  }
  .talk-item:last-child {
    border-bottom: none;
  }
  .talk-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .title {
    color: var(--color-ink);
    font-weight: 600;
  }
  .date {
    color: var(--color-ink-dim);
    font-size: 0.8rem;
    white-space: nowrap;
  }
  .meta {
    color: var(--color-ink-dim);
    font-size: 0.8rem;
    margin: 0.25rem 0 0 0;
  }
</style>
```

- [ ] **Step 3: Create `src/components/Contact.astro`**

```astro
---

---

<section class="contact">
  <nav class="contact-links" aria-label="Contact links">
    <a href="https://github.com/codedrifter-mx" rel="noopener noreferrer" target="_blank">github</a>
    <span class="sep">/</span>
    <a href="https://www.linkedin.com/in/alfredo-flores-mx" rel="noopener noreferrer" target="_blank">linkedin</a>
    <span class="sep">/</span>
    <a href="mailto:alfredofloresgarcia156@gmail.com">email</a>
  </nav>
  <p class="cta">Open to senior backend / IAM / platform roles. Let&rsquo;s talk.</p>
</section>

<style>
  .contact-links {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.9rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .contact-links a {
    color: var(--color-sky);
  }
  .contact-links a:hover {
    color: var(--color-accent);
  }
  .sep {
    color: var(--color-ink-dim);
  }
  .cta {
    color: var(--color-ink);
    font-size: 0.9rem;
    margin: 0;
  }
</style>
```

- [ ] **Step 4: Create `src/components/Footer.astro`**

```astro
---

---

<footer class="footer">
  <p class="colophon">
    self-hosted on raspberry pi 4 &middot; cloudflare tunnel &middot; caddy &middot; astro static
  </p>
  <p class="copyright">&copy; 2026 alfredo flores</p>
</footer>

<style>
  .footer {
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-line);
  }
  .colophon {
    color: var(--color-ink-dim);
    font-size: 0.75rem;
    margin: 0 0 0.25rem 0;
  }
  .copyright {
    color: var(--color-ink-dim);
    font-size: 0.75rem;
    margin: 0;
  }
</style>
```

- [ ] **Step 5: Update `src/pages/index.astro` with all remaining sections**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import SectionHeader from '../components/SectionHeader.astro';
import ExperienceItem from '../components/ExperienceItem.astro';
import ProjectCard from '../components/ProjectCard.astro';
import CaseStudy from '../components/CaseStudy.astro';
import SkillMatrix from '../components/SkillMatrix.astro';
import TalkItem from '../components/TalkItem.astro';
import Contact from '../components/Contact.astro';
import Footer from '../components/Footer.astro';
import { getCollection, getEntry } from 'astro:content';

const experience = (await getCollection('experience')).sort((a, b) => a.data.order - b.data.order);
const projects = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
const talks = (await getCollection('talks')).sort((a, b) => a.data.order - b.data.order);
const caseStudyEntry = await getEntry('caseStudy', 'keycloak-iam-migration');
---

<Base
  title="Alfredo Flores Garcia — Software Engineer (IAM / Keycloak)"
  description="Software Engineer with 5+ years architecting identity and auth systems at scale. Keycloak, OAuth 2.0, Kubernetes, AI-augmented development."
>
  <Hero />

  <section>
    <SectionHeader label="experience" />
    {experience.map((entry) => <ExperienceItem entry={entry} />)}
  </section>

  <section class="mt-16">
    <SectionHeader label="projects" />
    {projects.map((entry) => <ProjectCard entry={entry} />)}
  </section>

  <section class="mt-16">
    <SectionHeader label="case-study" />
    {caseStudyEntry && <CaseStudy entry={caseStudyEntry} />}
  </section>

  <section class="mt-16">
    <SectionHeader label="stack" />
    <SkillMatrix />
  </section>

  <section class="mt-16">
    <SectionHeader label="talks" />
    {talks.map((entry) => <TalkItem entry={entry} />)}
  </section>

  <section class="mt-16">
    <SectionHeader label="contact" />
    <Contact />
  </section>

  <Footer />
</Base>
```

- [ ] **Step 6: Verify build + check**

Run:
```bash
npm run check && npm run build
```

Expected: type check passes, build succeeds. Run `npm run dev`, confirm all eight sections render: whoami (hero), experience, projects, case-study, stack, talks, contact, footer. The skill matrix should render as config-file style key-value rows. The footer should show the colophon line. Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/SkillMatrix.astro src/components/TalkItem.astro src/components/Contact.astro src/components/Footer.astro src/pages/index.astro
git commit -m "feat: add skills, talks, contact, and footer sections"
```

---

## Task 9: Index Page Assembly + Full Build Verification

**Files:**
- Modify: `src/layouts/Base.astro` (add section spacing utility class)

The page is already assembled in Task 8. This task verifies the full build, checks for zero JS, and validates the HTML output.

- [ ] **Step 1: Add section spacing CSS to `src/styles/global.css`**

Add these rules at the end of `src/styles/global.css` (after the existing `::selection` rule):

```css
section {
  margin-top: 4rem;
}

@media (max-width: 640px) {
  section {
    margin-top: 2.5rem;
  }
}
```

- [ ] **Step 2: Full clean build**

Run:
```bash
rm -rf dist .astro && npm run check && npm run build
```

Expected: type check passes, build succeeds, `dist/index.html` and `dist/sitemap-index.xml` created.

- [ ] **Step 3: Verify zero JS shipped**

Run:
```bash
grep -c '<script' dist/index.html
```

Expected: `0` (or only the JSON-LD `<script type="application/ld+json">` which is data, not executable JS — if it shows `1`, check it's the JSON-LD one, which is correct and not executable).

- [ ] **Step 4: Verify key content present in built HTML**

Run:
```bash
grep -o 'Alfredo Flores Garcia' dist/index.html | head -1
grep -o 'Keycloak' dist/index.html | head -1
grep -o 'alfredoflores.dev' dist/index.html | head -1
```

Expected: all three return at least one match.

- [ ] **Step 5: Run dev server for visual review**

Run:
```bash
npm run dev
```

Expected: open `http://localhost:4321`, visually confirm all sections render correctly: terminal-inspired dark theme, monospace font, `// section` headers in green, `$ whoami` hero prompt, experience timeline, project cards, case study panel with architecture diagram, skill matrix, talks, contact, footer. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add section spacing and verify full build with zero JS"
```

---

## Task 10: Performance Polish — OG Image, Robots, Sitemap

**Files:**
- Create: `scripts/generate-og-image.mjs`
- Create: `public/robots.txt`
- Run: og-image generation script

- [ ] **Step 1: Create `scripts/generate-og-image.mjs`**

```javascript
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0b0e14"/>
  <text x="80" y="200" font-family="ui-monospace,monospace" font-size="28" fill="#5bd1a0">$ whoami</text>
  <text x="80" y="290" font-family="ui-monospace,monospace" font-size="56" font-weight="bold" fill="#e6edf3">Alfredo Flores Garcia</text>
  <text x="80" y="340" font-family="ui-monospace,monospace" font-size="28" fill="#8b98a9">Software Engineer &#183; IAM / Keycloak</text>
  <text x="80" y="560" font-family="ui-monospace,monospace" font-size="20" fill="#5bd1a0">alfredoflores.dev</text>
</svg>`;

const outPath = 'public/og-image.png';
mkdirSync(dirname(outPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log(`Generated ${outPath}`);
```

- [ ] **Step 2: Generate the OG image**

Run:
```bash
npm run og-image
```

Expected: `Generated public/og-image.png` printed, `public/og-image.png` file exists.

- [ ] **Step 3: Create `public/robots.txt`**

```text
User-agent: *
Allow: /

Sitemap: https://alfredoflores.dev/sitemap-index.xml
```

- [ ] **Step 4: Verify sitemap is generated on build**

Run:
```bash
npm run build && cat dist/sitemap-index.xml
```

Expected: sitemap-index.xml exists and contains a reference to `sitemap-0.xml`. Run `cat dist/sitemap-0.xml` to confirm it lists `https://alfredoflores.dev/`.

- [ ] **Step 5: Verify og-image and robots are in dist**

Run:
```bash
ls -la dist/og-image.png dist/robots.txt dist/favicon.svg
```

Expected: all three files exist in `dist/`.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-og-image.mjs public/og-image.png public/robots.txt
git commit -m "feat: add og-image, robots.txt, and verify sitemap generation"
```

---

## Task 11: RPi4 Deployment — Caddy + Webroot

**Files:**
- No repo files created (RPi4 server configuration)
- Reference: current Caddyfile backed up and updated on RPi4

- [ ] **Step 1: SSH to RPi4 and create the webroot directory**

Run:
```bash
ssh codedrifter@192.168.1.65 'sudo mkdir -p /var/www/alfredoflores.dev && sudo chown codedrifter:codedrifter /var/www/alfredoflores.dev && ls -la /var/www/alfredoflores.dev'
```

Expected: directory exists, owned by `codedrifter:codedrifter`.

- [ ] **Step 2: Back up the current Caddyfile**

Run:
```bash
ssh codedrifter@192.168.1.65 'sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%F)-landing && ls -la /etc/caddy/Caddyfile.bak-*'
```

Expected: backup file created.

- [ ] **Step 3: Write the new Caddyfile**

Run this command to replace the `alfredoflores.dev` block in the Caddyfile. The global block stays unchanged. The full new Caddyfile:

```bash
ssh codedrifter@192.168.1.65 'cat /etc/caddy/Caddyfile'
```

Review the current content. Then write the updated Caddyfile:

```bash
ssh codedrifter@192.168.1.65 'sudo tee /etc/caddy/Caddyfile > /dev/null << '\''CADDYEOF'\''
{
    admin 127.0.0.1:2019
    auto_https off
    default_bind 127.0.0.1
}

import /etc/caddy/conf.d/*.caddy

http://alfredoflores.dev {
    root * /var/www/alfredoflores.dev
    encode zstd gzip
    file_server
    try_files {path} /index.html
    header Cache-Control "public, max-age=3600"
}
CADDYEOF'
```

Expected: Caddyfile written successfully.

- [ ] **Step 4: Validate the Caddyfile**

Run:
```bash
ssh codedrifter@192.168.1.65 'sudo caddy validate --config /etc/caddy/Caddyfile'
```

Expected: `valid configuration` with no errors.

- [ ] **Step 5: Reload Caddy**

Run:
```bash
ssh codedrifter@192.168.1.65 'sudo systemctl reload caddy && systemctl status caddy | head -5'
```

Expected: `active (running)` status, reload succeeds.

- [ ] **Step 6: Deploy a test file to verify Caddy serves it**

Run:
```bash
ssh codedrifter@192.168.1.65 'echo "<h1>alfredoflores.dev deploy test</h1>" > /var/www/alfredoflores.dev/index.html'
ssh codedrifter@192.168.1.65 'curl -s http://127.0.0.1/ -H "Host: alfredoflores.dev"'
```

Expected: `<h1>alfredoflores.dev deploy test</h1>` returned. (Caddy is bound to 127.0.0.1; we pass the Host header to match the site block.)

- [ ] **Step 7: Verify externally via the Cloudflare Tunnel**

Run:
```bash
curl -I https://alfredoflores.dev
```

Expected: `HTTP/2 200` with `server: cloudflare` header. If this fails, the Cloudflare Tunnel DNS/route may need to point `alfredoflores.dev` to the Caddy origin. Check the cloudflared config on the RPi4.

- [ ] **Step 8: Clean up the test file**

Run:
```bash
ssh codedrifter@192.168.1.65 'rm /var/www/alfredoflores.dev/index.html'
```

Expected: test file removed. The real site will be deployed in Task 13.

---

## Task 12: GitHub Actions CI/CD — Self-Hosted Runner

**Files:**
- Create: `.github/workflows/deploy.yml`

The RPi4 is on a private network (192.168.1.65). GitHub hosted runners cannot reach it. Solution: install a self-hosted runner on the RPi4 that builds and deploys locally.

- [ ] **Step 1: Install Node on RPi4 via pacman**

Arch Linux ARM has Node 26 in the repos. Install system-wide so the runner service has it in PATH:

Run:
```bash
ssh codedrifter@192.168.1.65 'sudo pacman -S --noconfirm nodejs npm && node --version && npm --version'
```

Expected: `v26.x.x` and `11.x.x` printed. Node is now in `/usr/bin/` available to all processes including the runner service.

- [ ] **Step 2: Download and configure GitHub Actions runner on RPi4**

Go to `https://github.com/codedrifter-mx/landing/settings/actions/runners/new` in a browser. Copy the registration token. Then run:

```bash
ssh codedrifter@192.168.1.65 'mkdir -p ~/actions-runner && cd ~/actions-runner && curl -o actions-runner-linux-arm64-3.0.0.tar.gz -L https://github.com/actions/runner/releases/download/v3.0.0/actions-runner-linux-arm64-3.0.0.tar.gz && tar xzf actions-runner-linux-arm64-3.0.0.tar.gz'
```

Then configure the runner (replace `<TOKEN>` with the token from the GitHub page):

```bash
ssh codedrifter@192.168.1.65 'cd ~/actions-runner && ./config.sh --url https://github.com/codedrifter-mx/landing --token <TOKEN> --name rpi4 --labels self-hosted,linux,arm64'
```

Expected: runner configured successfully. (The exact runner version URL may differ — check `https://github.com/actions/runner/releases` for the latest Linux ARM64 tarball and update the URL accordingly.)

- [ ] **Step 3: Install and start the runner as a systemd service**

Run:
```bash
ssh codedrifter@192.168.1.65 'cd ~/actions-runner && sudo ./svc.sh install codedrifter && sudo ./svc.sh start && sudo ./svc.sh status'
```

Expected: service installed and running. Verify on GitHub: `https://github.com/codedrifter-mx/landing/settings/actions/runners` — the `rpi4` runner should show as "Idle" (green).

- [ ] **Step 4: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run check

      - name: Build
        run: npm run build

      - name: Generate OG image
        run: npm run og-image

      - name: Deploy to webroot
        run: |
          rsync -avz --delete dist/ /var/www/alfredoflores.dev/

      - name: Verify deploy
        run: |
          curl -s http://127.0.0.1/ -H "Host: alfredoflores.dev" | grep -q "Alfredo Flores Garcia" && echo "Deploy verified" || (echo "Deploy verification failed" && exit 1)
```

- [ ] **Step 5: Commit the workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add self-hosted GitHub Actions deploy workflow for RPi4"
```

- [ ] **Step 6: Push and verify the first automated deploy**

Run:
```bash
git push origin main
```

Expected: push triggers the workflow. Monitor at `https://github.com/codedrifter-mx/landing/actions`. The `rpi4` runner picks up the job. All steps pass: checkout, install, check, build, og-image, deploy, verify. The "Verify deploy" step prints "Deploy verified".

If `npm ci` fails because there's no `package-lock.json` committed yet, run `npm install` locally first, commit the lock file, and push again:

```bash
git add package-lock.json && git commit -m "chore: add package-lock.json" && git push origin main
```

---

## Task 13: Final End-to-End Verification

- [ ] **Step 1: Verify the live site responds**

Run:
```bash
curl -I https://alfredoflores.dev
```

Expected: `HTTP/2 200`, `content-type: text/html`, `server: cloudflare`.

- [ ] **Step 2: Verify key content on the live site**

Run:
```bash
curl -s https://alfredoflores.dev | grep -o 'Alfredo Flores Garcia' | head -1
curl -s https://alfredoflores.dev | grep -o 'Keycloak' | head -1
curl -s https://alfredoflores.dev | grep -o 'case-study' | head -1
```

Expected: all three return at least one match.

- [ ] **Step 3: Verify static assets are served**

Run:
```bash
curl -I https://alfredoflores.dev/favicon.svg
curl -I https://alfredoflores.dev/og-image.png
curl -I https://alfredoflores.dev/robots.txt
curl -I https://alfredoflores.dev/sitemap-index.xml
```

Expected: all return `HTTP/2 200`.

- [ ] **Step 4: Run Lighthouse audit**

Run (if Chrome is available locally):
```bash
npx lighthouse https://alfredoflores.dev --output=html --output-path=./lighthouse-report.html --view
```

Expected: Performance 95+, Accessibility 95+, Best Practices 95+, SEO 95+. If any score is below 90, inspect the report and fix issues (likely candidates: missing alt text, contrast ratios, unused CSS).

If `npx lighthouse` is not available, use Chrome DevTools → Lighthouse tab on `https://alfredoflores.dev` and run the audit manually.

- [ ] **Step 5: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix: address lighthouse audit findings" || echo "No fixes needed"
git push origin main
```

Expected: either a fix commit pushed (triggers redeploy) or "No fixes needed" printed.

---

## Summary

| Task | What it delivers |
|------|-----------------|
| 1 | Astro project + Tailwind v4 + design tokens |
| 2 | Content collections schema + all resume content as typed Markdown |
| 3 | Base layout with full SEO (OG, Twitter, JSON-LD, sitemap) + SectionHeader |
| 4 | Hero with `$ whoami` prompt + contact links |
| 5 | Experience timeline (4 roles, impact metrics) |
| 6 | Projects showcase (2 project cards with tech tags) |
| 7 | Keycloak IAM case study + inline SVG architecture diagram |
| 8 | Skills matrix, talks, contact, footer colophon |
| 9 | Full page assembly + zero-JS verification |
| 10 | OG image generation, robots.txt, sitemap verification |
| 11 | RPi4 Caddy `file_server` config + webroot setup |
| 12 | Self-hosted GitHub Actions runner + deploy workflow |
| 13 | End-to-end live site verification + Lighthouse audit |
