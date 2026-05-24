
You stopped me — good. Let me check what you need before I burn more output.

I was about to generate another 30-page PDF/DOCX. But re-reading your ask: **"a coding building plan — 3 owners Codex, Mahmoud, Claude who does what in flow not separated."**

You probably don't want another book. You want the actual flow, in chat, that you can read in two minutes and use tomorrow morning. Let me do that instead.

---

# The flow

**Per feature, every time, no exceptions:**

```

                Mahmoud has an idea / problem

                            │

                            ▼

        ┌──────────────────────────────────────┐

        │  1. Claude writes the spec           │

        │     /docs/specs/{date}-{slug}.md     │

        │     Goal · Files · Schema · Tests    │

        │     · Open Qs (with suggested        │

        │     defaults)                        │

        └──────────────────┬───────────────────┘

                            ▼

        ┌──────────────────────────────────────┐

        │  2. Mahmoud answers the Open Qs      │

        │     in the spec file, marks Approved │

        └──────────────────┬───────────────────┘

                            ▼

        ┌──────────────────────────────────────┐

        │  3. Codex executes the spec in IDE   │

        │     Touches only listed files        │

        │     Stops on green tests             │

        │     OR stops + reports if stuck      │

        └──────────────────┬───────────────────┘

                            ▼

        ┌──────────────────────────────────────┐

        │  4. Claude reviews the PR diff       │

        │     must-fix / should-fix / nice     │

        │     → Mergeable | Fix | Re-spec      │

        └─────────┬────────────────────┬───────┘

                  │ Mergeable           │ Fix

                  ▼                     ▼

        ┌──────────────────┐  ┌────────────────────┐

        │ 5. Mahmoud pulls │  │ Back to Codex with │

        │ → staging test   │  │ Claude's list as   │

        │ → deploy         │  │ the delta          │

        └──────────────────┘  └────────────────────┘

```

---

# Who actually does what

**Claude (me)** — designs. Writes specs before code exists. Reviews every PR. Drafts schemas, RLS policies, AI prompts. Unblocks Codex when it loops. Never deploys, never decides business rules.

**Codex** — executes. Generates the 80% boilerplate fast. Runs tests. Opens PRs. Stops when stuck instead of regenerating into a corner. Never touches `/prompts/`, `/db/policies/`, or production.

**Mahmoud (you)** — decides + ships. Triggers Claude. Answers spec Open Qs. Pastes Codex prompts. Reads Claude's reviews. Only person who merges to main, only person who runs `vercel --prod`. Only voice to Omnia.

---

# The five rules

1. **No code before a spec.** Even tiny features. Even "just one button."

2. **Specs are short.** One page, max three. Long spec = split the feature.

3. **Open Questions block.** Codex doesn't guess on unanswered Qs.

4. **Claude reviews every PR.** Even two-line ones — they can break RLS.

5. **Only Mahmoud merges and deploys.** Codex pushes branches; Claude reviews; you ship.

---

# Quick worked example

Feature: "match WhatsApp sender's phone against both stores before agent replies."

| Hand | Does | Output |

|---|---|---|

| You | "Build this" | one sentence |

| Claude | Writes `2026-05-23-phone-match.md` — goal, 7 files to touch, RLS rules, 7 tests, 3 Open Qs | spec file |

| You | Answer Qs in the file, write "Approved" | approved spec |

| Codex | Generates 7 files, tests green, opens PR | PR |

| Claude | Reviews diff — finds PII in logs + wrong UAE phone normalization, says "Fix #1 and #2 before merge" | review comment |

| Codex | Fixes #1 and #2 | new commit |

| Claude | Re-reviews — Mergeable | approval |

| You | Pull branch → run 3 real numbers from yesterday → deploy | live |

---

# The repo shape this needs

```

/docs/specs/          ← Claude writes here

/docs/decisions/       ← ADRs after big calls

/docs/runbook/         ← deploy.md, kill-switch.md

/prompts/              ← AI prompts (Claude-owned, Codex hands-off)

/db/policies/          ← RLS (Claude-owned, Codex hands-off)

/db/migrations/        ← forward-only, Claude reviews each

```

---

# When to switch hands (the signals)

- **Codex → Claude:** test fails twice with same cause, or about to touch `/prompts` or `/db/policies`, or spec has unanswered Q

- **Codex → Mahmoud:** migration touches existing prod shape, or new dependency needed, or CI breaks for unrelated reasons

- **Claude → Mahmoud:** business rule needed that isn't in book, or two valid architectures with long-term consequences

- **Pause everything:** production incident, RLS regression, AI accuracy drops below 90% on weekly audit

---

# Copy-paste prompts (the four you'll actually use)

**Mahmoud → Claude: "spec this"**

> Write a spec for {feature} as markdown following the template. V1 only — list V2 ideas under Out of Scope. List Open Questions with suggested defaults. If schema changes are needed, draft the migration + RLS.

**Mahmoud → Codex: "execute"**

> Execute the spec at `/docs/specs/{path}.md`. Touch only files in the spec's list. Do not modify `/db/policies/*` or `/prompts/*`. If a test fails twice with the same root cause, STOP and report — do not regenerate. After: typecheck, test, open PR on `feature/{slug}`.

**Mahmoud → Claude: "review this PR"**

