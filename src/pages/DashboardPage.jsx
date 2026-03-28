import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext.jsx";

function DashboardPage() {
    const { user: profile, loading: authLoading, logout } = useAuth();
    const [mapRoutes, setMapRoutes] = useState([]);
    const [routesLoading, setRoutesLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState("");
    const navigate = useNavigate();

    const fetchMapRoutes = useCallback(() => {
        setRoutesLoading(true);
        return axios
            .get("/api/map-routes", { withCredentials: true })
            .then((res) => setMapRoutes(res.data))
            .catch((err) => {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate("/login/", { replace: true });
                } else {
                    setMapRoutes([]);
                }
            })
            .finally(() => setRoutesLoading(false));
    }, [navigate]);

    useEffect(() => {
        if (authLoading) return;
        if (!profile) {
            navigate("/login/", { replace: true });
            return;
        }
        fetchMapRoutes();
    }, [authLoading, profile, navigate, fetchMapRoutes]);

    function handleLogout() {
        logout().then(() => navigate("/", { replace: true }));
    }

    function startEdit(mapRoute) {
        setEditingId(mapRoute.id);
        setEditingName(mapRoute.name);
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingName("");
    }

    function saveEdit() {
        if (editingId == null) return;
        axios
            .put(`/api/map-routes/${editingId}`, { name: editingName }, { withCredentials: true })
            .then(() => {
                setEditingId(null);
                setEditingName("");
                fetchMapRoutes();
            })
            .catch((err) => {
                console.error("Failed to update map route name:", err);
                cancelEdit();
            });
    }

    function deleteMapRoute(mapRouteId) {
        if (!window.confirm("Delete this map route?")) return;
        axios
            .delete(`/api/map-routes/${mapRouteId}`, { withCredentials: true })
            .then(() => fetchMapRoutes())
            .catch((err) => console.error("Failed to delete map route:", err));
    }

    function formatRecordedAt(recordedAt) {
        if (!recordedAt) return "—";
        const d = new Date(recordedAt);
        return d.toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short",
        });
    }

    function formatDuration(seconds) {
        if (seconds == null || typeof seconds !== "number" || seconds < 0) return "—";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    const loading = authLoading || (!!profile && routesLoading);

    if (loading) {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 py-4 pt-20">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-slate-700 text-center text-slate-300">
                    Loading...
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    const displayName = (profile.firstName || profile.email || "there").trim() || "there";

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-48">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                        Welcome, {displayName}
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleLogout}
                            className="rounded-lg bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 py-2 px-4 font-semibold text-sm"
                        >
                            Log out
                        </button>
                        <Link
                            to="/"
                            className="rounded-lg bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 py-2 px-4 font-semibold text-sm text-center"
                        >
                            Home
                        </Link>
                    </div>
                </div>

                <p className="text-slate-300 text-sm sm:text-base mb-6">Your recorded routes</p>

                <div className="overflow-x-auto">
                    <table className="w-full table-auto border-collapse text-sm sm:text-base">
                        <thead>
                            <tr className="border-b border-slate-600">
                                <th className="text-left py-2 px-2 text-slate-300 font-semibold">Route name</th>
                                <th className="hidden sm:table-cell text-left py-2 px-2 text-slate-300 font-semibold">
                                    Time/date recorded
                                </th>
                                <th className="hidden sm:table-cell text-left py-2 px-2 text-slate-300 font-semibold">Duration</th>
                                <th className="text-left py-2 px-2 text-slate-300 font-semibold w-20">Edit</th>
                                <th className="text-left py-2 px-2 text-slate-300 font-semibold w-20">Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mapRoutes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-slate-400 text-center">
                                        No routes yet. Tap the + button below to record one.
                                    </td>
                                </tr>
                            ) : (
                                mapRoutes.map((route) => (
                                    <tr key={route.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                        <td className="py-2 px-2 text-white">
                                            {editingId === route.id ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="flex-1 min-w-0 p-1.5 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={saveEdit}
                                                        className="rounded bg-emerald-700 text-white px-2 py-1 text-sm hover:bg-emerald-600"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="rounded bg-slate-600 text-white px-2 py-1 text-sm hover:bg-slate-500"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <Link to={`/dashboard/route/${route.id}`} className="text-emerald-300 hover:text-emerald-200 hover:underline">
                                                    {route.name}
                                                </Link>
                                            )}
                                        </td>
                                        <td className="hidden sm:table-cell py-2 px-2 text-slate-300">
                                            {formatRecordedAt(route.recordedAt)}
                                        </td>
                                        <td className="hidden sm:table-cell py-2 px-2 text-slate-300 font-mono tabular-nums">
                                            {formatDuration(route.durationSeconds)}
                                        </td>
                                        <td className="py-2 px-2">
                                            {editingId === route.id ? null : (
                                                <button
                                                    onClick={() => startEdit(route)}
                                                    className="rounded p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                                                    title="Edit route name"
                                                >
                                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-2 px-2">
                                            <button
                                                onClick={() => deleteMapRoute(route.id)}
                                                className="rounded p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                                title="Delete route"
                                            >
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-10 pt-4 pb-3 px-3 bg-zinc-900/75 flex flex-col justify-end items-center gap-1">
                <Link
                    to="/dashboard/record"
                    className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-700 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    title="Record new map route"
                >
                    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </Link>
                <p className="text-left text-slate-300 font-semibold text-sm sm:text-base pb-0.5">
                    Record New Route
                </p>
            </div>
        </div>
    );
}

export default DashboardPage;
