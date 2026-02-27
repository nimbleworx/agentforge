# AgentForge — Baseline Document
**Version:** 1.0 — MVP  
**Date:** February 2026  
**Status:** Live at https://agentforge-swart.vercel.app  
**Repository:** github.com/[your-username]/agentforge

---

## What Is AgentForge?

AgentForge is an AI business support platform for solo founders and small businesses. A founder answers a short onboarding questionnaire about their business — mission, values, goals, tone — and the platform instantly creates a personalised team of AI agents to handle customer support, sales, marketing, finance, and operations.

Every agent response passes through a two-stage governance pipeline (SAGE → EMBER) before reaching the user, ensuring every interaction is ethical, on-brand, and aligned with the business values.

---

## Vision

To become the operating system for AI-powered small businesses — where every founder can have a full AI team that knows their business inside out, operates within their values, and grows with them.

---

## Current Status — What Is Built and Live

### ✅ Authentication
- Email + password signup and signin via Supabase Auth
- Email confirmation flow (currently using Resend SMTP via `onboarding@resend.dev`)
- Session management via `@supabase/ssr` cookies
- Middleware route protection — unauthenticated users redirected to `/login`
- Post-confirmation redirect to `/onboarding` or `/dashboard` based on onboarding status

### ✅ Onboarding Wizard (5 steps)
A guided questionnaire that collects everything needed to build the agent system:

| Step | Name | Fields | Required |
|---|---|---|---|
| 0 | Business Identity | Mission, Vision, Products & Services, Core Values, Ethics Commitments, Brand Voice, Brand Keywords, Words to Avoid | Mission, Values, Products |
| 1 | Business Basics | Business name, Business type (8 options), Stage (4 options) | All |
| 2 | Goals | 6 goal options → maps to agent roles | At least 1 |
| 3 | Tone | Professional, Friendly, Expert, Casual | Yes |
| 4 | Integrations | 8 options (email, Slack, Calendar, CRM, Shopify, Stripe, Notion, Not yet) | Optional |

On completion, calls `POST /api/agents/onboard` which:
1. Saves all profile fields to Supabase
2. Creates agent records with identity-aware system prompts

### ✅ Agent System
Five possible worker agent roles, created based on goals selected:

| Role | Icon | Colour | Triggered by |
|---|---|---|---|
| Support Agent | 🎧 | `#38BDF8` | "Handle customer questions" |
| Sales Agent | 📈 | `#34D399` | "Convert more leads" |
| Finance Agent | 💰 | `#FBBF24` | "Track money & reports" |
| Marketing Agent | 📣 | `#F472B6` | "Create content & campaigns" |
| Operations Agent | ⚙️ | `#A78BFA` | "Cut admin" or "Keep operations smooth" |

Each agent has a system prompt built from:
- Business identity (mission, vision, values, ethics, products, brand voice)
- Agent role and description
- Tone instructions
- Guidelines and ethics rules

### ✅ Governance Pipeline
Every chat response passes through two AI reviewers before delivery:

```
Worker Agent → SAGE (Ethics) → EMBER (Culture) → User
                    ↓ fail              ↓ fail
               rework (×3)        rework (×3)
                    ↓ deadlock          ↓ deadlock
                              Human Queue
```

**SAGE** — Ethics & Compliance reviewer. Checks against:
- The business's own ethics commitments (from onboarding)
- False urgency or high-pressure tactics
- Misleading claims, discriminatory language
- Privacy violations, inappropriate legal/financial advice

**EMBER** — Culture & Values reviewer. Checks against:
- The business's mission and values (from onboarding)
- Brand voice description
- Brand keywords to use and avoid
- Off-brand tone, robotic responses, cultural insensitivity

**Max attempts:** 3 per response  
**On deadlock:** Human queue message delivered, team notified

Pipeline status is shown visually in the chat UI under each response (GOVERNANCE ON/OFF toggle).

