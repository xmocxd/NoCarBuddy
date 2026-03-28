import BackHomeButton from "./BackHomeButton.jsx";

function NotFound() {
    return (
        <div className="max-w-2xl w-full text-center px-4 sm:px-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 lg:p-12 border border-slate-700">
                <h2 className="text-5xl sm:text-6xl font-bold text-white mb-3 sm:mb-4">404</h2>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-300 mb-4 sm:mb-6">Page Not Found</h3>
                <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8">Sorry, the page you are looking for does not exist.</p>
                <BackHomeButton />
            </div>
        </div>
    );
}

export default NotFound;    