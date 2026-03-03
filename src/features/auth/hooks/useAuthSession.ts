import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
} from "../../../services/authService.ts";
import { upsertUserProfile } from "../../../services/firestoreService.ts";
import { getAuthErrorMessage } from "../utils/authErrors.ts";

interface UseAuthSessionResult {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuthSession(): UseAuthSessionResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);

      if (!nextUser?.email) {
        return;
      }

      void upsertUserProfile(nextUser.uid, {
        displayName: nextUser.displayName ?? "Membre TrackFit",
        email: nextUser.email,
        defaultRestSec: 30,
      }).catch(() => {
        // Keep UX smooth even if profile sync fails temporarily.
      });
    });

    return unsubscribe;
  }, []);

  const signIn = async (): Promise<void> => {
    setAuthError(null);
    setIsSigningIn(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthError(null);
    try {
      await signOutUser();
    } catch {
      setAuthError("Deconnexion impossible pour le moment.");
    }
  };

  return {
    user,
    isLoading,
    isSigningIn,
    authError,
    signIn,
    signOut,
  };
}