> Review PR #{N}. Spec: `/docs/specs/{path}.md`. Output as must-fix / should-fix / nice-to-have with file:line refs, ending in Mergeable | Fix | Re-spec. Watch for: RLS bypass, PII in logs, hallucinated API shapes, spec deviations.

**Mahmoud → Claude: "Codex is stuck"**

> Codex is looping. Spec: `{path}`. Failure: `{paste}`. Last attempt: `{paste}`. Diagnose the real root cause (not symptom). Tell me: what's wrong, does the spec need updating, minimal fix, one-line or re-spec.

---

That's the flow. **Is this what you needed, or did you want the full PDF/DOCX version I was about to generate?** I stopped because "?" usually means "wrong direction" or "too much." Tell me which and I'll go.







I’ll build this as a serious “platform book,” not a short proposal: concept, philosophy, modules, implementation roadmap, AI rules, technical architecture, first MVP, and language Omnia can understand.

I found the official technical anchors I need: Shopify supports CSV import/export and draft orders for merchant-created orders, Meta supports WhatsApp templates/API workflows, and WordPress supports REST/API authentication with application passwords. I’ll use those only as implementation references, not as the main story.

Thought for 2m 48s

Done. I created the full OmniaHouse.ae Implementation Book as both PDF and editable DOCX.

It includes the platform concept, brand positioning, V1 trust version, AI rules, WhatsApp Order Desk, inventory-aware AI assistant, Shopify/Meta/WordPress implementation, data model, access requirements, 10-day plan, 30/60/90-day roadmap, and Codex build prompts. I used official platform references for Shopify draft orders/product CSV, Meta WhatsApp templates/API, and WordPress application passwords.

Download the PDF

Download the editable DOCX

The office

Thought for a couple of seconds

Yes. That is the correct mental model:

OmniaHouse is not a new website. It is a digital office.

So the build should feel like rooms, not pages.

The mistake would be to present 20 features as a giant platform. The win is to build the building structure, finish one working room, then show that every new room can be added without disturbing the system.

OmniaHouse structure

Foundation: locked private access Hallway: main internal navigation Rooms: business functions Omnia AI: the intelligence layer that can read across the rooms

The rooms can be:

Reception / House Home The first screen. Shows daily status, alerts, pending actions, announcements, and key rooms.

WhatsApp Desk The first finished room. Converts WhatsApp conversation into order draft, shipping info, missing fields, follow-up, and management summary.

Inventory Room Product search, imported Shopify products, stock, product intelligence, AI product recommendations.

Shipping Room Shipping-ready orders, delivery urgency, customer address, issues, delivery status.

Reports Room Daily management view: sales movement, pending cases, missing information, product demand, team activity.

Team Room Team members, roles, assignments, follow-ups, task ownership.

Departments Room Digital, WhatsApp, shipping, finance, product, content, management.

Announcements Room Internal updates from management, policy changes, urgent notices.

Ideas Board Team suggestions, voting, priority status, approved/rejected/under review.

Voting Room Controlled internal voting for product ideas, campaigns, process improvements, team decisions.

Drive Room Files, SOPs, reports, product sheets, brand assets, campaign materials.

Webmail Room Not necessarily full email hosting at first. Start with a mail shortcut/inbox connector or internal message center, then expand.

Team Chat Room Internal chat by department/task/order. Don’t try to replace WhatsApp immediately; start with task comments and order notes.

Omnia AI Room The central assistant. It reads inventory, order drafts, reports, policies, and team notes. It answers internally, not publicly.

The build order

Do not build all rooms now.

Build the walls first:

Login House home Sidebar rooms Role-based layout Settings Coming-next placeholders

Then finish one room:

WhatsApp Desk

That room proves the system is not decoration.

Then continue with the second room:

Inventory + AI Product Assistant

That proves OmniaHouse can hold company data and make it useful.

The sentence you should keep

“We are not building a website. We are building the digital office of House of Omnia. The rooms can grow over time, but one room must be fully useful from the beginning.”

Important: don’t overbuild webmail/chat now

Webmail, drive, team chat, voting, departments — yes, but later.

For V1, show them as locked/coming rooms. That makes the digital office feel real without slowing the first win.

V1 should include:

Live:





House Home



WhatsApp Desk



Inventory Room



Omnia AI basic product assistant



Reports preview

Coming next:





Webmail



Drive



Team Chat



Departments



Announcements



Voting



Ideas Board



Finance



Marketing



Shipping advanced

Codex prompt for the “digital office” structure

Use this:



Update OmniaHouse from a dashboard concept into a private digital office.

Core metaphor:
OmniaHouse is the digital office of “The House of Omnia”.
It is not a public website and not a simple CRM.
The interface should be organized as rooms.

Build the house structure:
1. Locked entrance / login
2. House home
3. Sidebar navigation grouped as rooms
4. Room cards
5. Role-aware placeholders
6. Coming-next room states

Live rooms in V1:
- WhatsApp Desk
- Inventory Room
- Omnia AI
- Reports Preview

Coming-next rooms:
- Webmail
- Drive
- Team Chat
- Departments
- Announcements
- Voting
- Ideas Board
- Shipping
- Finance
- Marketing

Design language:
Use “rooms” and “house” subtly.
Do not make it childish.
It should feel like a premium private operating office for a jewellery company.

