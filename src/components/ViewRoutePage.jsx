import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

/**
 * Format seconds as HH:MM:SS, or "—" if null/undefined.
 */
function formatDuration(seconds) {
    if (seconds == null || typeof seconds !== "number" || seconds < 0) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatRecordedAt(recordedAt) {
    if (!recordedAt) return "—";
    const d = new Date(recordedAt);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

/**
 * View route page: shows a single map route's details from the DB, with a link back to the dashboard.
 */
function ViewRoutePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get(`/api/map-routes/${id}`, { withCredentials: true })
            .then((res) => setRoute(res.data))
            .catch((err) => {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate("/login/", { replace: true });
                } else if (err.response?.status === 404) {
                    setError("Route not found.");
                } else {
                    setError("Failed to load route.");
                }
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20 text-center text-slate-300">
                Loading...
            </div>
        );
    }

    if (error || !route) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20 text-center">
                <p className="text-slate-300 mb-4">{error || "Route not found."}</p>
                <Link
                    to="/dashboard/"
                    className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 py-2 px-4 font-semibold inline-block"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const pointCount = Array.isArray(route.points) ? route.points.length : 0;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20 pb-32">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-700">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">
                    View route
                </h1>

                <dl className="space-y-4 text-sm sm:text-base">
                    <div>
                        <dt className="text-slate-400 font-medium">Name</dt>
                        <dd className="text-white font-semibold mt-0.5">{route.name}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-400 font-medium">Recorded at</dt>
                        <dd className="text-slate-300 mt-0.5">{formatRecordedAt(route.recordedAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-400 font-medium">Duration</dt>
                        <dd className="text-slate-300 font-mono tabular-nums mt-0.5">{formatDuration(route.durationSeconds)}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-400 font-medium">Location</dt>
                        <dd className="text-slate-300 mt-0.5">{route.location || "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-400 font-medium">Points recorded</dt>
                        <dd className="text-slate-300 mt-0.5">{pointCount}</dd>
                    </div>
                </dl>

                <div className="mt-8">
                    <Link
                        to="/dashboard/"
                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 py-3 px-6 font-semibold inline-flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ViewRoutePage;
