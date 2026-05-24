import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import {
  MessageSquare, Package, ShoppingBag, Truck, Wallet, DollarSign,
  Sparkles, BarChart3, Bot, HardDrive, Mic,
  Users, TreePine, CheckSquare, Users2,
  Building2, KeyRound, Settings,
} from 'lucide-react';

/**
 * Milestone — the page that explains the House.
 *
 * No names. No ownership. No "built by". Just what it is, what it does,
 * and where it is going. Anyone on the team can read this and know how
 * the rooms connect and what work is open.
 */
export default function MilestonePage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Title */}
          <div className="mb-10">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Milestone</div>
            <h1 className="text-3xl font-medium text-zinc-100 tracking-tight mb-3">
              The House of Omnia
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed">
              A private digital office for the team that runs the stores and the WhatsApp desk.
              Every room here mirrors a real part of the operation. No marketing surface, no public
              site — only what the team uses every day.
            </p>
          </div>

          {/* What this is */}
          <Section title="What this is">
            <p>
              The House is the place where the work happens. It connects the two storefronts
              (omniastores.ae on Shopify and omniastores.com on WooCommerce) with the WhatsApp
              line (+971 56 547 8227) and turns every conversation, every order, every product
              into one record. The team picks up a chat, drafts an order, pushes it to the right
              store, and watches it settle — all without leaving the House.
            </p>
            <p>
              Omnia AI is the assistant that watches across rooms. It does not run the team. It
              notices what is stuck, suggests who should pick it up, and remembers the patterns
              so the next chat is faster than the last. When the team agrees with a suggestion,
              the action is one click. When they do not, the AI steps back.
            </p>
          </Section>

          {/* What it does */}
          <Section title="What it does">
            <Bullets>
              <Bullet>Reads from both storefronts. Writes draft orders back when a chat is ready.</Bullet>
              <Bullet>Keeps one record of every customer across .ae, .com, and WhatsApp.</Bullet>
              <Bullet>Spots price drift between the two stores and flags the item before a customer asks.</Bullet>
              <Bullet>Reads incoming WhatsApp messages, drafts a reply in the right language, and routes the conversation to the right person.</Bullet>
              <Bullet>Logs every action so nothing is lost — who did what, when, and why.</Bullet>
              <Bullet>Holds the wallet balance for cashback, the limited-edition catalogue, the SEO scores, and the shipping board.</Bullet>
            </Bullets>
          </Section>

          {/* The rooms */}
          <Section title="The rooms">
            <p>
              Each room is a focused tool. They share the same data and the same identity, but
              each one is designed for one job. Nothing is repeated between rooms.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <RoomCard icon={MessageSquare} name="WhatsApp Desk" what="The room +971 56 547 8227 lives in. Read chats, draft orders, verify payments, push to the right store." />
              <RoomCard icon={Package} name="Inventory" what="Catalogue across both stores. Price parity, SEO scores, stock levels, restock signals." />
              <RoomCard icon={ShoppingBag} name="Orders" what="Cross-channel order queue. Drafts, paid, shipped, refund-pending." />
              <RoomCard icon={Truck} name="Shipping" what="Dispatch board. Courier sheets. Proof of delivery. Exception lane." />
              <RoomCard icon={Wallet} name="Cashback" what="Customer wallets. Limited-edition redemption. Public portal per customer." />
              <RoomCard icon={DollarSign} name="Finance" what="Settlements across stores. Reconciliation. BNPL (Tamara, Tabby) accounting." />
              <RoomCard icon={Sparkles} name="Brand Intelligence" what="GA events, Meta sentiment, ghost-browse heatmap. The signal layer." />
              <RoomCard icon={BarChart3} name="Reports" what="Daily, weekly, monthly summaries. Auto-generated, plain language." />
              <RoomCard icon={Bot} name="Omnia AI" what="The agentic surface. One AI partner per team member. Tasks routed by skill match." />
              <RoomCard icon={Mic} name="Meeting Room" what="Meeting transcripts. Decisions captured. Follow-ups tracked to completion." />
              <RoomCard icon={HardDrive} name="Drive Room" what="The Safe. Files with visibility rules. Corridors that hand a file to the right room." />
              <RoomCard icon={Users} name="Customers" what="Unified customer profiles. Lifetime value. Wallet balance. Ghost identity links." />
              <RoomCard icon={Users2} name="Team" what="Skills, performance, XP, collaboration score." />
              <RoomCard icon={TreePine} name="Backyard" what="Events, milestones, perks, wellbeing pulse. The +1 culture room." />
              <RoomCard icon={CheckSquare} name="Co-Tasking" what="Help requests between team members. Helper XP. Acceptance flow." />
              <RoomCard icon={Building2} name="Management" what="Integrations health. Draft orders. CRM sync. The operator's switchboard." />
              <RoomCard icon={KeyRound} name="Access Requests" what="Pending team approvals. Logged to audit_logs." />
              <RoomCard icon={Settings} name="Settings" what="Per-account preferences. Connection keys. PII masking rules." />
            </div>
          </Section>

          {/* How it is built */}
          <Section title="How it is built">
            <Bullets>
              <Bullet>One Next.js app. One TypeScript codebase. One Tailwind theme — dark gray, one sans-serif, comfortable sizes.</Bullet>
              <Bullet>Supabase holds the source of truth: customers, orders, conversations, agents, tasks, memory, files. Twenty-four SQL migrations define the schema.</Bullet>
              <Bullet>Row-level security at the database — every read and write is gated by role.</Bullet>
              <Bullet>Live data from the storefronts is fetched directly from the public product feeds, cached for thirty minutes, then refreshed in the background.</Bullet>
              <Bullet>When the AI key is configured, prompts call GPT-4o. When the key is absent, the same UI works with deterministic mocks so nothing breaks.</Bullet>
              <Bullet>Every change is reviewed before it lands on main. Nothing ships without a clean build.</Bullet>
            </Bullets>
          </Section>

          {/* The plan */}
          <Section title="The plan">
            <Phase
              n="1"
              title="Foundation"
              state="In progress"
              body="Repo structured. Auth gate, lobby, top-level rooms in place. WhatsApp Desk and Inventory are deep — they read live, write back, run prompts. The other rooms are scaffolded with their shape and waiting for their domain pass."
            />
            <Phase
              n="2"
              title="Real data"
              state="Next"
              body="Connect Supabase. Run the twenty-four migrations. Seed the team. Verify role isolation. The mocks become the fallback, not the default."
            />
            <Phase
              n="3"
              title="Deep rooms"
              state="After"
              body="One room at a time, in this order: Inventory deepening → Drive Room and Corridors → Brand Intelligence → Omnia AI agentic layer → Backyard culture → Co-Tasking → Meeting Room → Shipping → Orders → Cashback portal → Customers 360 → House aggregator."
            />
            <Phase
              n="4"
              title="Live"
              state="Goal"
              body="The team uses the House every day. The WhatsApp number is answered through the Desk. Drafts push to the right store on first try. Refunds and exceptions are logged and never lost. The two stores stop drifting."
            />
          </Section>

          {/* Principles */}
          <Section title="How we work in here">
            <Bullets>
              <Bullet>Comfort over wow. The team uses this all day. Calm reads, no flashing.</Bullet>
              <Bullet>Every screen shows real content. Empty surfaces are removed.</Bullet>
              <Bullet>Numbers are visible. Phone numbers can be copied. No hidden state.</Bullet>
              <Bullet>One way to navigate — the Go menu. No competing menus.</Bullet>
              <Bullet>Names of customers are masked in logs. Personal data is gated by role.</Bullet>
              <Bullet>When the AI suggests, the human decides. The AI never sends without approval.</Bullet>
            </Bullets>
          </Section>

          <div className="text-xs text-zinc-600 pt-8 border-t border-zinc-800 mt-10">
            Read this whenever the shape of the system is unclear. If a room does something
            different from what is described here, the description is out of date — say so.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Layout primitives ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-medium text-zinc-100 mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Bullets({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1.5 text-sm text-zinc-300">{children}</ul>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-emerald-400 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

function RoomCard({ icon: Icon, name, what }: { icon: any; name: string; what: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-zinc-800 bg-zinc-900/60">
      <Icon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-100 mb-0.5">{name}</div>
        <div className="text-xs text-zinc-500 leading-snug">{what}</div>
      </div>
    </div>
  );
}

function Phase({ n, title, state, body }: { n: string; title: string; state: string; body: string }) {
  const tone =
    state === 'In progress' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
    state === 'Next' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
    state === 'Goal' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
    'bg-zinc-800 text-zinc-400 border-zinc-700';
  return (
    <div className="flex gap-4 py-3 border-b border-zinc-800 last:border-b-0">
      <div className="w-8 shrink-0 text-2xl font-mono text-zinc-700">{n}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-100">{title}</span>
          <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border ${tone}`}>{state}</span>
        </div>
        <div className="text-sm text-zinc-400 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
