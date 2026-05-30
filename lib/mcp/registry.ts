// MCP tool registry · single catalog of every tool the model can call.
//
// Each entry has:
//   - name        : the wire name (snake_case, must match Gemini's strict regex)
//   - description : how the model should think about when to call it
//   - schema      : Gemini-compatible OpenAPI subset for arg shape
//   - handler     : the implementation in lib/mcp/tools/<domain>
//
// The same registry is consumed by:
//   1. lib/ai/client.ts → callWithTools() to drive Gemini function-calling
//   2. /api/mcp/route.ts → JSON-RPC MCP server for external clients
//      (Claude Desktop, Hex MCP client, etc.)

import * as inventory from './tools/inventory';
import * as customers from './tools/customers';
import * as orders from './tools/orders';
import * as whatsapp from './tools/whatsapp';
import * as ops from './tools/ops';

export type ToolSchema = {
  type: 'object';
  properties?: Record<string, { type: string; description?: string; enum?: string[] }>;
  required?: string[];
};

export type Tool = {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: (args: any) => Promise<any>;
};

export const TOOLS: Tool[] = [
  // ─── Inventory ─────────────────────────────────────────────────────────
  {
    name: 'get_inventory_stats',
    description: 'Counts: total products, listed on .ae, listed on .com, drift, limited-edition, last sync timestamp.',
    schema: { type: 'object', properties: {} },
    handler: () => inventory.get_inventory_stats(),
  },
  {
    name: 'find_products',
    description: 'Search the catalogue. Filter by parity status, category, minimum price-drift percent, or list top-N. Returns up to 25 SKUs by default.',
    schema: {
      type: 'object',
      properties: {
        parity: { type: 'string', description: 'Filter by parity status', enum: ['matched', 'both_price_drift', 'shopify_only', 'woocommerce_only'] },
        category: { type: 'string', description: 'Category name as it appears in the catalogue' },
        min_drift_pct: { type: 'number', description: 'Only return SKUs with price drift ≥ this absolute percent' },
        limit: { type: 'number', description: 'Max rows (default 25, max 100)' },
      },
    },
    handler: (a) => inventory.find_products(a || {}),
  },
  {
    name: 'get_product',
    description: 'Full detail for one SKU: prices, qty, parity, SEO status, sync status, image, last-synced.',
    schema: {
      type: 'object',
      properties: { sku: { type: 'string', description: 'Master SKU or product UUID' } },
      required: ['sku'],
    },
    handler: (a) => inventory.get_product(a),
  },
  {
    name: 'get_last_sync_run',
    description: 'Last live-catalogue sync row · started, finished, durations, error if failed.',
    schema: { type: 'object', properties: {} },
    handler: () => inventory.get_last_sync_run(),
  },

  // ─── Customers ────────────────────────────────────────────────────────
  {
    name: 'find_customers',
    description: 'Search customers by name fragment, phone, email, or tag. Empty query returns top LTV customers.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name, phone, email, or tag' },
        limit: { type: 'number', description: 'Max rows (default 20, max 100)' },
      },
    },
    handler: (a) => customers.find_customers(a || {}),
  },
  {
    name: 'get_customer',
    description: 'Full profile for one customer: orders count, LTV, country, VIP, consents, linked platforms, tags.',
    schema: {
      type: 'object',
      properties: { id_or_phone: { type: 'string', description: 'Customer UUID, phone (any format), or email' } },
      required: ['id_or_phone'],
    },
    handler: (a) => customers.get_customer(a),
  },
  {
    name: 'get_customer_summary',
    description: 'Roll-up across the customer book: total, VIP, UAE vs KSA, LTV totals & averages.',
    schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Sample size (default 500)' } },
    },
    handler: (a) => customers.get_customer_summary(a || {}),
  },

  // ─── Orders ───────────────────────────────────────────────────────────
  {
    name: 'find_orders',
    description: 'Search order_submissions by status, phone, or customer_id. Returns slim summaries.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'draft | payment_pending | paid | fulfilled | refunded | cancelled' },
        phone: { type: 'string' },
        customer_id: { type: 'string' },
        limit: { type: 'number', description: 'Max rows (default 25)' },
      },
    },
    handler: (a) => orders.find_orders(a || {}),
  },
  {
    name: 'get_order',
    description: 'Full detail for one order: items, flags, totals, target store, payment.',
    schema: {
      type: 'object',
      properties: { order_id: { type: 'string' } },
      required: ['order_id'],
    },
    handler: (a) => orders.get_order(a),
  },
  {
    name: 'orders_today_summary',
    description: 'Today\'s order roll-up · revenue, by-status counts, blocked orders flagged for manager review.',
    schema: { type: 'object', properties: {} },
    handler: () => orders.orders_today_summary(),
  },

  // ─── WhatsApp ─────────────────────────────────────────────────────────
  {
    name: 'list_conversations',
    description: 'WhatsApp inbox · open conversations ranked by last-message-at. Includes assignee + unread count.',
    schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Default 25, max 200' } },
    },
    handler: (a) => whatsapp.list_conversations(a || {}),
  },
  {
    name: 'get_conversation',
    description: 'One WhatsApp thread by id or by customer phone. Returns last 20 messages with attribution.',
    schema: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string' },
        phone: { type: 'string', description: 'Customer phone (with or without +)' },
      },
    },
    handler: (a) => whatsapp.get_conversation(a),
  },

  // ─── Operations (in-memory ops store) ─────────────────────────────────
  {
    name: 'get_team_load',
    description: 'Team roster · name, role, online, skills, current load, follow-ups due. Use when routing tasks.',
    schema: { type: 'object', properties: {} },
    handler: () => ops.get_team_load(),
  },
  {
    name: 'get_open_followups',
    description: 'Open follow-ups across the team. Filter by assignee.',
    schema: {
      type: 'object',
      properties: {
        assignee: { type: 'string', description: 'Team member id (e.g. tm_1)' },
        limit: { type: 'number', description: 'Default 20' },
      },
    },
    handler: (a) => ops.get_open_followups(a || {}),
  },
  {
    name: 'get_signals',
    description: 'Open brand/customer signals (meta comments, ghost browse, objections, demand spikes).',
    schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'meta_comment | meta_burst | ghost_browse | objection | demand_spike | content_idea | reel_save' },
        limit: { type: 'number', description: 'Default 10' },
      },
    },
    handler: (a) => ops.get_signals(a || {}),
  },
  {
    name: 'get_access_requests',
    description: 'Pending access requests · who is asking for which scope and why.',
    schema: { type: 'object', properties: {} },
    handler: () => ops.get_access_requests(),
  },
];

export const TOOL_INDEX: Map<string, Tool> = new Map(TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): Tool | undefined {
  return TOOL_INDEX.get(name);
}

/** Gemini's FunctionDeclaration list, shaped for @google/generative-ai. */
export function geminiFunctionDeclarations() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.schema as any,
  }));
}

/** MCP tools/list response — schema-conformant. */
export function mcpToolsListResponse() {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        ...t.schema,
      },
    })),
  };
}
