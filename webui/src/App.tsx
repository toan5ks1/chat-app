import { useEffect } from "react";
import { useAuthStore } from "./store/auth";
import { tokenStorage } from "./lib/token";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { LoginScreen } from "./components/common/LoginScreen";
import { ChatView } from "./components/chat/ChatView";

function App() {
  const status = useAuthStore((state) => state.status);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const setToken = useAuthStore((state) => state.setToken);

  useEffect(() => {
    // Check if we're returning from OAuth with a token in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Store token and fetch user
      setToken(token);
    } else if (tokenStorage.exists()) {
      // Token exists in storage, verify it
      fetchUser();
    } else {
      // No token, user is unauthenticated
      useAuthStore.setState({ status: "unauthenticated" });
    }
  }, [fetchUser, setToken]);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return <LoginScreen />;
  }

  return <ChatView />;
}

export default App;
