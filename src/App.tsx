import { AppShell } from "./app/AppShell.tsx";
import { AuthLoadingScreen } from "./features/auth/components/AuthLoadingScreen.tsx";
import { LoginScreen } from "./features/auth/components/LoginScreen.tsx";
import { useAuthSession } from "./features/auth/hooks/useAuthSession.ts";

function App() {
  const { user, isLoading, isSigningIn, authError, signIn, signOut } =
    useAuthSession();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return (
      <LoginScreen
        isLoading={isSigningIn}
        errorMessage={authError}
        onGoogleLogin={signIn}
      />
    );
  }

  return <AppShell user={user} authError={authError} onSignOut={signOut} />;
}

export default App;
