import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

/**
 * Dashboard: simple landing page for logged-in users. We fetch the current user's
 * profile from the API (using the JWT cookie). If not logged in, redirect to login.
 * Shows a personalized welcome message and a logout button.
 */
function DashboardPage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // On mount, ask the server who is logged in. We send the cookie with credentials.
    useEffect(() => {
        axios
            .get("/api/users/me", { withCredentials: true })
            .then((res) => {
                setProfile(res.data);
            })
            .catch((err) => {
                // 401 or 403 means not logged in or wrong session type – send them to login.
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate("/login/", { replace: true });
                } else {
                    setProfile(null);
                }
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    function handleLogout() {
        axios.post("/api/users/logout", {}, { withCredentials: true }).then(() => {
            navigate("/", { replace: true });
        });
    }

    if (loading) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-slate-700 text-center text-slate-300">
                    Loading...
                </div>
            </div>
        );
    }

    if (!profile) {
        return null; // We're redirecting to login in useEffect.
    }

    // Build a friendly name: prefer first name, then email if no name.
    const displayName = (profile.firstName || profile.email || "there").trim() || "there";

    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">
                    Welcome, {displayName}!
                </h1>
                <p className="text-slate-300 text-lg mb-8">
                    You're logged in. This is your simple dashboard.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 py-2 px-6 font-semibold"
                    >
                        Log out
                    </button>
                    <Link
                        to="/"
                        className="rounded-lg bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 py-2 px-6 font-semibold text-center"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;
