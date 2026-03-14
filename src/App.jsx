import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import HomePage from "./components/HomePage.jsx";
import NotFound from "./components/NotFound.jsx";
import AdminPage from "./components/AdminPage.jsx";
import SignUpPage from "./components/SignUpPage.jsx";
import ConfirmationPage from "./components/ConfirmationPage.jsx";
import SetPasswordPage from "./components/SetPasswordPage.jsx";
import LoginPage from "./components/LoginPage.jsx";
import DashboardPage from "./components/DashboardPage.jsx";
import AdminLoginPage from "./components/AdminLoginPage.jsx";

const pages = [
    { path: "signup/", title: "Sign Up" },
    { path: "login/", title: "Log In" },
    { path: "dashboard/", title: "Dashboard" },
    { path: "admin/", title: "Admin" },
]

const router = createBrowserRouter([
    {
        // main element to display routes within
        element: (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
                <NavBar pages={pages} />
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
            { path: "set-password/", element: <SetPasswordPage /> },
            { path: "confirmation/", element: <ConfirmationPage /> },
            { path: "*", element: <NotFound /> },
        ],
    },
]);

function App ()
{
    
    return (
        <>
        <RouterProvider router={router} />
        </>
    );
}

export default App;