House home should show:
- Welcome to OmniaHouse
- The private digital office behind The House of Omnia
- Today’s open orders
- Shipping-ready cases
- Follow-ups due
- Products imported
- AI actions today
- Announcements preview
- Room cards

Rules:
- Only WhatsApp Desk needs to be functional first.
- Inventory Room should support CSV/demo data.
- Omnia AI should answer from inventory/demo data.
- All other rooms can be elegant coming-next placeholders.
- Keep the architecture ready for continuous development.

The strongest demo flow

When you show it:





 Open OmniaHouse.ae 



 Login through the locked door 



 Show the House Home with rooms 



 Open WhatsApp Desk 



 Paste a conversation 



 AI extracts order/shipping details 



 Save draft 



 Show report update 



 Open Inventory Room 



 Ask Omnia AI a product question 

Then stop.

Don’t explain the full future. Let the rooms speak.

Your winning phrase:

“I built the walls first, then finished one room. This way OmniaHouse can keep growing without becoming random.”

That is the architecture.

The most important part is ownership and. Access the system cant be empty for some and  jungle for others.  The AI should be user aware and this should be seriously doable otherwise it will be a one month then nothing 

Thought for a couple of seconds

Exactly. This is the difference between a real management system and a one-month toy.

If ownership/access is weak, OmniaHouse becomes chaos:

Some people see nothing.  Some people see too much.  Someone edits the wrong thing.  AI gives answers without context.  Management loses trust.  The system dies after the first excitement.

So access, roles, ownership, and user-aware AI must be the foundation, not an afterthought.

Core rule

Every room, every record, every AI answer, and every action must know who is asking and what they are allowed to see or do.

OmniaHouse should not be:

“Everyone logs in and sees everything.”

It should be:

Company-owned system → role-based rooms → permission-based actions → user-aware AI → audit logs.

Ownership structure

The clean structure:

Company owns:  Domain  Hosting  Database  GitHub/repo  API keys  AI billing  Shopify connection  Meta/WhatsApp connection  WordPress connection  Production data

Mahmoud has:  Admin/developer access  Implementation access  Build responsibility  No personal ownership lock

Omnia has:  Owner access  Full visibility  Final approval  Ability to remove/add users  System continuity if anyone leaves

This should be built into the system from day one.

Access model

Use four layers:

1. Owner

For Omnia / company owner.

Can see everything:

All rooms  All reports  All customers  All orders  All users  All settings  All audit logs  All AI reports  All financial summaries if added later

Owner can approve/reject modules, users, roles, and integrations.

2. Admin / Growth Lead

For you or senior management.

Can manage:

Inventory  WhatsApp Desk  AI tools  Reports  Follow-ups  Shipping preparation  Product intelligence  Team workflow

But not necessarily billing, owner settings, or permanent ownership controls.

3. Department users

Each department sees only what belongs to them.

WhatsApp team: customer conversations, order drafts, follow-ups, product assistant.  Shipping: shipping-ready orders, address, phone, delivery notes, status.  Finance: order value, payment status, refunds, summaries, no chat access unless needed.  Marketing: product demand, campaign data, product insights, content suggestions, not full customer private notes.  Inventory/product team: products, stock, product data, demand insights.  Developers: technical logs, integration status, staging tools, not private customer/finance data unless approved.

4. Viewer / limited user

Can see selected reports only.

Useful for temporary staff, interns, or external consultants.

The AI must be user-aware

This is critical.

Omnia AI should not answer the same way to everyone.

Examples:

If Omnia asks:

“What happened today?”

AI can answer:

Revenue movement  Orders  Team workload  Delays  Lost opportunities  Top requested products  High-risk issues  Follow-ups overdue

If WhatsApp agent asks:

“What should I do next?”

AI should answer:

Your assigned conversations  Customers waiting  Suggested replies  Missing order fields  Follow-ups due

If shipping asks:

“What is pending?”

AI should answer only:

Shipping-ready orders  Missing address fields  Urgent delivery cases  Delivery issues

If marketing asks:

“What products should we push?”

AI should answer:

Top requested products  Products asked but not bought  Product demand by category  Content ideas  WhatsApp objections useful for ads

If finance asks:

“What is today’s value?”

AI should answer:

Order values  Payment status  Refunds  Revenue summaries

Not customer conversation details unless permission allows.

User-aware AI rule

Every AI request must include:

User ID  User role  Department  Permissions  Allowed rooms  Allowed data sources  Current task context  Audit log ID

So AI does not just “answer.” It answers inside permission boundaries.

Codex implementation principle

Build permissions before building many rooms.

The first system should include:

users  roles  departments  permissions  room_access  record_access  ai_access_policy  activity_logs  audit_logs

Not later. Now.

Practical database structure

Minimum tables:

users  roles  departments  permissions  user_roles  rooms  room_permissions  activity_logs  audit_logs  ai_queries  ai_permissions

Each room should have permissions like:

view  create  edit  approve  delete  export  admin

Example:

WhatsApp Agent can:  view WhatsApp Desk  create order draft  edit own drafts  create follow-ups  use AI reply assistant

But cannot:  view finance summary  delete orders  change settings  export full customer database  approve integrations

Codex prompt: access foundation

Use this before building more features:



Update OmniaHouse architecture to include a serious role-based access and ownership system.

OmniaHouse is a private digital office, not a simple dashboard. Access must be controlled from the foundation.

