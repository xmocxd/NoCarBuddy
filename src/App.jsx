import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import HomePage from "./pages/HomePage.jsx";
import NotFound from "./pages/NotFound.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import ConfirmationPage from "./pages/ConfirmationPage.jsx";
import SetPasswordPage from "./pages/SetPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RecordRoutePage from "./pages/RecordRoutePage.jsx";
import ViewRoutePage from "./pages/ViewRoutePage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";

const navLinks = [
    { path: "signup/", title: "Sign Up" },
    { path: "login/", title: "Log In" },
    { path: "dashboard/", title: "Dashboard" },
    { path: "admin/", title: "Admin" },
];

const router = createBrowserRouter([
    {
        element: (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 lg:px-4 sm:px-0">
                <NavBar pages={navLinks} />
                <Outlet />
            </div>
        ),
        children: [
            { path: "/", element: <HomePage /> },
            { path: "admin/", element: <AdminPage /> },
            { path: "admin/login", element: <AdminLoginPage /> },
            { path: "signup/", element: <SignUpPage /> },
            { path: "login/", element: <LoginPage /> },
            { path: "dashboard/", element: <DashboardPage /> },
            { path: "dashboard/record", element: <RecordRoutePage /> },
            { path: "dashboard/route/:id", element: <ViewRoutePage /> },
            { path: "set-password/", element: <SetPasswordPage /> },
            { path: "confirmation/", element: <ConfirmationPage /> },
            { path: "*", element: <NotFound /> },
        ],
    },
]);

export default function App() {
    return <RouterProvider router={router} />;
}
