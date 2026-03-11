import { useCallback, useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches
    || Boolean(navigatorWithStandalone.standalone)
  );
}

function isIosDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const touchMac = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(userAgent) || touchMac;
}

export function usePwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const syncInstalledState = () => {
      setIsInstalled(isStandaloneMode());
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
    };

    syncInstalledState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", syncInstalledState);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installEvent) {
      return false;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallEvent(null);
    return choice.outcome === "accepted";
  }, [installEvent]);

  const showIosInstallHint = useMemo(
    () => !isInstalled && !installEvent && isIosDevice(),
    [installEvent, isInstalled],
  );

  return {
    canInstall: !isInstalled && installEvent !== null,
    isInstalled,
    showIosInstallHint,
    promptInstall,
  };
}