Build these core concepts:

1. Company Ownership
The system must assume the company owns the domain, database, hosting, API keys, and production data.
Add an Owner role that has full control.

2. Roles
Create roles:
- Owner
- Admin
- Growth Lead
- WhatsApp Manager
- WhatsApp Agent
- Shipping
- Finance
- Marketing
- Inventory
- Developer
- Viewer

3. Departments
Create departments:
- Management
- WhatsApp Sales
- Shipping
- Finance
- Marketing
- Inventory
- Development
- Content

4. Rooms
Rooms:
- House Home
- WhatsApp Desk
- Inventory Room
- Omnia AI
- Shipping Room
- Reports Room
- Team Room
- Drive Room
- Announcements Room
- Ideas Board
- Finance Room
- Marketing Room
- Settings

5. Permissions
Each room must support:
- view
- create
- edit
- approve
- delete
- export
- manage

6. Role-based UI
Users should only see rooms they are allowed to access.
If a room is restricted, it should not appear empty or broken. It should either be hidden or show “Access restricted”.

7. User-aware AI
Every AI request must include:
- user_id
- role
- department
- allowed_rooms
- permissions
- current_page
- data_scope

AI must only answer using data the user is allowed to access.

8. Audit logs
Log:
- login
- AI query
- order draft created
- order draft approved
- shipping status changed
- product imported
- settings changed
- export performed
- user permission changed

9. Safety
No user can export customer data unless permission export=true.
No user can approve orders unless approve=true.
No user can access settings unless manage=true.
No AI response should reveal restricted data.

Create database schema, seed roles, seed permissions, and update navigation to respect access.

AI system prompt rule

Omnia AI must have this rule:



You are Omnia AI, the internal assistant inside OmniaHouse.

You must always respect the current user's role, department, and permissions.

You may only answer using data sources available to the current user.

If the user asks for restricted information, respond:
“I don’t have access to that information under your current role.”

Do not reveal hidden rooms, restricted reports, customer private data, financial details, or management notes unless the user's permissions allow it.

You are not a public chatbot.
You are not a replacement for human support.
You are an internal intelligence layer that helps each user perform their allowed work.

Why this matters to Omnia

Tell her this:

“The most important part of OmniaHouse is not adding rooms. It is making sure each person sees the right room, the right data, and the right AI answer. If access is not controlled, the system becomes empty for some people and a jungle for others. I want to build ownership and permissions from the foundation so OmniaHouse can keep growing safely.”

That is a serious line.

V1 access behavior

For the first version:

Omnia / Owner: sees everything.  Mahmoud / Growth Lead: sees build rooms, inventory, WhatsApp, reports, settings except ownership billing.  WhatsApp Agent: sees WhatsApp Desk, Inventory search, follow-ups.  Shipping: sees only shipping queue and order delivery fields.  Marketing: sees product demand and AI content suggestions.  Developer: sees technical logs and integration settings, no finance/customer exports.  Viewer: sees selected reports only.

The real foundation

Build this first:

Login + roles + rooms + permissions + audit logs + user-aware AI wrapper

Then build the rooms.

Because without this, OmniaHouse is a demo.

With this, OmniaHouse becomes a real management system that can survive after the first month.

If you want me to trust you stop lying  being assistant and act as an  experienced professional intelligence if i forget important things that shift this from a toy a real system you dont forget it . I expect the next answer to not be a repeated one i expect a real full final implementation book that solves issues now and avoid any later. If we say it we do it so this is not experimental its a real buildable today

Thought for a couple of seconds

You’re right. The previous framing was still too much “assistant planning.” Here is the professional version.

This is the final implementation book for OmniaHouse.ae as a real system that can be built today, owned by Omniastores, expanded continuously, and protected from becoming a one-month toy.

OmniaHouse.ae Final Implementation Book

1. Non-negotiable definition

OmniaHouse is not a dashboard. It is not a CRM clone. It is not a chatbot. It is not a website.

OmniaHouse is the private digital office of The House of Omnia.

It is a company-owned internal management system where every business room has access rules, every user has a role, every action is logged, and AI works as an internal intelligence layer that reads, extracts, prepares, organizes, and reports — without replacing human customer support.

The first build must be real today. Not experimental. Not a pitch. Not a PDF. A live locked system with one finished room and the foundation strong enough to keep building.

The first finished room is:

WhatsApp Desk

Because WhatsApp already carries real sales, real customer conversations, real order submissions, and real daily operational pressure.

2. The build principle

OmniaHouse must be built as a digital office with rooms.

A normal admin panel says:

“Here are pages.”

OmniaHouse says:

“Here are business rooms. Each room has people, data, actions, access, and AI support.”

That matters because Omniastores is not a small side store. It has team, products, WhatsApp orders, shipping, website, Shopify, WordPress, inventory, finance, marketing, and management. If the system is built like a simple dashboard, it dies. If it is built like an office, it grows.

The first version must include:

Locked entrance  Company ownership  User roles  Room permissions  Audit logs  User-aware AI  WhatsApp Desk  Inventory foundation  Reports foundation  Settings foundation  Future rooms visible but controlled

3. Ownership and access foundation

This is the first serious requirement. Without it, the system fails.

Ownership rule

OmniaHouse must belong to the company from day one.

Company owns:

