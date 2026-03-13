import { Link } from 'react-router-dom';

function BackHomeButton() {
    return (
        <Link to="/">
            <button className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer py-3 px-6 transition-all duration-200 font-semibold shadow-lg shadow-blue-600/50 hover:shadow-xl hover:shadow-blue-600/60 hover:scale-105 transform inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Back to Home
            </button>
        </Link>
    );
}

export default BackHomeButton;