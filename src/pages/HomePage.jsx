import { Link } from "react-router-dom";
import HomePageMap from "../components/HomePageMap.jsx";

function HomePage() {
    return (
        <div className="max-w-2xl w-full flex flex-col gap-8 my-20">
            <div className="text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                        NoCarBuddy
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 font-light">
                        Find your way through the world on your own terms.
                    </p>
                    <p className="text-lg text-slate-400">
                        Record and annotate Walking and Biking (TODO) paths you discover in your local area.
                        Link them together (TODO) to create enjoyable No-Car options to get to your favorite destinations.
                    </p>
                    <p className="text-lg text-red-400">
                        <em>PLEASE NOTE: This is a test / proof-of-concept app, and has GPS tracking limitations.
                        You must keep your phone open while using the app - it will not work as intended if you lock your phone.</em>
                    </p>
                    <p className="text-lg text-slate-400">
                        Sign up for an account to get started
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                    <Link to="/signup/" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 active:bg-emerald-800 cursor-pointer py-4 px-8 transition-all duration-200 font-semibold text-lg shadow-lg shadow-emerald-800/50 hover:shadow-xl hover:shadow-emerald-700/60 hover:scale-105 transform">
                            Get Started
                        </button>
                    </Link>
                    <Link to="/login/" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto rounded-lg bg-stone-800 text-stone-200 border-2 border-amber-800/80 hover:border-amber-700 hover:bg-stone-700/90 py-4 px-8 transition-all duration-200 font-semibold text-lg cursor-pointer hover:scale-105 transform">
                            Log In
                        </button>
                    </Link>
                </div>

                <div className="w-full max-w-xl aspect-square mx-auto rounded-xl overflow-hidden border border-slate-700/80 shadow-xl">
                    <HomePageMap className="h-full w-full" />
                </div>

                <div className="pt-8 border-t border-slate-700 mt-12">
                    <p className="text-sm text-slate-500">
                        <Link to="/admin/">
                            <span className="font-semibold text-slate-400 hover:text-emerald-400 transition-colors duration-200 inline-flex items-center gap-2">
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