Domain  Hosting  Database  GitHub/repository  Production environment  API keys  Meta/WhatsApp credentials  Shopify credentials  WordPress credentials  AI provider billing  Production customer data  Backups  Admin ownership

Mahmoud owns:

Implementation direction  Build management  System architecture  Growth logic  AI workflow design  Developer/admin access only

Omnia owns:

Final authority  Owner access  User approval  Module approval  Data visibility  System continuity whether Mahmoud stays or leaves

This is not emotional. This is system survival.

Correct setup

Use a company email as the owner:

admin@omniastores.ae  or  it@omniastores.ae  or  omniahouse@omniastores.ae

Mahmoud gets a company user:

mahmoud@omniastores.ae

The owner account must not be Mahmoud’s personal or external company account.

4. Core roles

Build roles before building rooms.

Owner

For Omnia / company owner.

Can see and manage everything:

Users  Roles  Rooms  Reports  Orders  Customers  Settings  Integrations  AI logs  Audit logs  Exports  Approvals  System ownership

Admin

For senior internal admin.

Can manage daily system operations but not ownership/billing transfer.

Growth Lead

For Mahmoud.

Can manage:

WhatsApp Desk  Inventory Room  Omnia AI  Reports  Follow-ups  Product intelligence  Workflow structure  Implementation testing  Developer coordination

Cannot remove Owner.  Cannot transfer ownership.  Cannot access restricted finance unless granted.

WhatsApp Manager

Can view and manage WhatsApp sales flow, assigned agents, follow-ups, order drafts, and customer conversation summaries.

WhatsApp Agent

Can create order drafts, use AI extraction, create follow-ups, view assigned customer/order records, and use product assistant.

Cannot export customer database.  Cannot see full finance.  Cannot change settings.  Cannot delete records.

Shipping

Can view shipping-ready orders and update delivery status.

Can see:

Customer name  Phone  Address  Area  Landmark  Delivery notes  Payment method if needed  Urgency  Gift note

Cannot see private management reports, AI logs, finance summaries, or full customer history unless granted.

Inventory

Can view and manage product data, imported inventory, stock flags, missing product data, product notes.

Cannot see customer private data unless granted.

Marketing

Can view product demand, top requested products, customer objections in aggregate, content ideas, campaign/product insights.

Should not see full personal customer chats by default.

Finance

Can view order values, payment status, refund summaries, revenue reports.

Should not need full WhatsApp conversation access by default.

Developer

Can view technical logs, integration status, staging tools, error logs.

Should not see full customer/private finance data unless specifically approved for debugging.

Viewer

Can view selected reports only.

5. Permission model

Every room and action needs permission control.

Permissions:

view  create  edit  approve  delete  export  manage  assign  comment  use_ai  view_sensitive  view_finance  view_customer_private  view_audit_logs

This avoids the two fatal problems:

Some users see an empty system.  Some users see a jungle.

The UI must not be identical for everyone. Omnia sees the house. An agent sees only the rooms relevant to work.

If a user does not have access, either hide the room or show:

Access restricted. Please contact management if this room is required for your work.

Never show broken empty pages.

6. User-aware AI foundation

This is non-negotiable.

Omnia AI must know who is asking.

Every AI request must include:

user_id  user_name  role  department  allowed_rooms  permissions  current_room  data_scope  record_scope  audit_log_id

AI must not answer from data the user is not allowed to access.

Example:

If Omnia asks:

“What happened today?”

AI can answer company-level summary.

If a WhatsApp Agent asks:

“What needs follow-up?”

AI answers only their assigned follow-ups.

If Shipping asks:

“What is pending?”

AI answers only shipping-ready orders and delivery issues.

If Marketing asks:

“What products should we push?”

AI answers product demand and aggregate objections, not private customer details.

If Developer asks:

“What failed?”

AI answers technical logs, not customer private orders.

This makes OmniaHouse serious.

AI identity

Omnia AI is not a chatbot.

Omnia AI is the internal intelligence layer.

It can:

read  extract  list  name  rename  summarize  prepare  document  classify  flag  recommend  report

It cannot:

send customer messages automatically in V1  submit orders automatically in V1  update Shopify automatically in V1  reveal restricted data  invent products  invent prices  invent stock  invent delivery promises  invent discounts  replace human support

7. System architecture

Build with a stack that can ship fast and grow.

Recommended V1 stack:

Next.js App Router  TypeScript  Tailwind CSS  shadcn/ui  Supabase Auth  Supabase Postgres  Supabase Storage later  OpenAI/Gemini API for AI extraction  Shopify CSV import first  Shopify Admin API later  WhatsApp Cloud API later  WordPress REST API later  Vercel or company-controlled hosting  GitHub private repo under company ownership

Why this stack

Fast enough for immediate prototype.  Structured enough for production hardening.  Easy role-based UI.  Easy database schema.  Easy CSV import.  Easy AI routes.  Easy API integration later.

8. The room structure

Live in V1

Locked Entrance  House Home  WhatsApp Desk  Inventory Room  Omnia AI  Reports Preview  Settings / Access  Audit Logs

Coming rooms

Shipping Room  Team Room  Departments  Announcements  Ideas Board  Voting Room  Drive Room  Webmail Room  Marketing Room  Finance Room  WordPress Content Room

These should appear as future rooms, not empty fake features.

Each coming room should have:

