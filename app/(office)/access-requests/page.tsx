import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getAccessRequests } from '@/lib/mock/team';
import { KeyRound, Check, X } from 'lucide-react';

export default function AccessRequestsPage() {
  const requests = getAccessRequests();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Admin"
        title="Access Requests"
        description="Pending approvals. Only Owners can grant. Decisions logged to audit_log."
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No pending requests"
          description="When someone new asks to join the office, they show up here."
        />
      ) : (
        <div>
          <SectionHeader title={`${requests.length} pending`} />
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-ink">{r.name}</span>
                      <span className="text-2xs text-ink-dim font-mono">{r.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="label">requesting</span>
                      <Badge tone="gold">{r.requested_role.replace('_', ' ')}</Badge>
                      <span className="text-2xs text-ink-dim">· {r.requested_at}</span>
                    </div>
                    <div className="text-sm text-ink-muted bg-canvas-inset/50 border border-line-soft rounded p-3">
                      {r.reason}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="primary" size="sm">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button variant="ghost" size="sm">
                      <X className="w-3.5 h-3.5" /> Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
