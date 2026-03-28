import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import RecordRoutePage from "./RecordRoutePage.jsx";

vi.mock("../contexts/AuthContext.jsx", () => ({
    useAuth: () => ({
        user: null,
        loading: false,
        refreshUser: vi.fn(),
        logout: vi.fn(),
    }),
}));

vi.mock("nosleep.js", () => ({
    default: class {
        enable() {
            return Promise.resolve();
        }
        disable() {}
    },
}));

describe("RecordRoutePage", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "navigator",
            Object.assign(navigator, {
                geolocation: {
                    watchPosition: vi.fn(),
                    clearWatch: vi.fn(),
                    getCurrentPosition: vi.fn(),
                },
            })
        );
    });

    it("redirects unauthenticated users to login", async () => {
        const router = createMemoryRouter(
            [
                { path: "/login/", element: <div>Login screen</div> },
                { path: "/dashboard/record", element: <RecordRoutePage /> },
            ],
            { initialEntries: ["/dashboard/record"] }
        );
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/login/");
        });
    });
});
