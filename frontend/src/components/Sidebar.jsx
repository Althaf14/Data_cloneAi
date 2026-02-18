import React from 'react';
import { LayoutDashboard, ShieldAlert, FileSearch, Users, History, Settings, LogOut, UserCircle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, to }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                ? 'bg-primary/20 text-primary border-r-4 border-primary'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`
        }
    >
        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="font-medium">{label}</span>
    </NavLink>
);

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-64 h-screen bg-card border-r border-border fixed left-0 top-0 flex flex-col p-4 z-50">
            <div className="flex items-center gap-3 px-4 py-6 mb-8">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">DataClone <span className="text-primary">AI</span></h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Forensic Framework</p>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
                <SidebarItem icon={FileSearch} label="Document Analysis" to="/analysis" />
                <SidebarItem icon={Users} label="Identity Linkage" to="/linkage" />
                <SidebarItem icon={History} label="Audit Logs" to="/logs" />
            </nav>

            <div className="pt-4 mt-4 border-t border-border space-y-2">
                <SidebarItem icon={UserCircle} label="Profile" to="/profile" />
                <SidebarItem icon={Settings} label="Settings" to="/settings" />
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
