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
 * Record map route page: auto-starts recording on load, shows a live timer, and provides
 * Stop and Exit. Both open a naming dialog; saving uses the auto name first, then optionally
 * updates the name via a second API call. Stop keeps you on the page; Exit returns to dashboard.
 */
function RecordRoutePage() {
    const [allowed, setAllowed] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartedAt, setRecordingStartedAt] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogAction, setDialogAction] = useState(null); // 'stop' | 'exit'
    const [dialogName, setDialogName] = useState("");
    const [saving, setSaving] = useState(false);
    const timerRef = useRef(null);
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

    // Auto-start recording when page is allowed and we're not already in a recording state
    useEffect(() => {
        if (!allowed || recordingStartedAt !== null) return;
        const start = Date.now();
        setRecordingStartedAt(start);
        setIsRecording(true);
        setElapsedSeconds(0);

        timerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => Math.floor((Date.now() - start) / 1000) || prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [allowed, recordingStartedAt]);

    // When we stop the timer (user clicked Stop or Exit), clear the interval and freeze elapsed
    function stopTimer() {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
    }

    function openNameDialog(action) {
        setDialogAction(action);
        setDialogName("");
        setDialogOpen(true);
    }

    function closeDialog(cancel) {
        setDialogOpen(false);
        setDialogAction(null);
        if (cancel && dialogAction === "stop") {
            // Resume recording: restart timer from current elapsed
            const start = Date.now() - elapsedSeconds * 1000;
            setRecordingStartedAt(start);
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        }
    }

    function handleStopRecording() {
        stopTimer();
        openNameDialog("stop");
    }

    function handleExit() {
        stopTimer();
        openNameDialog("exit");
    }

    async function saveAndMaybeNavigate(customName) {
        if (saving) return;
        setSaving(true);
        const startTime = recordingStartedAt ? new Date(recordingStartedAt) : new Date();
        const autoName = getAutoRouteName(startTime);

        try {
            const createRes = await axios.post(
                "/api/map-routes",
                {
                    name: autoName,
                    recordedAt: startTime.toISOString(),
                    location: "",
                    points: [],
                    durationSeconds: elapsedSeconds,
                },
                { withCredentials: true }
            );
            const routeId = createRes.data.id;

            if (customName && customName.trim()) {
                await axios.put(
                    `/api/map-routes/${routeId}`,
                    { name: customName.trim() },
                    { withCredentials: true }
                );
            }

            if (dialogAction === "exit") {
                navigate("/dashboard/", { replace: true });
            } else {
                closeDialog(false);
                setRecordingStartedAt(null);
                setElapsedSeconds(0);
                setSaving(false);
                // Optionally start a new recording automatically; for now we just stay on page with timer at 0
                // and user can go back via link. Or we could auto-restart. User said "stop stays on the page" - so we stay.
            }
        } catch (err) {
            console.error("Failed to save map route:", err);
            setSaving(false);
        }
    }

    function handleDialogOk() {
        saveAndMaybeNavigate(dialogName.trim() || null);
    }

    function handleDialogCancel() {
        if (dialogAction === "exit") {
            saveAndMaybeNavigate(null);
        } else {
            closeDialog(true);
        }
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
                <p className="text-slate-400 text-sm mb-8">
                    {isRecording ? "Recording in progress…" : "Recording stopped."}
                </p>

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
                        onClick={handleStopRecording}
                        disabled={!isRecording || saving}
                        className="rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 font-semibold"
                    >
                        Stop recording
                    </button>
                    <button
                        type="button"
                        onClick={handleExit}
                        disabled={!isRecording || saving}
                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 font-semibold"
                    >
                        Exit
                    </button>
                </div>

                <p className="mt-8 text-center">
                    <Link to="/dashboard/" className="text-slate-400 hover:text-white text-sm">
                        Back to Dashboard
                    </Link>
                </p>
            </div>

            {/* Name dialog: OK, Cancel, X (same as Cancel) */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" aria-modal="true" role="dialog">
                    <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600 w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-600">
                            <h2 className="text-lg font-semibold text-white">Name your map route</h2>
                            <button
                                type="button"
                                onClick={() => handleDialogCancel()}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                value={dialogName}
                                onChange={(e) => setDialogName(e.target.value)}
                                placeholder="Optional custom name"
                                className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-slate-600">
                            <button
                                type="button"
                                onClick={handleDialogCancel}
                                className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 py-2 px-4 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDialogOk}
                                disabled={saving}
                                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 py-2 px-4 font-semibold"
                            >
                                {saving ? "Saving…" : "OK"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecordRoutePage;