### ✅ Dashboard — Three Tabs

**My Agents tab**
- Welcome hero card with live status
- Stats: Agents Active, Brand Tone, Governance status
- Agent cards — click to open live chat
- Live chat with SAGE/EMBER pipeline badges
- What's next card

**Org Chart tab**
- Full AI hierarchy visualised
- APEX (CEO) at top
- Manager tier: SAGE, EMBER, NOVA (COO), VERA (CFO), ORYN (CIO)
- Worker agents at bottom connected to hierarchy
- Click any node to see mandate and policies
- Cross-cutting authority note for SAGE and EMBER

**Governance tab**
- SAGE and EMBER cards with full policies
- Visual pipeline flow diagram
- Live status indicators

---

## Infrastructure

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.3.3 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Hosting | Vercel (serverless) |
| Email | Resend SMTP (`onboarding@resend.dev`) |
| Styling | Inline styles (no CSS framework) |

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server only) |
| `ANTHROPIC_API_KEY` | Claude API access |
| `NEXT_PUBLIC_APP_URL` | Live app URL for redirects |

### Repository Structure

```
/
├── app/
│   ├── page.tsx                      # Landing page
│   ├── layout.tsx                    # Root layout + metadata
│   ├── globals.css                   # Global styles + animations
│   ├── login/
│   │   └── page.tsx                  # Sign up / sign in (toggles between modes)
│   ├── onboarding/
│   │   └── page.tsx                  # 5-step wizard (identity → integrations)
│   ├── dashboard/
│   │   ├── page.tsx                  # Server component — fetches data, auth check
│   │   └── DashboardClient.tsx       # Client UI — tabs, chat, org chart, governance
│   └── api/
│       ├── auth/callback/route.ts    # Supabase email confirmation handler
│       ├── agents/onboard/route.ts   # Saves profile + creates agents on onboarding complete
│       └── chat/route.ts             # Chat endpoint — runs governance pipeline
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client
│   ├── agents.ts                     # Goal → agent role mapping + agent payload builder
│   └── prompts.ts                    # System prompt builder + SAGE/EMBER prompt builders
├── types/
│   └── index.ts                      # All shared TypeScript types
├── middleware.ts                     # Route protection + onboarding redirect logic
├── supabase-schema.sql               # Full DB schema (run once in Supabase SQL editor)
├── BASELINE.md                       # This document
└── README.md                         # Setup and deployment guide
```

### Database Schema

**profiles** — one row per user, created automatically on signup
```
id, email, business_name, business_type, business_stage, tone,
goals[], integrations[], onboarding_complete,
mission, vision, values_statement, ethics_statement,
products, brand_voice, brand_keywords[], brand_avoid[],
created_at, updated_at
```

**agents** — worker agents created at end of onboarding
```
id, user_id, name, role, icon, color, description,
system_prompt, tone, status, created_at, updated_at
```

**conversations** — one per chat session with an agent
```
id, user_id, agent_id, created_at
```

**messages** — individual messages within a conversation
```
id, conversation_id, role (user|assistant), content, created_at
```

**Security:** Row Level Security enabled on all tables — users can only access their own data.

---

## Known Limitations at This Baseline

| Issue | Detail | Priority |
|---|---|---|
| SMTP email | Resend free tier using shared `onboarding@resend.dev` address — can hit 100/day limit | Medium |
| No domain verified | Confirmation emails come from Resend shared domain, not the business domain | Low |
| Identity not editable | Users who completed onboarding can't edit their identity fields without a new account | Medium |
| No agent editing | Agents created at onboarding can't be renamed, edited, or deleted from the UI | Medium |
| Governance is always on | No way to pause SAGE/EMBER per agent from the dashboard | Low |
| No conversation history | Chat history not loaded on page refresh — starts fresh each session | Medium |
| No analytics | No tracking of conversation volume, response quality, or pipeline stats | Low |
| No team access | One account per business — no way to invite teammates | Low |
| Prompts.ts out of sync | `lib/prompts.ts` in the repo still has the old single-argument `buildSystemPrompt` — needs updating to match the latest version used in `lib/agents.ts` | High |

