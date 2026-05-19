export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="panel animate-pulse p-6">
        <div className="h-6 w-48 rounded bg-stone-200" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded bg-stone-100" />
          <div className="h-24 rounded bg-stone-100" />
          <div className="h-24 rounded bg-stone-100" />
        </div>
      </div>
    </main>
  );
}
