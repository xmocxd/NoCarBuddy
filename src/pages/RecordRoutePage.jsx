import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext.jsx";
import L from "leaflet";
import NoSleep from "nosleep.js";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from "react-leaflet";
import {
    computeRouteMetrics,
    formatDistance,
    formatPaceSecondsPerMi,
} from "../utils/routeMetrics.js";
import { shouldAcceptGpsCandidate, acceptGpsPoint, DEFAULT_GPS_OUTLIER_MULTIPLIER } from "../utils/gpsOutlier.js";

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 19;
const LOCATION_ZOOM = 19;
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

/** Minimum time between recorded points (watchPosition may fire more often). */
const GPS_MIN_SAMPLE_INTERVAL_MS = 2000;

/** Keeps the map centered on the latest recorded GPS position as it updates. */
function FollowLatestPosition({ lastPosition }) {
    const map = useMap();
    const lat = lastPosition?.lat;
    const lng = lastPosition?.lng;
    useEffect(() => {
        if (!map || lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return;
        map.panTo([lat, lng], { animate: true, duration: 0.35, easeLinearity: 0.25 });
    }, [map, lat, lng]);
    return null;
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function getAutoRouteName(fromDate) {
    const d = fromDate || new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();
    return `Walk at ${year}-${month}-${day}-${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function RecordRoutePage() {
    const { user, loading: authLoading } = useAuth();
    const allowed = !!user && !authLoading;
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartedAt, setRecordingStartedAt] = useState(null);
    const [routeName, setRouteName] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [editingNameValue, setEditingNameValue] = useState("");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [saving, setSaving] = useState(false);
    const [routeId, setRouteId] = useState(null);
    const [points, setPoints] = useState([]);
    const [testMoveGpsEnabled, setTestMoveGpsEnabled] = useState(false);
    const testGpsFetchCountRef = useRef(0);
    const timerRef = useRef(null);
    const gpsWatchIdRef = useRef(null);
    const gpsPollIntervalRef = useRef(null);
    const lastGpsSampleAtRef = useRef(0);
    const gpsSegmentStateRef = useRef({
        lastAccepted: null,
        segmentDistSumMeters: 0,
        segmentCount: 0,
    });
    const hasAutoStartedRef = useRef(false);
    const pointsLogRef = useRef(null);
    const noSleepRef = useRef(null);
    const [keepScreenAwake, setKeepScreenAwake] = useState(true);
    const [wakeNeedsTap, setWakeNeedsTap] = useState(false);
    const navigate = useNavigate();

    const liveMetrics = useMemo(
        () => computeRouteMetrics(points, elapsedSeconds),
        [points, elapsedSeconds]
    );

    const getNoSleep = useCallback(() => {
        if (!noSleepRef.current) noSleepRef.current = new NoSleep();
        return noSleepRef.current;
    }, []);

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

    useEffect(() => {
        if (authLoading) return;
        if (!user) navigate("/login/", { replace: true });
    }, [authLoading, user, navigate]);

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
            hasAutoStartedRef.current = false;
        };
    }, [allowed]);

    useEffect(() => {
        if (!routeId || !isRecording) return;
        if (!navigator.geolocation) return;

        lastGpsSampleAtRef.current = 0;
        gpsSegmentStateRef.current = { lastAccepted: null, segmentDistSumMeters: 0, segmentCount: 0 };

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

        function applyTestOffset(lat, lng) {
            const count = testGpsFetchCountRef.current;
            testGpsFetchCountRef.current += 1;
            const baseDegrees = 0.00005 * (1 + count);
            return {
                lat: lat + (Math.random() * 2 - 1) * baseDegrees,
                lng: lng + (Math.random() * 2 - 1) * baseDegrees,
            };
        }

        function shouldAcceptGpsPoint(lat, lng) {
            return shouldAcceptGpsCandidate({ lat, lng }, gpsSegmentStateRef.current, DEFAULT_GPS_OUTLIER_MULTIPLIER);
        }

        function recordAcceptedGpsRefs(lat, lng) {
            gpsSegmentStateRef.current = acceptGpsPoint({ lat, lng }, gpsSegmentStateRef.current);
        }

        function recordSampleFromCoords(lat, lng) {
            const now = Date.now();
            if (now - lastGpsSampleAtRef.current < GPS_MIN_SAMPLE_INTERVAL_MS) return;

            let outLat = lat;
            let outLng = lng;
            if (testMoveGpsEnabled) {
                const o = applyTestOffset(lat, lng);
                outLat = o.lat;
                outLng = o.lng;
            }
            if (!shouldAcceptGpsPoint(outLat, outLng)) return;

            lastGpsSampleAtRef.current = now;
            recordAcceptedGpsRefs(outLat, outLng);
            addPoint(outLat, outLng);
        }

        function onPosition(pos) {
            recordSampleFromCoords(pos.coords.latitude, pos.coords.longitude);
        }

        function onError(err) {
            console.warn("Geolocation error:", err.message);
        }

        function pollCurrentPosition() {
            navigator.geolocation.getCurrentPosition(
                (pos) => onPosition(pos),
                onError,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        // Test mode: poll on an interval so we still get points when stationary (watchPosition often does not fire).
        if (testMoveGpsEnabled) {
            pollCurrentPosition();
            gpsPollIntervalRef.current = setInterval(pollCurrentPosition, GPS_MIN_SAMPLE_INTERVAL_MS);
            return () => {
                if (gpsPollIntervalRef.current != null) {
                    clearInterval(gpsPollIntervalRef.current);
                    gpsPollIntervalRef.current = null;
                }
            };
        }

        const watchId = navigator.geolocation.watchPosition(onPosition, onError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
        gpsWatchIdRef.current = watchId;

        return () => {
            if (gpsWatchIdRef.current != null) {
                navigator.geolocation.clearWatch(gpsWatchIdRef.current);
                gpsWatchIdRef.current = null;
            }
        };
    }, [routeId, isRecording, testMoveGpsEnabled]);

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

    useEffect(() => {
        const el = pointsLogRef.current;
        if (!el || points.length === 0) return;
        if (el.scrollHeight > 400) {
            el.scrollTop = el.scrollHeight;
        }
    }, [points.length]);

    if (!allowed) {
        return (
            <div className="w-full max-w-non px-4 sm:mx-0 px-0 sm:mx-0 sm:max-w-2xl sm:px-4 py-4 pt-20 text-center text-slate-300">
                Loading...
            </div>
        );
    }

    return (
        <div className="w-full max-w-none lg:mx-4 px-0 sm:max-w-2xl sm:mx-0 pt-20 pb-32">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-none sm:rounded-xl shadow-2xl lg:px-4 py-6 sm:px-0 sm:mx-0 border-y sm:border border-slate-700">
                <div className="mb-6 -mt-1 flex flex-row justify-between items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExit}
                        disabled={!isRecording || saving}
                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 px-4 font-semibold inline-flex items-center gap-2 shrink-0"
                        aria-label="Back to dashboard"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={() => setTestMoveGpsEnabled((on) => !on)}
                        className={`shrink-0 rounded-lg py-2 px-3 text-xs sm:text-sm font-semibold border-2 text-right leading-tight ${
                            testMoveGpsEnabled
                                ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-500"
                                : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        }`}
                        title={
                            testMoveGpsEnabled
                                ? "Test move GPS on — coords are offset"
                                : "Toggle fake GPS drift for testing (no real movement needed)"
                        }
                    >
                        Test move GPS{testMoveGpsEnabled ? " ON" : ""}
                    </button>
                </div>

                <div className="text-center py-2">
                    <div className="text-4xl sm:text-2xl md:text-4xl font-mono font-bold text-white tabular-nums">
                        {formatDuration(elapsedSeconds)}
                    </div>
                </div>

                <div className="w-full max-w-none sm:mx-0 sm:px-0 sm:max-w-xl aspect-square rounded-none sm:rounded-xl overflow-hidden border-y sm:border border-slate-700/80 shadow-xl mb-6">
                    <MapContainer
                        center={DEFAULT_CENTER}
                        zoom={DEFAULT_ZOOM}
                        maxZoom={LOCATION_ZOOM}
                        scrollWheelZoom={true}
                        zoomControl={false}
                        className="h-full w-full rounded-none sm:rounded-xl z-0"
                        style={{ height: '400px', width: '100%' }}
                    >
                        <TileLayer
                            attribution={OSM_ATTRIBUTION}
                            url={OSM_TILES}
                            maxZoom={LOCATION_ZOOM}
                            maxNativeZoom={19}
                        />
                        <FollowLatestPosition
                            lastPosition={points.length > 0 ? points[points.length - 1] : null}
                        />
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

                
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-center sm:text-left">
                    <div className="rounded-lg bg-slate-700/40 border border-slate-600 px-3 py-2">
                        <dt className="text-xs text-slate-400 font-medium">Distance</dt>
                        <dd className="text-white font-semibold font-mono tabular-nums mt-0.5">
                            {formatDistance(liveMetrics.distanceMeters)}
                        </dd>
                    </div>
                    <div className="rounded-lg bg-slate-700/40 border border-slate-600 px-3 py-2">
                        <dt className="text-xs text-slate-400 font-medium">Est. Steps</dt>
                        <dd className="text-white font-semibold font-mono tabular-nums mt-0.5">
                            {liveMetrics.estimatedSteps.toLocaleString()}
                        </dd>
                    </div>
                    <div className="rounded-lg bg-slate-700/40 border border-slate-600 px-3 py-2">
                        <dt className="text-xs text-slate-400 font-medium">Pace</dt>
                        <dd className="text-white font-semibold font-mono tabular-nums mt-0.5">
                            {formatPaceSecondsPerMi(liveMetrics.paceSecondsPerMi)}
                        </dd>
                    </div>
                </dl>


                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={handleExit}
                        disabled={!isRecording || saving}
                        className="rounded-lg bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 font-semibold"
                    >
                        Exit
                    </button>
                </div>

                <div className="my-6 p-4 rounded-lg bg-slate-700/50 border border-slate-600">
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

                <div className="my-6 p-4 rounded-lg border border-slate-600 bg-slate-800/40">
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
