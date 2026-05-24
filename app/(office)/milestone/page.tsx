import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import {
  MessageSquare, Package, ShoppingBag, Truck, Wallet, DollarSign,
  Sparkles, BarChart3, Bot, HardDrive, Mic,
  Users, TreePine, CheckSquare, Users2,
  Building2, KeyRound, Settings,
} from 'lucide-react';

/**
 * Milestone — the page anyone on the team can open to understand the House.
 * Plain language. No jargon. Each room: what problem it solves and how.
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
              One private place where the team runs both stores and the WhatsApp line
              from a single screen — without losing chats, drifting prices, or chasing
              files in five apps.
            </p>
          </div>

          {/* What it is */}
          <Section title="What it is">
            <p>
              The House is our internal office. Customers never see it. We do.
              Whatever happens on omniastores.ae, omniastores.com, or the WhatsApp
              number lands here in one place. The team picks it up, decides, and acts —
              and the system keeps a record of what was done and why.
            </p>
            <p>
              Omnia AI sits inside the House like a quiet colleague. It does not run
              the team. It reads what is happening across the rooms, points out what
              looks stuck, and offers a next step. A person still decides. A person
              still presses the button.
            </p>
          </Section>

          {/* Why it exists */}
          <Section title="Why it exists">
            <Bullets>
              <Bullet><b>One brand, two stores.</b> Prices, stock, and product info should match across .ae and .com. When they drift, customers notice.</Bullet>
              <Bullet><b>WhatsApp is a third of the revenue.</b> If a chat is missed, the order is lost. We need every chat picked up.</Bullet>
              <Bullet><b>The team works in different rooms.</b> Sales, marketing, shipping, finance — each needs the same customer record without forwarding screenshots.</Bullet>
              <Bullet><b>Decisions go missing.</b> What we agreed in a meeting last week should still be visible next week.</Bullet>
              <Bullet><b>Mistakes are expensive.</b> A refund mishandled or a fake payment proof accepted costs money and trust. The House catches both early.</Bullet>
            </Bullets>
          </Section>

          {/* The rooms */}
          <Section title="The rooms">
            <p>
              Each room is one tool, doing one job. You move between rooms with the
              Go menu at the top right. Nothing repeats between rooms — they share
              the same customer, the same product, the same record.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <RoomCard icon={MessageSquare} name="WhatsApp Desk" what="Where every WhatsApp chat is answered, the customer is identified, and an order draft is built without leaving the chat." />
              <RoomCard icon={Package} name="Inventory" what="One view of the full catalogue across both stores. Spots price drift between .ae and .com. Tells us what to restock and what to push." />
              <RoomCard icon={ShoppingBag} name="Orders" what="One queue for every order — store, WhatsApp, draft, paid, shipped, refunded. No flipping between dashboards." />
              <RoomCard icon={Truck} name="Shipping" what="Three lanes: urgent today, KSA & Gulf, exceptions. Courier sheets and proof of delivery in the same place." />
              <RoomCard icon={Wallet} name="Cashback" what="Customer wallets, earned from real purchases. Spent only on Limited Editions. Each customer has a private link to check their balance." />
              <RoomCard icon={DollarSign} name="Finance" what="Daily settlements from both stores, refund history, and the BNPL accounting for Tamara and Tabby." />
              <RoomCard icon={Sparkles} name="Brand Intelligence" what="What the market is doing to us. Negative comment surges, ad performance dips, and the suggested posting times for next week." />
              <RoomCard icon={BarChart3} name="Reports" what="Plain-language summaries — daily, weekly, monthly. Not a wall of charts. A short read of what happened and what changed." />
              <RoomCard icon={Bot} name="Omnia AI" what="Talk to Omnia AI to ask anything across the rooms. Talk to a teammate's assistant to leave them a note or hand off a task without interrupting them." />
              <RoomCard icon={Mic} name="Meeting Room" what="Meetings are recorded, summarised, and turned into a list of decisions and follow-ups. Nothing said is lost." />
              <RoomCard icon={HardDrive} name="Drive Room" what="The Safe — every file we keep, with who can see it. The Corridors hand a file to the right room (an invoice to Inventory, a settlement to Finance)." />
              <RoomCard icon={Users} name="Customers" what="One profile per customer across .ae, .com, and WhatsApp. Lifetime value, history, wallet, and any past issues — all in one place." />
              <RoomCard icon={Users2} name="Team" what="Who is online, what they are working on right now, what they closed today." />
              <RoomCard icon={TreePine} name="Backyard" what="The culture room — perks earned, milestones reached, food orders, and a private wellbeing check-in." />
              <RoomCard icon={CheckSquare} name="Co-Tasking" what="When someone needs help, they post it here. Whoever picks it up earns credit. Builds the habit of helping each other." />
              <RoomCard icon={Building2} name="Management" what="The switchboard. Shows whether each connection (Shopify, WooCommerce, payments, BNPL) is healthy, and lists the open draft orders ready to push." />
              <RoomCard icon={KeyRound} name="Access Requests" what="When someone needs to see a new room, they ask here. The owner approves or rejects, and the decision is logged." />
              <RoomCard icon={Settings} name="Settings" what="Per-person preferences. Connection keys live here, never visible in chats or logs." />
            </div>
          </Section>

          {/* What the team gets */}
          <Section title="What it changes for the team">
            <Bullets>
              <Bullet><b>One chat, one customer.</b> When Aisha messages us on WhatsApp, the desk already knows her last order, her wallet, and what she browsed without buying.</Bullet>
              <Bullet><b>Drafts go to the right store on the first try.</b> The system picks .ae or .com based on where the customer ordered before, not by guessing.</Bullet>
              <Bullet><b>Price drift is caught the same day.</b> If the ruby bangle is AED 950 on one store and 1,100 on the other, we see it before the customer does.</Bullet>
              <Bullet><b>Refunds and exceptions are recorded.</b> Who asked, who decided, on what date, in what currency. Always.</Bullet>
              <Bullet><b>Help is fast.</b> Stuck on a chat in Arabic? Co-Tasking gets a colleague on it in minutes — and they earn credit for helping.</Bullet>
              <Bullet><b>Less typing.</b> Templates and drafts handle the repeatable parts so the team can spend time on the parts that need a human.</Bullet>
            </Bullets>
          </Section>

          {/* What Omnia AI helps with */}
          <Section title="What Omnia AI helps with">
            <Bullets>
              <Bullet><b>It reads, doesn&apos;t act.</b> The AI never sends a message to a customer on its own and never approves a refund on its own.</Bullet>
              <Bullet><b>It suggests the next move.</b> &ldquo;This chat has been waiting 40 minutes — pick it up.&rdquo; &ldquo;This product is hot, restock.&rdquo; &ldquo;This comment looks like a brand attack.&rdquo;</Bullet>
              <Bullet><b>It remembers what we decided.</b> When the same question comes up next month, the answer is already there.</Bullet>
              <Bullet><b>It writes the first draft.</b> Reply to a customer, SEO for a product, a magazine page after a purchase — written by Omnia AI, edited by the person.</Bullet>
              <Bullet><b>It hands work to the right person.</b> A KSA bridal chat goes to the colleague with the KSA skill. The AI suggests it; the manager confirms it.</Bullet>
            </Bullets>
          </Section>

          {/* Privacy + safety */}
          <Section title="What stays safe">
            <Bullets>
              <Bullet>Phone numbers are masked in any log. The full number is only visible inside the chat that owns it.</Bullet>
              <Bullet>Each room is gated by role. The shipping team does not see the finance ledger; finance does not see private notes.</Bullet>
              <Bullet>Personal events in the Backyard (medical, family) are private by default. Only milestones the person chose to share are public.</Bullet>
              <Bullet>Every approval — refund, discount above 10%, access to a new room — is logged. Always.</Bullet>
            </Bullets>
          </Section>

          {/* Where we are */}
          <Section title="Where we are today">
            <Phase
              n="1"
              title="Foundation"
              state="In progress"
              body="The shell is in place. The WhatsApp Desk and Inventory are deep — they read live, run AI, and write back. The other rooms are scaffolded and ready to be filled."
            />
            <Phase
              n="2"
              title="Real data"
              state="Next"
              body="Connect the live store, customer, and order data. The screens stay the same — the numbers behind them become real."
            />
            <Phase
              n="3"
              title="Deep rooms"
              state="After"
              body="One room at a time, in order: Drive Room → Brand Intelligence → Omnia AI assistants → Backyard → Co-Tasking → Meeting Room → Shipping → Orders → Cashback portal → Customers 360."
            />
            <Phase
              n="4"
              title="Live"
              state="Goal"
              body="The team uses the House every day. The WhatsApp number is answered through the Desk. Refunds and exceptions are logged and never lost. The two stores stop drifting."
            />
          </Section>

          {/* House rules */}
          <Section title="How we work in here">
            <Bullets>
              <Bullet>Calm over flashy. The team uses this all day; the screen should not be loud.</Bullet>
              <Bullet>Every screen shows real content. No empty boxes that say &ldquo;soon&rdquo;.</Bullet>
              <Bullet>One way to navigate — the Go menu. No competing menus.</Bullet>
              <Bullet>When the AI suggests, the human decides. The AI never sends without approval.</Bullet>
              <Bullet>Names of customers are masked in any log. Personal data is gated by role.</Bullet>
            </Bullets>
          </Section>

          <div className="text-xs text-zinc-600 pt-8 border-t border-zinc-800 mt-10">
            If a room does something different from what is written here, the page is
            out of date — flag it.
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
