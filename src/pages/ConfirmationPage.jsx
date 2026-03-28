import { useLocation } from 'react-router-dom';
import BackHomeButton from "./BackHomeButton.jsx";

function ConfirmationPage() {
    return (
        <div className="max-w-2xl mx-auto min-w-[600px] py-30  text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-slate-700">
                <h1 className="text-5xl font-bold mb-6 text-white">Thank You</h1>
                <p className="text-xl md:text-2xl text-slate-300 font-light mb-8">
                    {useLocation().state?.message || "Your submission has been received."}
                </p>
                <BackHomeButton />
            </div>
        </div>
    );
}

export default ConfirmationPage;