interface PwaInstallBannerProps {
  mode: "prompt" | "ios_hint";
  isInstalling: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallBanner({
  mode,
  isInstalling,
  onInstall,
  onDismiss,
}: PwaInstallBannerProps) {
  return (
    <aside className="fixed bottom-28 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-3xl border border-primary/25 bg-[#173523]/94 p-4 text-text-primary shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14 text-primary">
          <span className="material-symbols-outlined text-[22px]">
            {mode === "prompt" ? "download" : "add_to_home_screen"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            {mode === "prompt" ? "Installer TrackFit" : "Ajouter TrackFit a l ecran d accueil"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            {mode === "prompt"
              ? "Installe l app pour lancer tes seances depuis l ecran d accueil et garder une experience plein ecran."
              : "Sur iPhone, ouvre le menu Partager de Safari puis touche Sur l ecran d accueil."}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {mode === "prompt" ? (
              <button
                type="button"
                onClick={onInstall}
                disabled={isInstalling}
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-background-dark transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isInstalling ? "Ouverture..." : "Installer"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
