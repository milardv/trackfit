import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth, googleAuthProvider } from "../firebase.ts";

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
