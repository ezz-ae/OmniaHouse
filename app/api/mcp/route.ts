import { NextResponse } from 'next/server';
import { mcpToolsListResponse, getTool, TOOLS } from '@/lib/mcp/registry';

// /api/mcp · MCP JSON-RPC endpoint.
//
// External clients (Claude Desktop, Hex MCP client, future agents) speak
// the Model Context Protocol over HTTP+JSON-RPC. This handler implements
// the read-only methods we need today:
//
//   initialize       · capability handshake
//   tools/list       · list of tools with JSON-schema input contracts
//   tools/call       · invoke a tool by name with structured args
//
// Auth: `Authorization: Bearer <MCP_TOKEN>` required when MCP_TOKEN is set.
// Without the env var the endpoint refuses external traffic — internal
// Gemini calls go through callWithTools() (in-process, no HTTP roundtrip).

const PROTOCOL_VERSION = '2024-11-05';

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
};

function rpcResult(id: string | number | null | undefined, result: any) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result });
}
function rpcError(id: string | number | null | undefined, code: number, message: string, data?: any) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });
}

function checkAuth(req: Request): { ok: true } | { ok: false; reason: string } {
  const required = process.env.MCP_TOKEN;
  if (!required) return { ok: false, reason: 'MCP_TOKEN not configured · external MCP traffic disabled.' };
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== required) return { ok: false, reason: 'invalid_token' };
  return { ok: true };
}

export async function GET() {
  // Minimal landing — handy for verifying the route is wired.
  return NextResponse.json({
    ok: true,
    server: 'omniahouse-mcp',
    protocol_version: PROTOCOL_VERSION,
    tool_count: TOOLS.length,
    transport: 'http+json-rpc',
    auth: 'Authorization: Bearer <MCP_TOKEN>',
  });
}

export async function POST(req: Request) {
  const auth = checkAuth(req);
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }

  // initialize is allowed without auth so the handshake can negotiate
  // before the client even attaches its bearer token. Every other method
  // requires the token when MCP_TOKEN is set.
  if (body.method !== 'initialize' && !auth.ok) {
    return rpcError(body.id, -32001, auth.reason);
  }

  try {
    switch (body.method) {
      case 'initialize': {
        return rpcResult(body.id, {
          protocolVersion: PROTOCOL_VERSION,
          serverInfo: { name: 'omniahouse-mcp', version: '0.1.0' },
          capabilities: { tools: { listChanged: false } },
        });
      }

      case 'tools/list': {
        return rpcResult(body.id, mcpToolsListResponse());
      }

      case 'tools/call': {
        const { name, arguments: args } = body.params || {};
        const tool = getTool(name);
        if (!tool) return rpcError(body.id, -32601, `unknown_tool: ${name}`);
        const result = await tool.handler(args || {});
        return rpcResult(body.id, {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          isError: result?.ok === false,
        });
      }

      case 'ping':
        return rpcResult(body.id, {});

      default:
        return rpcError(body.id, -32601, `Method not found: ${body.method}`);
    }
  } catch (err: any) {
    return rpcError(body.id, -32603, 'Internal error', { message: String(err?.message || err) });
  }
}
