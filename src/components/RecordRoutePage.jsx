import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

/**
 * Format seconds as HH:MM:SS (e.g. 01:05:23).
 */
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Auto-name for a new map route: "Walk at YYYY-M-D-HH:MM" (e.g. "Walk at 2026-1-1-03:05").
 */
function getAutoRouteName(fromDate) {
    const d = fromDate || new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();
    return `Walk at ${year}-${month}-${day}-${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Record map route page: auto-starts recording on load, shows a live timer and route name.
 * Stop and Exit save with the current (auto or edited) name; no prompt. Stop keeps you on the page; Exit returns to dashboard.
 */
function RecordRoutePage() {
    const [allowed, setAllowed] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartedAt, setRecordingStartedAt] = useState(null);
    const [routeName, setRouteName] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [editingNameValue, setEditingNameValue] = useState("");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [saving, setSaving] = useState(false);
    const timerRef = useRef(null);
    const hasAutoStartedRef = useRef(false);
    const navigate = useNavigate();

    // Auth check on mount
    useEffect(() => {
        axios
            .get("/api/users/me", { withCredentials: true })
            .then(() => setAllowed(true))
            .catch((err) => {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate("/login/", { replace: true });
                }
            });
    }, [navigate]);

    // Auto-start recording once when page becomes allowed (ref prevents re-run from clearing the interval)
    useEffect(() => {
        if (!allowed || hasAutoStartedRef.current) return;
        hasAutoStartedRef.current = true;
        const start = Date.now();
        setRecordingStartedAt(start);
        setRouteName(getAutoRouteName(new Date(start)));
        setIsRecording(true);
        setElapsedSeconds(0);

        timerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => Math.floor((Date.now() - start) / 1000) || prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [allowed]);

    // When we stop the timer (user clicked Stop or Exit), clear the interval and freeze elapsed
    function stopTimer() {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
    }

    async function saveRoute(action) {
        if (saving) return;
        setSaving(true);
        const startTime = recordingStartedAt ? new Date(recordingStartedAt) : new Date();
        const rawName = editingName ? editingNameValue.trim() : (routeName && routeName.trim());
        const nameToSave = rawName || getAutoRouteName(startTime);

        try {
            await axios.post(
                "/api/map-routes",
                {
                    name: nameToSave,
                    recordedAt: startTime.toISOString(),
                    location: "",
                    points: [],
                    durationSeconds: elapsedSeconds,
                },
                { withCredentials: true }
            );

            if (action === "exit") {
                navigate("/dashboard/", { replace: true });
            } else {
                setRecordingStartedAt(null);
                setRouteName("");
                setEditingName(false);
                setElapsedSeconds(0);
                setSaving(false);
            }
        } catch (err) {
            console.error("Failed to save map route:", err);
            setSaving(false);
        }
    }

    function handleExit() {
        stopTimer();
        saveRoute("exit");
    }

    function startEditName() {
        setEditingNameValue(routeName);
        setEditingName(true);
    }

    function saveEditName() {
        const trimmed = editingNameValue.trim();
        if (trimmed) setRouteName(trimmed);
        setEditingName(false);
    }

    function cancelEditName() {
        setEditingName(false);
    }

    if (!allowed) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20 text-center text-slate-300">
                Loading...
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 pt-20 pb-32">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-700">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    Recording map route
                </h1>
                <p className="text-slate-400 text-sm mb-4">
                    {isRecording ? "Recording in progress…" : "Recording stopped."}
                </p>

                {/* Prominent route name with edit */}
                <div className="mb-6 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                    {editingName ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                placeholder="Route name"
                                className="flex-1 min-w-[200px] p-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={saveEditName}
                                className="rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 py-2 px-4 font-semibold"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={cancelEditName}
                                className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 py-2 px-4 font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-lg sm:text-xl font-semibold text-white break-words">
                                {routeName || "Unnamed route"}
                            </span>
                            <button
                                type="button"
                                onClick={startEditName}
                                className="shrink-0 rounded p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-600"
                                title="Edit route name"
                                aria-label="Edit route name"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Large live timer */}
                <div className="text-center py-8 sm:py-12">
                    <div className="text-5xl sm:text-6xl md:text-7xl font-mono font-bold text-white tabular-nums">
                        {formatDuration(elapsedSeconds)}
                    </div>
                    <p className="text-slate-400 text-sm mt-2">Duration</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">

                    <button
                        type="button"
                        onClick={handleExit}
                        disabled={!isRecording || saving}
                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 font-semibold"
                    >
                        Exit
                    </button>
                </div>

            </div>
        </div>
    );
}

export default RecordRoutePage;
