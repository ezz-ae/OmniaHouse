import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';

/**
 * Milestone — the business read of OmniaHouse.
 *
 * Written for anyone in the company. No jargon, no table names, no AI
 * bullet lists. Read top to bottom: what this is, what it isn't, why it
 * matters, where it's going.
 */
export default function MilestonePage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12">

          <div className="mb-12">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Welcome</div>
            <h1 className="text-3xl sm:text-4xl font-medium text-zinc-100 tracking-tight mb-4 leading-tight">
              OmniaHouse — the private digital home of Omniastores
            </h1>
            <p className="text-base text-zinc-300 leading-relaxed">
              Think of OmniaHouse as the digital extension of our physical office. A locked, secure
              workspace where the daily work — inventory, conversations, orders, shipping, team
              flow — is organized into one living system.
            </p>
            <p className="text-base text-zinc-300 leading-relaxed mt-3">
              The goal is simple: turn our daily business activity into organized, visible,
              manageable intelligence.
            </p>
          </div>

          <Section title="What OmniaHouse is, and what it isn't">
            <p>
              To use this platform well, it helps to know its boundaries.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <PillarCard
                heading="What it is"
                tone="good"
                items={[
                  ['A digital office.', 'Organized into rooms — WhatsApp, Inventory, Reports, Management — each with a specific job, clear ownership, and role-based access.'],
                  ['An intelligence layer.', 'It connects the workflow from a WhatsApp conversation all the way through to order preparation, shipping, and follow-up.'],
                  ['A secure hub.', 'A locked entrance. Every user enters with a specific role. People see only the rooms and the data their work actually needs.'],
                ]}
              />
              <PillarCard
                heading="What it is not"
                tone="warn"
                items={[
                  ['Not a replacement for our tools.', 'It does not replace Shopify (the commerce engine) or WordPress (the public site). It sits above them.'],
                  ['Not a replacement for the team.', 'Human service stays essential. OmniaHouse gives the team structure and gives management visibility — it does not run the conversations.'],
                  ['Not a public chatbot.', 'Omnia AI is strictly an internal assistant. It helps the team summarize, extract, and decide. It does not talk to customers.'],
                ]}
              />
            </div>
          </Section>

          <Section title="How it makes a difference">
            <p>
              Today, many of our daily processes — handling WhatsApp orders especially — are still
              done by hand. Customer details and product requests sometimes end up squeezed into a
              Shopify note without enough structure. Things get missed.
            </p>
            <p>
              OmniaHouse introduces a single, simple workflow:{' '}
              <strong className="text-zinc-100">AI extracts. Human approves.</strong>
            </p>
            <p>
              You paste a WhatsApp conversation into the system. The assistant pulls out the
              customer&apos;s name, the address, the requested products, the payment method, and
              flags anything missing. You review what it found. The system then prepares a clean
              order draft and a structured shipping instruction — ready for a human to send into
              Shopify with one click.
            </p>
            <p>
              In practice, that means less messy note-taking, fewer shipping delays, fewer customer
              complaints, and clearer daily tasks for the team. For management, it means instant
              visibility — what happened today, what is stuck, where money is waiting — without
              chasing individual team members for updates.
            </p>
          </Section>

          <Section title="Why it matters · stopping data and opportunity leaks">
            <p>
              Every day, real business intelligence slips through the cracks of manual chat logs
              and scattered notes. OmniaHouse is built to stop those leaks.
            </p>
            <p>
              When a customer asks about a product we don&apos;t carry, or objects to a price, or
              hesitates on a payment, that conversation usually disappears into an archive.
              OmniaHouse captures it. By structuring the data, the system catches missing fields
              before an order ships, flags stuck cases before they become complaints, and tracks
              overdue follow-ups so we never quietly drop a lead.
            </p>
            <p>
              The same structure stops marketing opportunities from leaking. Down the line, the
              Marketing Room will read from this same intelligence — top requested products,
              repeated customer objections, items asked about but not yet purchased. Everyday
              conversations turn into actionable segments and content ideas.
            </p>
          </Section>

          <Section title="The plan · what we are building, in order">
            <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-5 mb-5">
              <div className="text-2xs uppercase tracking-wider text-emerald-400 mb-2">Now · Version 1 · the foundation</div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                We are not building the whole house at once. V1 finishes the walls and the most
                critical rooms. It proves the structured rooms work, the AI extracts real value,
                and the system can grow safely.
              </p>
              <PlanList
                items={[
                  ['Locked login and role-based navigation', 'A secure entrance. Each user enters with a role and only sees what that role is allowed to see.'],
                  ['House Home', 'The central reception. Shows today\'s business movement — drafted orders, missing information, pending follow-ups — adjusted to the role of whoever is looking.'],
                  ['WhatsApp Order Room', 'The first room fully finished. Paste a chat, the AI extracts the order, you approve the draft, the system prepares it for Shopify.'],
                  ['Inventory Room', 'A foundational space holding the structured product knowledge — SKU, price, stock, description — that makes the AI useful.'],
                  ['Omnia AI · basic product assistant', 'Internal only. Summarises orders, extracts details, suggests replies. Never sends a message to a customer without a human pressing send.'],
                  ['Reports preview', 'A management view that tells you what happened today, what is stuck, and where information is missing.'],
                  ['Settings and audit logs', 'Administrative controls. Every system action is tracked. Permissions are enforced. Ownership stays with the company.'],
                ]}
              />
              <div className="mt-5 pt-4 border-t border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                <strong className="text-zinc-300">Deliberately excluded from V1:</strong> full
                webmail, active finance, full team chat, automated WhatsApp sending, direct
                Shopify and WordPress automation. We finish the core first so it stays stable when
                the rest comes online.
              </div>
            </div>

            <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-5">
              <div className="text-2xs uppercase tracking-wider text-zinc-400 mb-2">Next · Version 2 and beyond</div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                Once V1 runs smoothly, the digital office expands room by room.
              </p>
              <PlanList
                items={[
                  ['Marketing Room', 'Turns WhatsApp conversations into marketing intelligence — top requests, repeated objections, items asked about but not bought. Content ideas, captions, and retargeting segments live here.'],
                  ['Finance Room', 'Restricted visibility into order values, payment statuses, refund statuses, and the impact of discounts. Begins carefully — no direct bank or payment access in early versions.'],
                  ['Webmail Room', 'A controlled communication center. Mail shortcuts, a company inbox connector, support email coordination.'],
                  ['Drive Room', 'The company file hub. Standard operating procedures, product sheets, brand assets, training documents — all in one place, with visibility rules.'],
                  ['Departments Room', 'The internal company structure. Sales, Shipping, Marketing, Content — each can eventually have its own room, tasks, and reports.'],
                  ['Announcements Room', 'A single place for management to post urgent updates, policy changes, sales instructions, campaign briefings. Less scatter.'],
                  ['Ideas Board', 'A controlled space where team members suggest improvements. Each idea moves through New → Under review → Approved → Completed.'],
                  ['Voting Room', 'For internal decisions on product focus, campaign direction, and workflow changes. Voting access is controlled by role and department.'],
                ]}
              />
            </div>
          </Section>

          <Section title="Common questions">
            <QA
              q="Will the AI be talking directly to our customers?"
              a="No. Omnia AI is strictly an internal intelligence layer. In V1 it does not send messages automatically and it does not submit orders automatically. It prepares the data and suggests replies. A human always approves the final action."
            />
            <QA
              q="Will everyone see the same dashboard?"
              a="No. OmniaHouse is role-based. A WhatsApp agent sees their assigned customers. Shipping sees urgent delivery cases. Management sees the full control view. Access is strictly controlled to protect sensitive business information."
            />
            <QA
              q="Does this replace Shopify?"
              a="Not at all. Shopify remains our commerce engine. OmniaHouse sits above the tools as the internal management layer, helping the team prepare clean, structured notes that then get pushed into Shopify."
            />
            <QA
              q="How does this help Omnia and the management team specifically?"
              a="House Home and the Reports Room act as a central reception area. Omnia can immediately see orders drafted today, shipping-ready cases, missing information, top selected products. Complete visibility over the daily movement of the business — without having to interrupt the team to ask what is happening."
            />
          </Section>

          <div className="text-xs text-zinc-500 pt-8 border-t border-zinc-800 mt-12 leading-relaxed">
            If a room does something different from what is described here, the description is out
            of date — say so. This page changes as the House grows.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-medium text-zinc-100 mb-4">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function PillarCard({
  heading, tone, items,
}: {
  heading: string;
  tone: 'good' | 'warn';
  items: [string, string][];
}) {
  const headTone = tone === 'good' ? 'text-emerald-400' : 'text-amber-400';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 p-5">
      <div className={`text-2xs uppercase tracking-wider ${headTone} mb-3`}>{heading}</div>
      <ul className="space-y-3">
        {items.map(([head, body], i) => (
          <li key={i}>
            <div className="text-sm text-zinc-100 mb-0.5">{head}</div>
            <div className="text-xs text-zinc-400 leading-relaxed">{body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanList({ items }: { items: [string, string][] }) {
  return (
    <ul className="space-y-3">
      {items.map(([head, body], i) => (
        <li key={i} className="flex gap-3">
          <span className="text-zinc-600 font-mono text-2xs mt-1 shrink-0 w-4 text-right">{i + 1}</span>
          <div className="min-w-0">
            <div className="text-sm text-zinc-100 mb-0.5">{head}</div>
            <div className="text-xs text-zinc-400 leading-relaxed">{body}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-l-2 border-zinc-800 pl-4 mb-4">
      <div className="text-sm font-medium text-zinc-100 mb-1">{q}</div>
      <div className="text-sm text-zinc-400 leading-relaxed">{a}</div>
    </div>
  );
}