purpose  planned function  status: coming next  required access  dependencies

This shows architecture without pretending everything is finished.

9. First finished room: WhatsApp Desk

This is the proof room.

Current business flow

Team selects a product.  Team submits order to Shopify.  Customer details go into Shopify note.

That is useful but weak because the details are unstructured.

New flow

Agent opens WhatsApp Desk.  Agent selects product.  Agent pastes WhatsApp conversation.  AI extracts customer/order/shipping data.  System shows missing fields.  Agent reviews and edits.  System prepares order draft.  System prepares shipping draft.  System creates follow-up if needed.  System logs the action.  Management report updates.

Why this room first

Because it improves something they already do every day.

No culture change.  No huge training.  No theoretical AI.  No replacing the team.

It upgrades existing behavior.

10. WhatsApp Desk fields

Customer fields

Customer name  Phone  WhatsApp number  Language  Customer type: new / returning / VIP / unknown  Source: WhatsApp / Instagram / website / ad / repeat / unknown  Notes

Product/order fields

Selected products  Product name  SKU  Quantity  Price  Discount if approved  Payment method  Payment status  Order value  Shopify order link  Shopify draft link  Internal status

Shipping fields

City  Area  Full address  Landmark  Preferred delivery time  Delivery urgency  Gift note  Special instruction  Shipping status  Missing shipping fields

Intelligence fields

Intent  Intent score  Objection  Missing order fields  Order ready: yes/no  Shipping ready: yes/no  Follow-up needed: yes/no  Follow-up due  Suggested next action  Suggested confirmation message  Manager summary  Risk flags

11. AI extraction schema

The extraction must return strict JSON.



{
  "customer_name": "",
  "phone": "",
  "whatsapp_number": "",
  "language": "Arabic | English | Mixed | Unknown",
  "customer_type": "new | returning | VIP | unknown",
  "source": "WhatsApp | Instagram | Website | Ad | Repeat | Unknown",
  "intent": "product_question | gift_inquiry | bridal_inquiry | price_question | delivery_question | order_submission | payment_question | complaint | return_exchange | other",
  "intent_score": 0,
  "product_names": [],
  "product_urls": [],
  "skus": [],
  "quantity": 1,
  "price": "",
  "budget": "",
  "occasion": "",
  "payment_method": "",
  "payment_status": "",
  "city": "",
  "delivery_area": "",
  "full_address": "",
  "landmark": "",
  "preferred_delivery_time": "",
  "delivery_urgency": "",
  "gift_note": "",
  "special_instruction": "",
  "missing_order_fields": [],
  "order_ready": false,
  "shipping_ready": false,
  "missing_shipping_fields": [],
  "objection": "",
  "conversation_status": "",
  "lost_reason": "",
  "follow_up_needed": false,
  "follow_up_due": "",
  "suggested_next_action": "",
  "suggested_customer_confirmation_message": "",
  "manager_summary": "",
  "risk_flags": []
}

Extraction rules

Unknown stays empty.  Never invent customer data.  Never invent address.  Never invent stock.  Never invent product price.  Never claim order is ready if required fields are missing.  Never claim shipping is ready if address/phone/area are incomplete.  Always show missing fields.  Always include risk flags when uncertain.

12. Inventory Room

The Inventory Room is the second foundation.

V1 should support CSV import.

Do not wait for Shopify API.

Fields

product_id  sku  title  description  price  compare_at_price  stock  category  collection  material  stone  tags  image_url  shopify_url  status  giftable  bridal  daily_wear  high_ticket  whatsapp_push_candidate  content_missing  created_at  updated_at

Functions

CSV upload  Import preview  Product table  Search  Filter by category, collection, price, stock, material, stone  Product detail drawer  Missing data flags  Manual edit  Demo data if no import

13. Omnia AI Product Assistant

This is not customer-facing.

It is an internal assistant that answers only from inventory.

Example questions

Show pearl earrings under 1000 AED.  Suggest bridal products.  Find giftable products.  Write WhatsApp reply for this product.  Which products should we push today?  Which products have missing descriptions?  Which products are high-ticket and in stock?  Show products suitable for same-day WhatsApp selling.

Rules

Do not invent products.  Do not invent stock.  Do not invent price.  Do not invent material.  If inventory data is missing, say it is missing.  Return product cards when relevant.  Respect user permissions.  Log every AI query.

14. Reports Preview

Reports must be action-based, not vanity analytics.

Daily report cards

Orders drafted today  Orders ready to submit  Shipping-ready cases  Follow-ups due  Missing information cases  Top selected products  Products imported  AI actions today  Estimated WhatsApp order value  Open issues

Report sections

Today’s Control View  Order Flow  Shipping Readiness  Follow-up Recovery  Product Demand  Missing Data  Manager Summary

The report must answer:

What moved?  What is stuck?  What is missing?  What needs action?  Where is money waiting?

15. Audit logs

Every important action must be logged.

Log:

login  logout  AI query  AI extraction  product import  product edit  order draft created  order draft edited  order status changed  shipping status changed  follow-up created  follow-up completed  report exported  settings changed  user created  role changed  permission changed  integration key updated  data exported

Audit log fields:

id  user_id  action_type  room  record_type  record_id  before_json  after_json  ip_address if available  created_at

This protects the company and protects you.

16. Database schema

