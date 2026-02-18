import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Eye, EyeOff, Loader2, User, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InputField = ({ icon: Icon, type, placeholder, value, onChange, showToggle, onToggle, show }) => (
    <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
            type={showToggle ? (show ? 'text' : 'password') : type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full bg-white/5 border border-border rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:bg-white/8 transition-all"
            required
        />
        {showToggle && (
            <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        )}
    </div>
);

const LoginPage = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '' });
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(form.username, form.password);
            } else {
                await register(form.username, form.password, form.full_name, form.email);
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                        <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">DataClone <span className="text-primary">AI</span></h1>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Forensic Framework</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    {/* Tab Switch */}
                    <div className="flex bg-white/5 rounded-xl p-1 mb-8">
                        {['login', 'register'].map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${mode === m ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                {m === 'login' ? 'Sign In' : 'Register'}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.form
                            key={mode}
                            initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                            transition={{ duration: 0.25 }}
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            {mode === 'register' && (
                                <>
                                    <InputField icon={User} type="text" placeholder="Full Name" value={form.full_name} onChange={set('full_name')} />
                                    <InputField icon={Mail} type="email" placeholder="Email Address" value={form.email} onChange={set('email')} />
                                </>
                            )}
                            <InputField icon={User} type="text" placeholder={mode === 'login' ? 'Username or Email' : 'Username'} value={form.username} onChange={set('username')} />
                            <InputField icon={Lock} type="password" placeholder="Password" value={form.password} onChange={set('password')} showToggle onToggle={() => setShowPass(s => !s)} show={showPass} />

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        </motion.form>
                    </AnimatePresence>

                    {mode === 'login' && (
                        <p className="text-center text-xs text-gray-600 mt-6">
                            Default: <span className="text-gray-400 font-mono">admin / admin123</span>
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
