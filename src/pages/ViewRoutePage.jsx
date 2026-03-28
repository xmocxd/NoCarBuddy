import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import { computeRouteMetrics, formatDistance, formatPaceSecondsPerMi, STEPS_PER_MILE } from "../utils/routeMetrics.js";

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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

function FitRouteBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length === 0) return;
        const latlngs = points.map((p) => [p.lat, p.lng]);
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 20 });
    }, [map, points]);
    return null;
}

function ViewRoutePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nameEditing, setNameEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState("");
    const [nameSaving, setNameSaving] = useState(false);

    useEffect(() => {
        setNameEditing(false);
    }, [id]);

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

    const displayMetrics = useMemo(() => {
        if (!route) {
            return { distanceMeters: 0, estimatedSteps: 0, paceSecondsPerMi: null };
        }
        if (
            route.distanceMeters != null &&
            Number.isFinite(Number(route.distanceMeters)) &&
            route.estimatedSteps != null &&
            Number.isFinite(Number(route.estimatedSteps))
        ) {
            let pace = null;
            if (route.paceSecondsPerMi != null && Number.isFinite(Number(route.paceSecondsPerMi))) {
                pace = Number(route.paceSecondsPerMi);
            } else if (route.paceSecondsPerKm != null && Number.isFinite(Number(route.paceSecondsPerKm))) {
                pace = Number(route.paceSecondsPerKm) * (1609.344 / 1000);
            }
            return {
                distanceMeters: Number(route.distanceMeters),
                estimatedSteps: Math.round(Number(route.estimatedSteps)),
                paceSecondsPerMi: pace,
            };
        }
        return computeRouteMetrics(route.points || [], route.durationSeconds ?? 0);
    }, [route]);

    function startNameEdit() {
        if (!route) return;
        setNameDraft(route.name || "");
        setNameEditing(true);
    }

    function cancelNameEdit() {
        setNameEditing(false);
    }

    function saveNameEdit() {
        const trimmed = nameDraft.trim();
        if (!trimmed || !id) return;
        setNameSaving(true);
        axios
            .put(`/api/map-routes/${id}`, { name: trimmed }, { withCredentials: true })
            .then((res) => {
                setRoute(res.data);
                setNameEditing(false);
            })
            .catch((err) => {
                console.error("Failed to rename route:", err);
                cancelNameEdit();
            })
            .finally(() => setNameSaving(false));
    }

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
                <div className="mb-6 -mt-1">
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard/", { replace: true })}
                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 py-2.5 px-4 font-semibold inline-flex items-center gap-2"
                        aria-label="Back to dashboard"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">
                    View route
                </h1>

                {/* Map: same style as record page – line + green dots, no pin on last point */}
                <div className="w-full max-w-xl aspect-square mx-auto rounded-xl overflow-hidden border border-slate-700/80 shadow-xl my-6">
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={DEFAULT_ZOOM}
                        scrollWheelZoom={true}
                        zoomControl={false}
                        className="h-full w-full rounded-xl z-0"
                    >
                        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
                        <FitRouteBounds points={route.points} />
                        {Array.isArray(route.points) && route.points.length >= 2 && (
                            <Polyline
                                positions={route.points.map((p) => [p.lat, p.lng])}
                                pathOptions={{ color: "#a7f3d0", weight: 5, opacity: 0.95 }}
                            />
                        )}
                        {Array.isArray(route.points) &&
                            route.points.map((pt, i) => (
                                <CircleMarker
                                    key={i}
                                    center={[pt.lat, pt.lng]}
                                    radius={3}
                                    pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1, weight: 1 }}
                                />
                            ))}
                    </MapContainer>
                </div>

                <dl className="space-y-4 text-sm sm:text-base">
                    <div>
                        <dt className="text-slate-400 font-medium">Name</dt>
                        <dd className="mt-0.5">
                            {nameEditing ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="text"
                                        value={nameDraft}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        className="flex-1 min-w-[12rem] max-w-md p-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-emerald-500"
                                        autoFocus
                                        disabled={nameSaving}
                                    />
                                    <button
                                        type="button"
                                        onClick={saveNameEdit}
                                        disabled={nameSaving || !nameDraft.trim()}
                                        className="rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50 py-2 px-4 text-sm font-semibold"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelNameEdit}
                                        disabled={nameSaving}
                                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 py-2 px-4 text-sm font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-white font-semibold">{route.name}</span>
                                    <button
                                        type="button"
                                        onClick={startNameEdit}
                                        className="rounded p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                                        title="Edit name"
                                        aria-label="Edit route name"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </dd>
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
                        <dt className="text-slate-400 font-medium">Distance</dt>
                        <dd className="text-slate-300 font-mono tabular-nums mt-0.5">{formatDistance(displayMetrics.distanceMeters)}</dd>
                    </div>
                    <div>
                        <dt className="text-slate-400 font-medium">Est. steps (~{STEPS_PER_MILE.toLocaleString()}/mi)</dt>
                        <dd className="text-slate-300 font-mono tabular-nums mt-0.5">
                            {displayMetrics.estimatedSteps.toLocaleString()}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-slate-400 font-medium">Pace</dt>
                        <dd className="text-slate-300 font-mono tabular-nums mt-0.5">
                            {formatPaceSecondsPerMi(displayMetrics.paceSecondsPerMi)}
                        </dd>
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
