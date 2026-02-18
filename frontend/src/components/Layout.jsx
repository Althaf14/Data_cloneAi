import React from 'react';
import Sidebar from './Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const displayName = user?.full_name || user?.username || 'User';
    const initials = user?.avatar_initials ||
        displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex min-h-screen bg-background text-gray-100">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-widest">Secure Forensics</h2>
                        <p className="text-2xl font-semibold">System Overview</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium">{displayName}</p>
                            <p className="text-xs text-secondary">System Online</p>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] hover:scale-110 transition-transform"
                            title="View Profile"
                        >
                            <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-bold text-xs">
                                {initials}
                            </div>
                        </button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Layout;
