import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { CopyablePhone } from '@/components/whatsapp/copyable-phone';

export default function SettingsPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <h1 className="text-xl font-semibold text-zinc-100 mb-1">Settings</h1>
          <p className="text-sm text-zinc-500 mb-8">Your profile and platform preferences.</p>

          <Section title="Identity">
            <Row label="Signed in as" value="Mahmoud" />
            <Row label="Organization" value="House of Omnia" />
          </Section>

          <Section title="OmniaStores">
            <Row label="Shopify" value="omniastores.ae · store 69433065630" />
            <Row label="WooCommerce" value="omniastores.com on Kinsta" />
            <Row label="WhatsApp Business" value={<CopyablePhone phone="+971565478227" />} />
          </Section>

          <Section title="WhatsApp Cloud API">
            <Row label="Phone Number ID" value={<EnvStatus name="WHATSAPP_PHONE_NUMBER_ID" />} />
            <Row label="Business Account ID" value={<EnvStatus name="WHATSAPP_BUSINESS_ACCOUNT_ID" />} />
            <Row label="Access token" value={<EnvStatus name="WHATSAPP_ACCESS_TOKEN" />} />
            <Row label="App secret" value={<EnvStatus name="WHATSAPP_APP_SECRET" />} />
            <Row label="Verify token" value={<EnvStatus name="WHATSAPP_VERIFY_TOKEN" />} />
            <Row label="Webhook URL" value={<span className="font-mono text-xs text-zinc-400">/api/whatsapp/webhook</span>} />
          </Section>

          <Section title="AI">
            <Row label="Google Gemini key" value={<EnvStatus name="GOOGLE_API_KEY" />} />
            <Row label="Default model" value="gemini-2.0-flash" />
            <Row label="Heavy reasoning model" value="gemini-1.5-pro" />
            <Row label="When the key is missing" value="Falls back to safe mocks; UI keeps working." />
          </Section>

          <Section title="Data">
            <Row label="Supabase URL" value={<EnvStatus name="NEXT_PUBLIC_SUPABASE_URL" />} />
            <Row label="Supabase anon key" value={<EnvStatus name="NEXT_PUBLIC_SUPABASE_ANON_KEY" />} />
            <Row label="Prisma · pooled" value={<EnvStatus name="POSTGRES_PRISMA_URL" />} />
            <Row label="Prisma · direct (migrations)" value={<EnvStatus name="POSTGRES_URL_NON_POOLING" />} />
            <Row label="Inventory live cache" value=".data/inventory-live.json · 30 min TTL" />
            <Row label="Office IP" value={<EnvStatus name="OFFICE_IP" />} />
          </Section>

          <Section title="Preferences">
            <Row label="WhatsApp inbox sort" value="Smart (AI priority)" />
            <Row label="Notification chime" value="On for unclaimed + manager queue" />
            <Row label="PII masking in logs" value="Always (locked)" />
            <Row label="Theme" value="Dark" />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{title}</h2>
      <div className="border border-zinc-800 rounded-md divide-y divide-zinc-800">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-100 text-right">{value}</span>
    </div>
  );
}

/** Renders "configured" / "not set" without ever leaking the value. */
function EnvStatus({ name }: { name: string }) {
  // Server component reads from process.env at render time
  const set = !!process.env[name];
  return set
    ? <span className="text-emerald-400">configured</span>
    : <span className="text-zinc-500 font-mono text-xs">{name}</span>;
}