---

## Governance Roles — Full Reference

### Executive Tier
| Name | Title | Colour | Role |
|---|---|---|---|
| APEX | CEO | `#E8C547` | Overall strategic oversight, final authority |

### Manager Tier
| Name | Title | Colour | Role | Active |
|---|---|---|---|---|
| SAGE | Ethics & Compliance | `#F87171` | Reviews all responses for ethics violations | ✅ Live |
| EMBER | Culture & Values | `#FB923C` | Reviews all responses for brand alignment | ✅ Live |
| NOVA | COO | `#4FC3F7` | Operational agent oversight | 🔲 Visual only |
| VERA | CFO | `#A78BFA` | Finance agent governance | 🔲 Visual only |
| ORYN | CIO | `#34D399` | Data and integration oversight | 🔲 Visual only |

### Worker Tier
Dynamically created per business based on onboarding goals. Currently: Support, Sales, Finance, Marketing, Operations.

---

## Roadmap — What Comes Next

### Phase 2 — Foundation Polish
- Edit identity / profile page (mission, values, brand voice)
- Edit and manage individual agents
- Conversation history persistence across sessions
- Verified sending domain for email (custom domain via Resend or Postmark)

### Phase 3 — Governance Depth
- NOVA, VERA, ORYN activated as real reviewing agents
- Per-agent governance toggle (pause SAGE/EMBER for specific agents)
- Governance audit log — see every review decision
- Human queue dashboard — view and respond to escalated messages
- APEX oversight — strategic summary reports

### Phase 4 — Integrations
- Slack — agents post and receive messages in channels
- Gmail — agents draft and send emails
- HubSpot / Salesforce — agents update CRM records
- Shopify — support agent has order data access
- Stripe — finance agent has billing data access
- Notion — agents read and write knowledge base

### Phase 5 — Growth
- Team workspaces — invite teammates, assign roles
- Analytics dashboard — conversation volume, satisfaction, pipeline stats
- Custom agent roles — build agents beyond the 5 defaults
- White label — agencies can deploy AgentForge under their own brand
- API access — developers can query agents programmatically
- Mobile app

---

## How to Restore or Extend From This Baseline

### To restore a clean version
1. All code lives at github.com/[your-username]/agentforge
2. Environment variables are in Vercel project settings
3. Database schema is in `supabase-schema.sql` plus the identity migration:
```sql
alter table public.profiles
  add column if not exists mission text,
  add column if not exists vision text,
  add column if not exists values_statement text,
  add column if not exists ethics_statement text,
  add column if not exists products text,
  add column if not exists brand_voice text,
  add column if not exists brand_keywords text[],
  add column if not exists brand_avoid text[];
```

### To hand to a developer
Give them: this document, the GitHub repo link, and the Vercel + Supabase + Anthropic + Resend credentials. Everything else they need is in the README and this document.

### To start a new feature
1. Create a new branch in GitHub
2. Make changes via the web editor or locally
3. Vercel auto-deploys preview URLs for every branch
4. Merge to main when ready — auto-deploys to production

---

## Session History

This entire product was designed and built in a single Claude session, starting from a blank idea and ending with a live deployed application. The key decisions made along the way:

- **Started** with an enterprise org-chart concept → **pivoted** to solo founder MVP
- **Chose** Next.js + Supabase + Vercel as the stack for zero-ops deployment
- **Decided** serverless is sufficient for MVP — no dedicated server needed
- **Built** governance pipeline (SAGE/EMBER) as a real working feature, not just visual
- **Added** business identity to onboarding so governance is personalised, not generic
- **Deployed** entirely via GitHub web editor — no local development environment needed

---

*AgentForge Baseline v1.0 — February 2026*
