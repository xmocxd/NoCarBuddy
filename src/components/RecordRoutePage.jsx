import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import L from "leaflet";
import NoSleep from "nosleep.js";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from "react-leaflet";

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const LOCATION_ZOOM = 14;
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const PIN_GREEN = "#34d399";
const PIN_GREEN_DARK = "#059669";
const greenPinIcon = new L.DivIcon({
    className: "green-map-pin",
    html: `<svg width="28" height="41" viewBox="0 0 28 41" xmlns="http://www.w3.org/2000/svg" role="img">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 27 14 27s14-16.5 14-27C28 6.268 21.732 0 14 0z" fill="${PIN_GREEN}" stroke="${PIN_GREEN_DARK}" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="6" fill="white" fill-opacity="0.9"/>
    </svg>`,
    iconSize: [28, 41],
    iconAnchor: [14, 41],
    popupAnchor: [0, -41],
});

const GPS_POLL_INTERVAL_MS = 5000;

/** Flies the map to the first position once when it becomes available. */
function FlyToFirstPosition({ firstPosition }) {
    const map = useMap();
    const hasFlownRef = useRef(false);
    useEffect(() => {
        if (!firstPosition || !map || hasFlownRef.current) return;
        hasFlownRef.current = true;
        map.flyTo(firstPosition, LOCATION_ZOOM, { duration: 1.5 });
    }, [map, firstPosition]);
    return null;
}

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
    const [routeId, setRouteId] = useState(null);
    const [points, setPoints] = useState([]);
    // TEST FUNCTIONALITY - TO REMOVE: toggle to randomly offset GPS for testing
    const [testMoveGpsEnabled, setTestMoveGpsEnabled] = useState(false);
    const testGpsFetchCountRef = useRef(0);
    const timerRef = useRef(null);
    const gpsIntervalRef = useRef(null);
    const hasAutoStartedRef = useRef(false);
    const pointsLogRef = useRef(null);
    const noSleepRef = useRef(null);
    const [keepScreenAwake, setKeepScreenAwake] = useState(true);
    const [wakeNeedsTap, setWakeNeedsTap] = useState(false);
    const navigate = useNavigate();

    const getNoSleep = useCallback(() => {
        if (!noSleepRef.current) noSleepRef.current = new NoSleep();
        return noSleepRef.current;
    }, []);

    /** NoSleep.js: Wake Lock API or hidden looping video; reduces auto-lock while the page stays visible. */
    useEffect(() => {
        if (!allowed || !isRecording || !keepScreenAwake) {
            if (noSleepRef.current?.isEnabled) noSleepRef.current.disable();
            setWakeNeedsTap(false);
            return;
        }
        const ns = getNoSleep();
        ns.enable()
            .then(() => setWakeNeedsTap(false))
            .catch(() => setWakeNeedsTap(true));
        return () => {
            ns.disable();
        };
    }, [allowed, isRecording, keepScreenAwake, getNoSleep]);

    function handleWakeTap() {
        const ns = getNoSleep();
        ns.enable()
            .then(() => setWakeNeedsTap(false))
            .catch(() => {});
    }

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

    // Auto-start recording once when page becomes allowed: create route and start timer
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

        axios
            .post(
                "/api/map-routes",
                {
                    name: getAutoRouteName(new Date(start)),
                    recordedAt: new Date(start).toISOString(),
                    location: "",
                    points: [],
                    durationSeconds: null,
                },
                { withCredentials: true }
            )
            .then((res) => setRouteId(res.data.id))
            .catch((err) => console.error("Failed to create map route:", err));

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [allowed]);

    // GPS poll every 5 seconds (and once on start): append point to route when we have routeId
    useEffect(() => {
        if (!routeId || !isRecording) return;

        function addPoint(lat, lng) {
            axios
                .patch(
                    `/api/map-routes/${routeId}/points`,
                    { lat, lng },
                    { withCredentials: true }
                )
                .then(() => setPoints((prev) => [...prev, { lat, lng }]))
                .catch((err) => console.error("Failed to add route point:", err));
        }

        function fetchLocation() {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    let lat = pos.coords.latitude;
                    let lng = pos.coords.longitude;
                    // TEST FUNCTIONALITY - TO REMOVE: when enabled, offset coords for testing; base amount increases each fetch, random within same range
                    if (testMoveGpsEnabled) {
                        const count = testGpsFetchCountRef.current;
                        testGpsFetchCountRef.current += 1;
                        const baseDegrees = 0.00005 * (1 + count);
                        const range = baseDegrees;
                        lat += (Math.random() * 2 - 1) * range;
                        lng += (Math.random() * 2 - 1) * range;
                    }
                    addPoint(lat, lng);
                },
                (err) => console.warn("Geolocation error:", err.message),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        fetchLocation();
        gpsIntervalRef.current = setInterval(fetchLocation, GPS_POLL_INTERVAL_MS);

        return () => {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
                gpsIntervalRef.current = null;
            }
        };
    }, [routeId, isRecording, testMoveGpsEnabled]);

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
        try {
            if (routeId) {
                const rawName = editingName ? editingNameValue.trim() : (routeName && routeName.trim());
                const nameToSave = rawName || getAutoRouteName(recordingStartedAt ? new Date(recordingStartedAt) : new Date());
                await axios.patch(
                    `/api/map-routes/${routeId}`,
                    { durationSeconds: elapsedSeconds, name: nameToSave },
                    { withCredentials: true }
                );
            }
            if (action === "exit") {
                navigate("/dashboard/", { replace: true });
            } else {
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

    // Auto-scroll points log to bottom when it exceeds max height and new points are added
    useEffect(() => {
        const el = pointsLogRef.current;
        if (!el || points.length === 0) return;
        if (el.scrollHeight > 400) {
            el.scrollTop = el.scrollHeight;
        }
    }, [points.length]);

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
                <div className="text-center py-2">
                    <div className="text-4xl sm:text-2xl md:text-4xl font-mono font-bold text-white tabular-nums">
                        {formatDuration(elapsedSeconds)}
                    </div>
                </div>

                {/* Screen stay-awake (NoSleep.js); optional, battery-heavy; no effect if user locks screen */}
                <div className="mb-6 p-4 rounded-lg border border-slate-600 bg-slate-800/40">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-500 text-emerald-600 focus:ring-emerald-500"
                            checked={keepScreenAwake}
                            onChange={(e) => setKeepScreenAwake(e.target.checked)}
                            disabled={!isRecording}
                        />
                        <span>
                            <span className="font-medium text-white">Keep screen awake</span>
                            <span className="block text-sm text-slate-400 mt-1">
                                Reduces automatic screen lock while you record (uses more battery). Does not work if you lock the screen manually.
                            </span>
                        </span>
                    </label>
                    {wakeNeedsTap && keepScreenAwake && isRecording && (
                        <button
                            type="button"
                            onClick={handleWakeTap}
                            className="mt-3 w-full rounded-lg bg-amber-700/90 text-white hover:bg-amber-600 py-2 px-4 text-sm font-semibold"
                        >
                            Tap to enable screen wake
                        </button>
                    )}
                </div>

                {/* Map */}
                <div className="w-full max-w-xl aspect-square mx-auto rounded-xl overflow-hidden border border-slate-700/80 shadow-xl mb-6">
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={DEFAULT_ZOOM}
                        scrollWheelZoom={true}
                        zoomControl={false}
                        className="h-full w-full rounded-xl z-0"
                    >
                        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
                        <FlyToFirstPosition firstPosition={points.length > 0 ? points[0] : null} />
                        {points.length >= 2 && (
                            <Polyline
                                positions={points.map((p) => [p.lat, p.lng])}
                                pathOptions={{ color: "#a7f3d0", weight: 5, opacity: 0.95 }}
                            />
                        )}
                        {points.slice(0, -1).map((pt, i) => (
                            <CircleMarker
                                key={i}
                                center={[pt.lat, pt.lng]}
                                radius={3}
                                pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1, weight: 1 }}
                            />
                        ))}
                        {points.length > 0 && (
                            <Marker position={[points[points.length - 1].lat, points[points.length - 1].lng]} icon={greenPinIcon}>
                                <Popup>You are here</Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>


                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
                    {/* TEST FUNCTIONALITY - TO REMOVE: button to toggle test GPS offset */}
                    <button
                        type="button"
                        onClick={() => setTestMoveGpsEnabled((on) => !on)}
                        className={`rounded-lg py-3 px-6 font-semibold border-2 ${
                            testMoveGpsEnabled
                                ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-500"
                                : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        }`}
                        title={testMoveGpsEnabled ? "Test move GPS is ON – coords are offset" : "Toggle test GPS offset (for testing only)"}
                    >
                        TEST MOVE GPS {testMoveGpsEnabled ? "ON" : ""}
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

                {/* Point log: terminal-style list of each recorded point; scrollable when >400px, auto-scrolls to bottom */}
                <div
                    ref={pointsLogRef}
                    className="mt-6 rounded-lg border border-slate-600 bg-slate-900 p-3 font-mono text-sm text-slate-300 overflow-x-auto overflow-y-auto min-w-0 max-h-[400px]"
                >
                    <div className="text-slate-500 mb-1">Points recorded:</div>
                    {points.length === 0 ? (
                        <div className="text-slate-500">(none yet)</div>
                    ) : (
                        <div className="space-y-0.5">
                            {points.map((p, i) => (
                                <div key={i} className="whitespace-nowrap">{String(i + 1).padStart(4)}  {p.lat.toFixed(6)}, {p.lng.toFixed(6)}</div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default RecordRoutePage;