Build these tables in V1:

organizations  users  roles  departments  permissions  user_roles  rooms  room_permissions  audit_logs  activity_logs  products  customers  order_submissions  shipping_preparations  follow_up_tasks  ai_queries  ai_extractions  reports_daily  settings_integrations

Later:

messages  conversations  whatsapp_events  shopify_sync_logs  wordpress_drafts  drive_files  announcements  ideas  votes  team_chat_threads  finance_summaries  marketing_campaigns

Do not create all later rooms as active features now. Only prepare the architecture.

17. Real V1 screen list

/login

Locked entrance.

Text:

The House of Omnia  Private Management System for Omniastores  Inventory. WhatsApp. Orders. Intelligence. Control.

/house

The private digital office home.

Shows:

Welcome  Room cards  Today’s control cards  Announcements preview placeholder  User role  Access indicator

/whatsapp-desk

Finished first room.

Includes:

Product selector  Conversation paste box  AI extract button  Extraction review panel  Order draft  Shipping draft  Missing fields  Follow-up creation  Copy Shopify note  Save draft  Activity log

/inventory

CSV import and product table.

/omnia-ai

Internal AI assistant. Inventory-aware. Permission-aware.

/reports

V1 management view.

/settings

Users, roles, rooms, integrations placeholders.

/audit

Owner/admin only.

18. Production rules

V1 can be demo-ready today, but production needs hardening.

V1 allowed

Demo data  CSV inventory import  Manual WhatsApp conversation paste  AI extraction  Order draft saving  Shipping draft saving  Follow-up task creation  Reports from internal records  Role-based UI  Audit logs

V1 not allowed

Automatic WhatsApp sending  Automatic Shopify order creation  Automatic Shopify product updates  Unapproved customer data export  Live finance access  Replacing human customer support  AI deciding discounts  AI confirming delivery promises

19. Build sequence for today

This is the exact build order. No drifting.

Step 1: Create project

Next.js + TypeScript + Tailwind + shadcn + Supabase.

Step 2: Build database

Users, roles, rooms, permissions, products, customers, order_submissions, shipping_preparations, follow_up_tasks, ai_queries, ai_extractions, audit_logs.

Step 3: Build auth and role layout

Login. Protected routes. Sidebar shows only allowed rooms.

Step 4: Build House home

Room cards and control cards.

Step 5: Build WhatsApp Desk

This is the finished room.

Step 6: Build AI extraction endpoint

Strict JSON extraction. Demo fallback if no API key.

Step 7: Build Inventory Room

CSV import and product table.

Step 8: Build Omnia AI

Inventory-aware assistant with product cards.

Step 9: Build Reports Preview

Action-based daily report.

Step 10: Polish UI

Premium, simple, owner-level.

20. Codex master prompt

Use this as the first master build prompt.



Build OmniaHouse.ae V1.

OmniaHouse is the private digital office of The House of Omnia for Omniastores.

It is not a public website, not a chatbot, not a generic dashboard, and not a CRM clone.
It is a company-owned internal management system that will keep evolving.

The first version must be buildable today and must include one finished room:
WhatsApp Desk.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- OpenAI API placeholder
- Shopify API placeholders
- WhatsApp Cloud API placeholders
- WordPress API placeholders

Core principles:
1. Company ownership from day one.
2. Role-based access from the foundation.
3. User-aware AI from the foundation.
4. Audit logs for important actions.
5. Human approval for all AI outputs.
6. No automatic WhatsApp sending in V1.
7. No automatic Shopify order creation in V1.
8. No fake production claims.
9. Premium internal office UI.
10. Build rooms, not generic pages.

Required roles:
Owner, Admin, Growth Lead, WhatsApp Manager, WhatsApp Agent, Shipping, Finance, Marketing, Inventory, Developer, Viewer.

Required departments:
Management, WhatsApp Sales, Shipping, Finance, Marketing, Inventory, Development, Content.

Required rooms:
House Home, WhatsApp Desk, Inventory Room, Omnia AI, Reports Room, Settings, Audit Logs.

Coming-next rooms:
Shipping Room, Team Room, Departments, Announcements, Ideas Board, Voting Room, Drive Room, Webmail Room, Marketing Room, Finance Room, WordPress Content Room.

Permissions:
view, create, edit, approve, delete, export, manage, assign, comment, use_ai, view_sensitive, view_finance, view_customer_private, view_audit_logs.

Database tables:
organizations, users, roles, departments, permissions, user_roles, rooms, room_permissions, audit_logs, activity_logs, products, customers, order_submissions, shipping_preparations, follow_up_tasks, ai_queries, ai_extractions, reports_daily, settings_integrations.

Pages:
- /login
- /house
- /whatsapp-desk
- /inventory
- /omnia-ai
- /reports
- /settings
- /audit

Build /login:
Title: The House of Omnia
Subtitle: Private Management System for Omniastores
Line: Inventory. WhatsApp. Orders. Intelligence. Control.

Build /house:
Show room cards and today control cards.
Live rooms: WhatsApp Desk, Inventory Room, Omnia AI, Reports.
Coming-next rooms: Shipping, Team, Departments, Announcements, Ideas Board, Voting, Drive, Webmail, Marketing, Finance, WordPress Content.

