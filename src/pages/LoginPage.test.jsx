import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import axios from "axios";
import LoginPage from "./LoginPage.jsx";

vi.mock("axios", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../contexts/AuthContext.jsx", () => ({
    useAuth: () => ({
        user: null,
        loading: false,
        refreshUser: vi.fn().mockResolvedValue({}), 
        logout: vi.fn(),
    }),
}));

describe("LoginPage", () => {
    beforeEach(() => {
        vi.mocked(axios.post).mockResolvedValue({ data: {} });
    });

    function renderLogin() {
        const router = createMemoryRouter(
            [
                { path: "/login/", element: <LoginPage /> },
                { path: "/dashboard/", element: <div>Dashboard</div> },
            ],
            { initialEntries: ["/login/"] }
        );
        render(<RouterProvider router={router} />);
        return router;
    }

    it("renders email and password fields", () => {
        renderLogin();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    });

    it("submits credentials and navigates to dashboard on success", async () => {
        const user = userEvent.setup();
        const router = renderLogin();
        await user.type(screen.getByLabelText(/email/i), "test@example.com");
        await user.type(screen.getByLabelText(/password/i), "secretpass");
        await user.click(screen.getByRole("button", { name: /log in/i }));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "/api/users/login",
                { email: "test@example.com", password: "secretpass" },
                expect.objectContaining({ withCredentials: true })
            );
        });
        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/dashboard/");
        });
    });
});
