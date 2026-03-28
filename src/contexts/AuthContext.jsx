import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(() => {
        return axios
            .get("/api/users/me", { withCredentials: true })
            .then((res) => {
                setUser(res.data);
                return res.data;
            })
            .catch((err) => {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setUser(null);
                }
                throw err;
            });
    }, []);

    useEffect(() => {
        let cancelled = false;
        axios
            .get("/api/users/me", { withCredentials: true })
            .then((res) => {
                if (!cancelled) setUser(res.data);
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const logout = useCallback(() => {
        return axios.post("/api/users/logout", {}, { withCredentials: true }).then(() => setUser(null));
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, logout, setUser }}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (ctx == null) throw new Error("missing AuthProvider");
    return ctx;
}
