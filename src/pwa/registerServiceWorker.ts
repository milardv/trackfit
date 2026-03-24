export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
    return;
  }

  window.addEventListener("load", () => {
    let hasReloadedForUpdate = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloadedForUpdate) {
        return;
      }

      hasReloadedForUpdate = true;
      window.location.reload();
    });

    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none",
    }).then((registration) => {
      void registration.update();
    }).catch(() => undefined);
  });
}
