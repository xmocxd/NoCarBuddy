import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

const DEFAULT_CENTER = [39.8283, -98.5795]; // US center
const DEFAULT_ZOOM = 4;
const LOCATION_ZOOM = 14;

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Bright emerald green matching app theme (same hue as nav/buttons) */
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

/**
 * Requests device location once, flies to it once, then does nothing else with the map.
 */
function LocationController({ onLocationFound, onError }) {
    const map = useMap();
    const doneRef = useRef(false);
    const onFoundRef = useRef(onLocationFound);
    const onErrorRef = useRef(onError);
    onFoundRef.current = onLocationFound;
    onErrorRef.current = onError;

    useEffect(() => {
        if (!map || doneRef.current) return;

        function onLocationFoundHandler(e) {
            if (doneRef.current) return;
            doneRef.current = true;
            map.flyTo(e.latlng, LOCATION_ZOOM, { duration: 1.5 });
            onFoundRef.current?.(e);
        }

        function onLocationErrorHandler(err) {
            if (doneRef.current) return;
            doneRef.current = true;
            onErrorRef.current?.(err);
        }

        map.on("locationfound", onLocationFoundHandler);
        map.on("locationerror", onLocationErrorHandler);
        map.locate({ setView: false, maxZoom: LOCATION_ZOOM, watch: false });

        return () => {
            map.off("locationfound", onLocationFoundHandler);
            map.off("locationerror", onLocationErrorHandler);
        };
    }, [map]);

    return null;
}

export default function HomePageMap({ className = "" }) {
    const [position, setPosition] = useState(null);
    const [locationStatus, setLocationStatus] = useState("loading"); // 'loading' | 'found' | 'denied' | 'unavailable' | 'error'

    function handleLocationFound(e) {
        setPosition(e.latlng);
        setLocationStatus("found");
    }

    function handleLocationError(e) {
        if (e.code === 1) setLocationStatus("denied");
        else if (e.code === 2) setLocationStatus("unavailable");
        else setLocationStatus("error");
    }

    return (
        <div className={`relative h-full w-full ${className}`}>
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom={true}
                zoomControl={false}
                className="h-full w-full rounded-xl z-0"
            >
                <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
                <LocationController
                    onLocationFound={handleLocationFound}
                    onError={handleLocationError}
                />
                {position && (
                    <Marker position={position} icon={greenPinIcon}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}
            </MapContainer>
            {locationStatus === "loading" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full bg-slate-800/90 text-slate-200 text-sm pointer-events-none">
                    Getting your location…
                </div>
            )}
            {locationStatus === "denied" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full bg-slate-800/90 text-slate-300 text-sm pointer-events-none">
                    Location denied. Enable location to see your area.
                </div>
            )}
            {(locationStatus === "unavailable" || locationStatus === "error") && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 rounded-full bg-slate-800/90 text-slate-300 text-sm pointer-events-none">
                    Location unavailable. Showing default view.
                </div>
            )}
        </div>
    );
}
