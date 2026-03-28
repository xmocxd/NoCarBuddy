import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavBar from "./NavBar.jsx";

const pages = [
    { path: "signup/", title: "Sign Up" },
    { path: "login/", title: "Log In" },
];

describe("NavBar", () => {
    it("renders home and nav links", () => {
        render(
            <MemoryRouter>
                <NavBar pages={pages} />
            </MemoryRouter>
        );
        const links = screen.getAllByRole("link");
        expect(links[0]).toHaveAttribute("href", "/");
        expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup/");
        expect(screen.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login/");
    });
});
