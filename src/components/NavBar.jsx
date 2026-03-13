import { NavLink } from "react-router-dom";

function NavBar({ pages }) {
    return (
        <nav className="bg-linear-120 from-blue-700 to-blue-900 p-3 sm:p-4 text-white flex flex-row flex-wrap sm:flex-nowrap gap-2 sm:gap-0 sm:space-x-3 py-2 sm:py-3 px-3 sm:px-6 shadow-lg justify-end fixed top-0 left-0 w-full z-10">
            <NavLink to="/" className="mr-2 sm:mr-4 hover:underline hover:decoration-dotted decoration-dotted justify-self-start grow flex items-center gap-1 sm:gap-2 transition-all duration-300 hover:text-blue-300 text-sm sm:text-base">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Home</span>
            </NavLink>

            {pages.map(({ path, title }, index) => {
                return (
                    <NavLink key={index} to={path} className="mr-2 sm:mr-4 hover:underline hover:decoration-dotted decoration-dotted transition-all duration-300 hover:text-blue-300 text-sm sm:text-base whitespace-nowrap">
                        {title}
                    </NavLink>
                )
            })}
        </nav>
    );
};

export default NavBar;