Build /whatsapp-desk:
Workflow:
1. Agent selects product(s).
2. Agent pastes WhatsApp conversation.
3. Agent clicks AI Extract.
4. AI extracts customer/order/shipping fields.
5. Agent reviews and edits fields.
6. Agent saves order draft.
7. System creates customer record, order submission, shipping preparation if ready, follow-up task if needed, and audit log.

Fields:
customer_name, phone, whatsapp_number, language, customer_type, source, selected_products, product_names, skus, quantity, price, payment_method, payment_status, city, delivery_area, full_address, landmark, preferred_delivery_time, delivery_urgency, gift_note, special_instruction, missing_order_fields, order_ready, shipping_ready, missing_shipping_fields, objection, conversation_status, lost_reason, follow_up_needed, follow_up_due, suggested_next_action, suggested_customer_confirmation_message, manager_summary, risk_flags.

Order statuses:
Draft, Needs Review, Ready to Submit, Submitted to Shopify, Sent to Shipping, Delivered, Issue, Cancelled, Follow-up Needed.

Add buttons:
AI Extract, Save Draft, Copy Shopify Note, Mark Ready for Shipping, Create Follow-up.

Build /inventory:
CSV import, import preview, product table, search, filters, product detail drawer, missing data indicator.
Product fields:
product_id, sku, title, description, price, compare_at_price, stock, category, collection, material, stone, tags, image_url, shopify_url, status, giftable, bridal, daily_wear, high_ticket, whatsapp_push_candidate, content_missing.

Build /omnia-ai:
Internal AI assistant.
Must be user-aware and permission-aware.
Must answer only from inventory/user-allowed data.
Must not invent products, prices, stock, delivery, discount, or material.
Must log every query.

Build /reports:
Cards:
orders drafted today, ready to submit, shipping-ready cases, follow-ups due, missing information cases, top selected products, products imported, AI actions today, estimated WhatsApp order value, open issues.
Sections:
Today’s Control View, Order Flow, Shipping Readiness, Follow-up Recovery, Product Demand, Missing Data, Manager Summary.

Build /settings:
Company profile, users, roles, rooms, permissions, integration placeholders.
No secrets in frontend.
Use env variables.

Build /audit:
Owner/Admin only.
Show audit log table.

AI extraction endpoint:
POST /api/ai/extract-whatsapp-order
Return strict JSON only.
Never invent missing data.
Flag uncertainty.
If no API key exists, use demo fallback.

Security:
Protected routes.
Role-based navigation.
Permission checks on pages and actions.
Audit logs for sensitive actions.
No customer export unless export permission exists.

Include:
- README
- .env.example
- Supabase SQL schema/migrations
- demo seed data
- clean premium UI

21. Claude master review prompt

Use Claude as reviewer, not builder of fantasy.



Review OmniaHouse V1 as a real internal management system, not as a pitch.

Check if the system avoids becoming a one-month toy.

Evaluate:
1. Ownership structure
2. Role-based access
3. User-aware AI
4. Audit logs
5. WhatsApp Desk workflow
6. Inventory foundation
7. Reports usefulness
8. Whether the first finished room is enough to prove execution
9. What is missing before showing to Omnia
10. What should be removed to avoid overbuilding

Do not add big new ideas.
Only improve implementation clarity, risk control, and user trust.

22. First demo script

Do not explain the whole system.

Show it.

Say:

“This is not a presentation. I built the first room of OmniaHouse to show how the internal digital office can work. It is not production-ready yet, but the workflow is real.”

Then demo:

Login  House home  WhatsApp Desk  Paste sample conversation  AI extracts data  Show missing fields  Show order draft  Show shipping draft  Save draft  Show report updated  Open Inventory  Open Omnia AI  Ask product question

Then stop.

Do not say:

“I can build everything.”  “This will change the company.”  “In one year…”  “I know exactly…”  “AI can…”  “You should…”

Say:

“The next step is to harden this room, connect real inventory, and let the team test the flow.”

23. What makes this real today

The system is real today if these work:

User can log in.  User sees only allowed rooms.  Owner sees all rooms.  WhatsApp Agent can open WhatsApp Desk.  Agent can paste a conversation.  AI extracts structured fields.  Missing fields are shown.  Order draft is saved.  Shipping draft is created.  Follow-up task is created.  Activity is logged.  Report updates.  Inventory can be imported or demo loaded.  Omnia AI answers from inventory only.  Audit log captures actions.

If these work, it is not a toy.

It is the first room of a real system.

24. What must be avoided

Avoid building:

Full webmail now  Full drive now  Full team chat now  Full voting now  Full finance now  Full Shopify write sync now  Full WhatsApp send automation now  Full WordPress automation now  A beautiful empty UI  A chatbot pretending to be intelligence  A system with no roles  A system with no owner access  A system where AI ignores permissions  A system where everyone sees everything  A system where nobody knows who changed what

Those are the things that kill it.

25. Final professional position

OmniaHouse is built to be useful immediately and expandable safely.

The first room solves a real current issue:

WhatsApp order information is unstructured and buried in notes.

The system turns it into:

customer record  order draft  shipping preparation  missing fields  follow-up task  management summary  audit log  daily report

This is not overbuilding. This is the foundation.

The branding is the cherry.

The real system is operational control.

The final sentence:

Build the house walls, finish one room, protect access from day one, make AI user-aware, log everything, and expand only after the first room proves value.