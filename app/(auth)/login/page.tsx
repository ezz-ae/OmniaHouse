// Scaffolding stub. Full implementation per docs/specs/2026-05-23-foundation-rbac.md.
// Codex will replace this when executing the foundation-rbac spec.

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">OmniaHouse</h1>
        <p className="text-sm text-muted-foreground">
          Login UI to be implemented per the foundation-rbac spec.
        </p>
        {searchParams.error && (
          <p className="text-sm text-red-600">Error: {searchParams.error}</p>
        )}
      </div>
    </main>
  );
}
