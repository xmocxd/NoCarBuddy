import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import SignUpPage from "./SignUpPage.jsx";
import { renderWithMemoryRouter } from "../test/test-utils.jsx";

describe("SignUpPage", () => {
    it("shows signup form fields", () => {
        renderWithMemoryRouter(<SignUpPage />);
        expect(screen.getByRole("heading", { name: /sign up/i })).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("First Name")).toBeInTheDocument();
        expect(screen.getByText("Last Name")).toBeInTheDocument();
    });
});
