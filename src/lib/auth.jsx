import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAccessToken, clearAccessToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const data = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  }, []);

  // Restore the session on mount. The state updates happen in the promise
  // callbacks rather than synchronously in the effect body.
  useEffect(() => {
    let active = true;
    api
      .get("/auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (!active) return;
        clearAccessToken();
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("pp:session-expired", onExpired);
    return () => window.removeEventListener("pp:session-expired", onExpired);
  }, []);

  async function login(email, password, rememberMe = false) {
    const data = await api.post("/auth/login", { email, password, rememberMe });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function register(email, password, name, showOnWall = false) {
    return api.post("/auth/register", { email, password, name, showOnWall });
  }

  async function loginWithTidecloak({ code, codeVerifier, redirectUri }) {
    const data = await api.post("/auth/tidecloak", { code, codeVerifier, redirectUri });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      /* the cookie is cleared either way */
    }
    clearAccessToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithTidecloak, logout, refresh: loadMe, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
