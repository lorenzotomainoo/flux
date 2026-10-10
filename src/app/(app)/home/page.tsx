export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Il tuo feed</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 text-muted">
        Qui arriveranno i post di chi segui. Ogni post scompare dopo 24 ore.
      </div>
    </div>
  );
}
