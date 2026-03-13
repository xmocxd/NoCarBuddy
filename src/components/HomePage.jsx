import { Link } from "react-router-dom";

function HomePage() {
    return (
        <div className="max-w-2xl w-full">
            <div className="text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                        NoCarBuddy Test App
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 font-light">
                        Join our community today!
                    </p>
                    <p className="text-lg text-slate-400">
                        Sign up for an account to get started
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <Link to="/signup/" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer py-4 px-8 transition-all duration-200 font-semibold text-lg shadow-lg shadow-blue-600/50 hover:shadow-xl hover:shadow-blue-600/60 hover:scale-105 transform">
                            Get Started
                        </button>
                    </Link>
                    <button className="w-full sm:w-auto rounded-lg bg-slate-800 text-slate-300 border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700 py-4 px-8 transition-all duration-200 font-semibold text-lg cursor-not-allowed opacity-60">
                        Log In
                    </button>
                </div>

                <div className="pt-8 border-t border-slate-700 mt-12">
                    <p className="text-sm text-slate-500">
                        <Link to="/admin/">
                            <span className="font-semibold text-slate-400 hover:text-blue-400 transition-colors duration-200 inline-flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Administrator Login
                            </span>
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HomePage;