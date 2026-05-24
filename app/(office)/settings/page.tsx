import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, Dot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';
import { LogOut, Shield } from 'lucide-react';

export default function SettingsPage() {
  const session = getSession();

  return (
    <div className="space-y-7 max-w-3xl">
      <PageHeader eyebrow="Admin" title="Settings" description="Your profile, your shortcuts, your boundaries." />

      <div>
        <SectionHeader title="Profile" />
        <Card>
          <div className="p-5 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-medium text-canvas text-base"
              style={{ background: session.user.avatarColor }}
            >
              {session.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1">
              <div className="text-base font-medium text-ink">{session.user.name}</div>
              <div className="text-2xs text-ink-dim font-mono">{session.user.email}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="gold">{session.user.role.replace('_', ' ').toUpperCase()}</Badge>
                <Badge tone="info">{session.org.name}</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader title="Session" />
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Shield className="w-4 h-4 text-good shrink-0" />
            <div className="flex-1 text-sm">
              <div className="text-ink">Office IP — verified</div>
              <div className="text-2xs text-ink-dim mt-0.5">
                Session pinned to the Dubai office static IP. Location drift triggers re-auth.
              </div>
            </div>
            <Dot tone="good" pulse />
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader title="Preferences" />
        <Card>
          <ul className="divide-y divide-line-soft">
            {[
              { label: 'Default landing room', value: 'House' },
              { label: 'WhatsApp chime', value: 'On for unclaimed' },
              { label: 'Inventory sync cadence', value: 'Every 30 min' },
              { label: 'PII masking in logs', value: 'Always (locked)' },
            ].map((row) => (
              <li key={row.label} className="px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-ink">{row.label}</div>
                <div className="text-sm text-ink-muted">{row.value}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <Button variant="danger" size="sm">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </Button>
      </div>
    </div>
  );
}
