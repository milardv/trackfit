export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-dark font-display text-text-primary">
      <div className="rounded-2xl border border-white/10 bg-card-dark px-6 py-4 text-sm font-medium">
        Verification de la session...
      </div>
    </div>
  );
}
