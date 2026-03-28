import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import HomePage from "./HomePage.jsx";
import { renderWithMemoryRouter } from "../test/test-utils.jsx";

describe("HomePage", () => {
    it("shows title and primary actions", () => {
        renderWithMemoryRouter(<HomePage />);
        expect(screen.getByRole("heading", { name: /NoCarBuddy/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Get Started/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
    });

    it("links signup and login to the correct routes", () => {
        renderWithMemoryRouter(<HomePage />);
        expect(screen.getByRole("link", { name: /Get Started/i })).toHaveAttribute("href", "/signup/");
        expect(screen.getByRole("link", { name: /Log In/i })).toHaveAttribute("href", "/login/");
    });

    it("renders map placeholder for the hero map", () => {
        renderWithMemoryRouter(<HomePage />);
        expect(screen.getByTestId("leaflet-map")).toBeInTheDocument();
    });
});
