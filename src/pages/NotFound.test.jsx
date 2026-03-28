import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import NotFound from "./NotFound.jsx";
import { renderWithMemoryRouter } from "../test/test-utils.jsx";

describe("NotFound", () => {
    it("shows 404 messaging and back link", () => {
        renderWithMemoryRouter(<NotFound />);
        expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Page Not Found/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Back to Home/i })).toHaveAttribute("href", "/");
    });
});
