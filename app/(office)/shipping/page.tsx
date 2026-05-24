import { DeskTopBar } from '@/components/whatsapp/desk-top-bar';
import { getDraftOrders } from '@/lib/mock/orders';
import { Truck, Package, MapPin, AlertCircle } from 'lucide-react';

type Lane = 'urgent' | 'gcc' | 'exceptions';

type Shipment = {
  id: string;
  order_no: string;
  customer: string;
  destination: string;
  courier: 'Aramex' | 'Fetchr' | 'SMSA' | 'self';
  lane: Lane;
  status: 'ready' | 'dispatched' | 'in_transit' | 'delivered' | 'returning' | 'lost';
  weight_g: number;
  cod_aed?: number;
  eta?: string;
  note?: string;
};

function buildShipments(): Shipment[] {
  const orders = getDraftOrders();
  return [
    { id: 's1', order_no: orders[5].number, customer: orders[5].customer.name, destination: 'Dubai · Marina', courier: 'Fetchr',  lane: 'urgent', status: 'dispatched', weight_g: 220, eta: 'today 18:00' },
    { id: 's2', order_no: orders[4].number, customer: orders[4].customer.name, destination: 'Dubai · JLT',   courier: 'Aramex',  lane: 'urgent', status: 'ready',      weight_g: 480, cod_aed: 8_900, eta: 'today' },
    { id: 's3', order_no: orders[3].number, customer: orders[3].customer.name, destination: 'Abu Dhabi',    courier: 'Aramex',  lane: 'urgent', status: 'in_transit', weight_g: 180, eta: 'tomorrow AM' },
    { id: 's4', order_no: orders[7].number, customer: orders[7].customer.name, destination: 'Riyadh · KSA', courier: 'SMSA',    lane: 'gcc',    status: 'in_transit', weight_g: 140, eta: 'Mon' },
    { id: 's5', order_no: '#1278',          customer: 'Salma A.',              destination: 'Jeddah · KSA', courier: 'SMSA',    lane: 'gcc',    status: 'ready',      weight_g: 340, cod_aed: 6_200, eta: 'Tue' },
    { id: 's6', order_no: '#1276',          customer: 'Aisha M.',              destination: 'Sharjah',      courier: 'Fetchr',  lane: 'exceptions', status: 'returning', weight_g: 220, note: 'COD refused at door' },
    { id: 's7', order_no: '#1271',          customer: 'Fatima O.',             destination: 'Riyadh · KSA', courier: 'SMSA',    lane: 'exceptions', status: 'lost',      weight_g: 80,  note: 'Tracking stalled 4 days' },
  ];
}

export default function ShippingPage() {
  const shipments = buildShipments();
  const urgent = shipments.filter((s) => s.lane === 'urgent');
  const gcc = shipments.filter((s) => s.lane === 'gcc');
  const exceptions = shipments.filter((s) => s.lane === 'exceptions');

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-900 text-zinc-100 flex flex-col font-sans">
      <DeskTopBar />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-500">
            <Truck className="w-3.5 h-3.5" />
            Shipping
          </div>
          <h1 className="text-2xl font-medium text-zinc-100 mb-1">Dispatch board</h1>
          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            Three swimlanes — urgent today, KSA-GCC, exceptions. Courier sheets generate per lane. Proof-of-delivery uploads land in the Drive Room safe.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <Stat label="Urgent" value={urgent.length} tone={urgent.length > 0 ? 'warn' : undefined} />
            <Stat label="KSA / GCC" value={gcc.length} />
            <Stat label="Exceptions" value={exceptions.length} tone={exceptions.length > 0 ? 'bad' : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Lane title="Urgent · today" icon={<Package className="w-3.5 h-3.5" />} shipments={urgent} />
            <Lane title="KSA-GCC" icon={<MapPin className="w-3.5 h-3.5" />} shipments={gcc} />
            <Lane title="Exceptions" icon={<AlertCircle className="w-3.5 h-3.5" />} shipments={exceptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'bad' }) {
  const toneClass = tone === 'warn' ? 'text-amber-400' : tone === 'bad' ? 'text-rose-400' : 'text-zinc-100';
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 px-4 py-3">
      <div className="text-2xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-medium tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function Lane({ title, icon, shipments }: { title: string; icon: React.ReactNode; shipments: Shipment[] }) {
  return (
    <div className="border border-zinc-800 rounded-md bg-zinc-900/60 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-zinc-400">
          {icon} {title}
        </div>
        <div className="text-2xs text-zinc-500 tabular-nums">{shipments.length}</div>
      </div>
      <div className="divide-y divide-zinc-800">
        {shipments.length === 0 ? (
          <div className="px-4 py-6 text-center text-2xs text-zinc-500">Empty.</div>
        ) : shipments.map((s) => <ShipmentRow key={s.id} s={s} />)}
      </div>
    </div>
  );
}

function ShipmentRow({ s }: { s: Shipment }) {
  const statusMap: Record<Shipment['status'], string> = {
    ready:      'bg-zinc-800 text-zinc-300 border-zinc-700',
    dispatched: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    in_transit: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    delivered:  'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    returning:  'bg-rose-500/10 text-rose-300 border-rose-500/30',
    lost:       'bg-rose-500/20 text-rose-200 border-rose-500/40',
  };
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-mono text-zinc-300">{s.order_no}</span>
        <span className={`text-2xs uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusMap[s.status]}`}>
          {s.status.replace('_', ' ')}
        </span>
      </div>
      <div className="text-sm text-zinc-100 truncate">{s.customer}</div>
      <div className="text-2xs text-zinc-500 truncate">{s.destination} · {s.courier} · {s.weight_g}g</div>
      <div className="flex items-center justify-between mt-1.5">
        {s.cod_aed ? (
          <span className="text-2xs text-amber-400 tabular-nums">COD {s.cod_aed.toLocaleString()} AED</span>
        ) : <span />}
        {s.eta && <span className="text-2xs text-zinc-500">ETA {s.eta}</span>}
      </div>
      {s.note && <div className="text-2xs text-rose-400 mt-1">{s.note}</div>}
    </div>
  );
}
