import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * User login page: email + password. Only users who have set a password
 * (via the link in the sign-up email) can log in. On success we redirect to the dashboard.
 * We send credentials so the server can set the JWT cookie and the browser will store it.
 */
function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        axios
            .post("/api/users/login", { email, password }, { withCredentials: true })
            .then(() => {
                navigate("/dashboard/", { replace: true });
            })
            .catch((err) => {
                const msg = err.response?.data?.error || "Login failed. Please check your email and password.";
                setError(msg);
                setSubmitting(false);
            });
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">Log in</h1>
                <p className="text-slate-300 mb-6">
                    Use the email you signed up with and the password you set from the email link.
                </p>

                {error && (
                    <div className="text-red-500 mb-4 text-sm sm:text-base bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 text-sm sm:text-base" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="w-full p-2.5 sm:p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-300 mb-2 text-sm sm:text-base" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="w-full p-2.5 sm:p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="text-center">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-5 w-full sm:w-auto rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 cursor-pointer py-3 px-6 sm:px-8 transition-all duration-200 font-semibold shadow-lg shadow-blue-600/50 hover:shadow-xl hover:shadow-blue-600/60 text-sm sm:text-base"
                        >
                            {submitting ? "Logging in..." : "Log in"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
