import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import DashboardPage from "./DashboardPage.jsx";
import { renderWithMemoryRouter } from "../test/test-utils.jsx";

vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../contexts/AuthContext.jsx", () => ({
    useAuth: () => ({
        user: { email: "runner@example.com", firstName: "Riley" },
        loading: false,
        logout: vi.fn(() => Promise.resolve()),
    }),
}));

describe("DashboardPage", () => {
    beforeEach(() => {
        vi.mocked(axios.get).mockImplementation((url) => {
            if (String(url).endsWith("/api/map-routes")) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error(`unmocked GET ${url}`));
        });
    });

    it("welcomes the user and lists routes section", async () => {
        renderWithMemoryRouter(<DashboardPage />);
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /Welcome, Riley/i })).toBeInTheDocument();
        });
        expect(screen.getByText(/Your recorded routes/i)).toBeInTheDocument();
        expect(screen.getByText(/No routes yet/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Log out/i })).toBeInTheDocument();
    });
});
