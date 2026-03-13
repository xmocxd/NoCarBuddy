import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";

function AdminLoginPage() {
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    
    const navigate = useNavigate();

    function submit() {
        axios.post('/api/admin/login', { userName, password })
            .then(response => {
                console.log('Admin login successful:', response.data);
                navigate('/admin');
            })
            .catch(error => {
                console.error('Admin login failed:', error);
                setError('Login failed. Please check your credentials and try again.');
            });
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-white">Admin Login</h1>
                
                {error && <p className="text-base sm:text-xl md:text-2xl text-red-500 font-light mb-6 sm:mb-8">{error}</p>}

                <form className="space-y-4 sm:space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 text-sm sm:text-base" htmlFor="username">Username</label>
                        <input
                            className="w-full p-2.5 sm:p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                            type="text"
                            name="username"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-300 mb-2 text-sm sm:text-base" htmlFor="password">Password</label>
                        <input
                            className="w-full p-2.5 sm:p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="text-center">
                        <button onClick={(e) => { e.preventDefault(); submit(); }} className="mt-5 w-full sm:w-auto rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer py-3 px-6 sm:px-8 transition-all duration-200 font-semibold shadow-lg shadow-blue-600/50 hover:shadow-xl hover:shadow-blue-600/60 hover:scale-105 transform text-sm sm:text-base" type="submit">
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminLoginPage;