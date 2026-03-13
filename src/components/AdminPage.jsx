import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AdminPage() {
    const [users, setUsers] = useState([]);
    const [adminStatus, setAdminStatus] = useState(false);

    const navigate = useNavigate();

    async function checkAdmin() {
        try {
            // browser will automatically send the http-only cookie for the jwt token
            const response = await axios.get('/api/admin/check', { withCredentials: true });
            console.log('Protected data fetched:', response.data);
            setAdminStatus(true);
        } catch (error) {
            console.error('Failed to fetch protected data:', error);
            setAdminStatus(false);
            navigate('/admin/login');
        }
    };

    useEffect(() => {
        checkAdmin().then(() => {
            refreshUsers();
        });
    }, []);

    async function refreshUsers() {
        // get user list and update state
        axios.get('/api/users')
            .then(response => {
                setUsers(response.data);
            });
    }

    function deactivateUser(userId) {
        // update user state to deactivated
        let user = users.find(u => u.id === userId);
        axios.put(`/api/users/${userId}`, { ...user, state: 'deactivated' })
            .then(response => {
                refreshUsers();
            })
            .catch(error => {
                console.error('Error updating user:', error);
            });
    }

    function deleteUser(userId) {
        // delete user
        axios.delete(`/api/users/${userId}`)
            .then(() => {
                refreshUsers();
            }).catch(error => {
                console.error('Error deleting user:', error);
            });
    }

    async function logout() {
        try {
            await axios.post('/api/admin/logout', {}, { withCredentials: true });
            setAdminStatus(false);
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    if (!adminStatus) return null;
    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Admin Page</h1>
                    <button 
                        onClick={logout}
                        className="rounded-lg bg-slate-700 text-white hover:bg-slate-600 active:bg-slate-500 cursor-pointer py-2 px-4 transition-all duration-200 font-semibold shadow-lg hover:scale-105 transform flex items-center gap-2 text-sm sm:text-base"
                        title="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
                <p className="text-base sm:text-xl md:text-2xl text-slate-300 font-light mb-6 sm:mb-8">
                    View and Modify User Accounts <span className="text-green-400 block sm:inline mt-2 sm:mt-0">{adminStatus && "-- Admin Access OK"}</span>
                </p>
                <p className="text-base sm:text-lg mb-4 sm:mb-8 font-bold text-blue-300">Registered Users:</p>
                <div className="text-sm sm:text-base lg:text-lg text-slate-300 overflow-x-auto">
                    <table className="w-full table-auto border-collapse min-w-[640px]">
                        <thead>
                            <tr>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">ID</th>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">First Name</th>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">Last Name</th>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">Email</th>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">Status</th>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">Deactivate</th>
                                <th className="border-b border-slate-600 pb-2 px-2 text-left text-xs sm:text-sm lg:text-base">Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-700">
                                    <td className="border-b border-slate-600 py-2 px-2 text-xs sm:text-sm lg:text-base">{user.id}</td>
                                    <td className="border-b border-slate-600 py-2 px-2 text-xs sm:text-sm lg:text-base">{user.firstName}</td>
                                    <td className="border-b border-slate-600 py-2 px-2 text-xs sm:text-sm lg:text-base">{user.lastName}</td>
                                    <td className="border-b border-slate-600 py-2 px-2 text-xs sm:text-sm lg:text-base truncate max-w-[150px] sm:max-w-none">{user.email}</td>
                                    <td className={`border-b border-slate-600 py-2 px-2 text-xs sm:text-sm lg:text-base
                                        ${user.state === 'active' ? 'text-green-400' :
                                            user.state === 'pending' ? 'text-amber-400' : 'text-red-400'
                                        }
                                        `}>{user.state}</td>
                                    <td className="border-b border-slate-600 py-2 px-2">
                                        {user.state === 'active' ? (
                                            <button onClick={() => deactivateUser(user.id)} className="rounded-full bg-red-600 text-white hover:bg-red-700 active:bg-red-800 cursor-pointer p-1.5 sm:p-2 transition-all duration-200 hover:scale-110 transform" title="Deactivate">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        ) : ''}
                                    </td>
                                    <td className="border-b border-slate-600 py-2 px-2">
                                        {user.state === 'deactivated' || user.state === 'pending' ? (
                                            <button onClick={() => deleteUser(user.id)} className="rounded-full bg-red-600 text-white hover:bg-red-700 active:bg-red-800 cursor-pointer p-1.5 sm:p-2 transition-all duration-200 hover:scale-110 transform" title="Delete">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        ) : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;