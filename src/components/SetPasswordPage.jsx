import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

/**
 * Set-password page: reached when the user clicks the link from the sign-up email.
 * The URL must include a token query param (?token=...). We validate the token,
 * then show a form to set their password. The token is valid for 30 minutes.
 */
function SetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Token from the email link (e.g. /set-password/?token=abc123).
    const token = searchParams.get("token");

    // Loading: we're checking with the server if the token is valid.
    const [checking, setChecking] = useState(true);
    // Valid: token exists and is not expired; we can show the form.
    const [valid, setValid] = useState(false);
    // Optional email from the server, so we can show "Set password for you@example.com".
    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // When the page loads, validate the token with the server.
    useEffect(() => {
        if (!token) {
            setChecking(false);
            setValid(false);
            return;
        }
        axios
            .get(`/api/set-password/validate/${encodeURIComponent(token)}`)
            .then((response) => {
                setValid(response.data.valid === true);
                setEmail(response.data.email || "");
            })
            .catch(() => setValid(false))
            .finally(() => setChecking(false));
    }, [token]);

    function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setSubmitting(true);
        axios
            .post("/api/set-password", { token, password })
            .then(() => {
                navigate("/confirmation/", {
                    state: { message: "Your password has been set. You can now sign in." },
                });
            })
            .catch((err) => {
                const msg = err.response?.data?.error || "Something went wrong. Please try again.";
                setError(msg);
                setSubmitting(false);
            });
    }

    // Still loading: show a simple message.
    if (checking) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-slate-700 text-center text-slate-300">
                    Checking your link...
                </div>
            </div>
        );
    }

    // No token or invalid/expired token.
    if (!token || !valid) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-slate-700">
                    <h1 className="text-3xl font-bold mb-4 text-white">Invalid or expired link</h1>
                    <p className="text-slate-300 mb-6">
                        This link may have expired (links are valid for 30 minutes) or has already been used.
                        Please sign up again or request a new link.
                    </p>
                    <Link
                        to="/signup/"
                        className="inline-block rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 py-2 px-6 font-semibold"
                    >
                        Go to Sign up
                    </Link>
                </div>
            </div>
        );
    }

    // Valid token: show the set-password form.
    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Set your password</h1>
                {email && (
                    <p className="text-slate-300 mb-6">Account: {email}</p>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-slate-300 mb-2" htmlFor="password">New password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-emerald-500"
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-300 mb-2" htmlFor="confirm">Confirm password</label>
                        <input
                            id="confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-emerald-500"
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full sm:w-auto rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50 py-3 px-6 font-semibold"
                        >
                            {submitting ? "Setting password..." : "Set password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SetPasswordPage;
