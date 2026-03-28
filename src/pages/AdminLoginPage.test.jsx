import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import AdminLoginPage from "./AdminLoginPage.jsx";
import { renderWithMemoryRouter } from "../test/test-utils.jsx";

describe("AdminLoginPage", () => {
    it("shows admin login form", () => {
        renderWithMemoryRouter(<AdminLoginPage />);
        expect(screen.getByRole("heading", { name: /Admin Login/i })).toBeInTheDocument();
        expect(screen.getByText("Username")).toBeInTheDocument();
        expect(screen.getByText("Password")).toBeInTheDocument();
    });
});
