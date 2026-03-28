import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import axios from "axios";
import ViewRoutePage from "./ViewRoutePage.jsx";

vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
    },
}));

const sampleRoute = {
    id: 99,
    name: "Morning loop",
    points: [
        { lat: 40.0, lng: -74.0 },
        { lat: 40.001, lng: -74.0 },
    ],
    durationSeconds: 1800,
    recordedAt: new Date("2026-01-15T12:00:00Z").toISOString(),
    distanceMeters: 150,
    estimatedSteps: 200,
};

describe("ViewRoutePage", () => {
    beforeEach(() => {
        vi.mocked(axios.get).mockResolvedValue({ data: sampleRoute });
    });

    function renderViewRoute() {
        const router = createMemoryRouter(
            [{ path: "/dashboard/route/:id", element: <ViewRoutePage /> }],
            { initialEntries: ["/dashboard/route/99"] }
        );
        render(<RouterProvider router={router} />);
        return router;
    }

    it("loads route and shows title and metrics", async () => {
        renderViewRoute();
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/map-routes/99", expect.objectContaining({ withCredentials: true }));
        });
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /View route/i })).toBeInTheDocument();
        });
        expect(screen.getByText("Morning loop")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    });
});
