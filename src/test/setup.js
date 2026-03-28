import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

vi.mock("leaflet", () => {
    function DivIcon() {}
    return {
        default: {
            latLngBounds: () => ({
                isValid: () => true,
            }),
            DivIcon,
            Icon: {
                Default: {
                    mergeOptions: vi.fn(),
                    prototype: { _getIconUrl: vi.fn() },
                },
            },
        },
    };
});

vi.mock("react-leaflet", () => {
    const MapStub = ({ children }) =>
        React.createElement("div", { "data-testid": "leaflet-map" }, children);
    return {
        MapContainer: MapStub,
        TileLayer: () => null,
        Polyline: () => null,
        CircleMarker: () => null,
        Marker: () => null,
        Popup: () => null,
        useMap: () => ({
            fitBounds: vi.fn(),
            panTo: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            locate: vi.fn(),
        }),
    };
});
