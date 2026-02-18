import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Mail, Shield, Edit3, Save, X, Lock, Eye, EyeOff,
    Activity, FileSearch, AlertTriangle, CheckCircle, Clock,
    LogOut, Loader2, Key, Info, TrendingUp, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const timeAgo = (iso) => {
    if (!iso) return 'Never';
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getRiskColor = (r) => {
    if (r === 'critical' || r === 'high') return 'text-red-400 bg-red-400/10';
    if (r === 'medium') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-green-400 bg-green-400/10';
};

const getRiskLabel = (r) => {
    if (!r || r === 'unknown') return 'Pending';
    if (r === 'low') return 'Authentic';
    if (r === 'medium') return 'Suspicious';
    if (r === 'high') return 'High Risk';
    if (r === 'critical') return 'Forged';
    return r;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionCard = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`glass-card p-6 ${className}`}>
        <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-white">
            <Icon className="w-4 h-4 text-primary" />
            {title}
        </h3>
        {children}
    </div>
);

const StatBadge = ({ label, value, icon: Icon, color }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-border text-center">
        <div className={`p-2 rounded-lg mb-2 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-bold">{value ?? '—'}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
);

// ─── Main Profile Page ────────────────────────────────────────────────────────
const ProfilePage = () => {
    const { user, updateProfile, changePassword, logout, getUserStats, getRecentScans } = useAuth();
    const navigate = useNavigate();

    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', avatar_initials: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [showPw, setShowPw] = useState({ current: false, next: false });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');

    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [recentScans, setRecentScans] = useState([]);
    const [scansLoading, setScansLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setEditForm({
                full_name: user.full_name || '',
                email: user.email || '',
                avatar_initials: user.avatar_initials || '',
            });
        }
    }, [user]);

    useEffect(() => {
        getUserStats().then(setStats).catch(() => { }).finally(() => setStatsLoading(false));
        getRecentScans(5).then(setRecentScans).catch(() => { }).finally(() => setScansLoading(false));
    }, []);

    const handleSaveProfile = async () => {
        setEditLoading(true); setEditError(''); setEditSuccess('');
        try {
            await updateProfile(editForm);
            setEditSuccess('Profile updated successfully!');
            setEditMode(false);
            setTimeout(() => setEditSuccess(''), 3000);
        } catch (err) {
            setEditError(err.response?.data?.detail || 'Failed to update profile');
        } finally {
            setEditLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
        if (pwForm.next.length < 6) { setPwError('Password must be at least 6 characters'); return; }
        setPwLoading(true); setPwError(''); setPwSuccess('');
        try {
            await changePassword(pwForm.current, pwForm.next);
            setPwSuccess('Password changed successfully!');
            setPwForm({ current: '', next: '', confirm: '' });
            setTimeout(() => setPwSuccess(''), 3000);
        } catch (err) {
            setPwError(err.response?.data?.detail || 'Failed to change password');
        } finally {
            setPwLoading(false);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    if (!user) return null;

    const initials = user.avatar_initials || (user.full_name || user.username).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* ── Profile Hero Card ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-accent p-[3px]">
                            <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center text-3xl font-bold">
                                {initials}
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-card" title="Online" />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold">{user.full_name || user.username}</h2>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                                {user.role === 'admin' ? '⚡ Admin' : '🔬 Forensic Analyst'}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-1">@{user.username}</p>
                        {user.email && <p className="text-gray-500 text-sm flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>}
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Member since {formatDate(user.created_at)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last login {timeAgo(user.last_login)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setEditMode(m => !m)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium">
                            <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium">
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </div>
                </div>

                {editSuccess && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" /> {editSuccess}
                    </motion.div>
                )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left Column ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Edit Profile */}
                    {editMode && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <SectionCard title="Edit Profile" icon={Edit3}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                                        <input
                                            value={editForm.full_name}
                                            onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Avatar Initials (2 chars)</label>
                                        <input
                                            value={editForm.avatar_initials}
                                            onChange={e => setEditForm(f => ({ ...f, avatar_initials: e.target.value.toUpperCase().slice(0, 2) }))}
                                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                                            placeholder="e.g. FA"
                                            maxLength={2}
                                        />
                                    </div>
                                    {editError && <p className="text-red-400 text-sm flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{editError}</p>}
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={handleSaveProfile} disabled={editLoading} className="flex items-center gap-2 btn-primary py-2 px-5 text-sm disabled:opacity-60">
                                            {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Changes
                                        </button>
                                        <button onClick={() => { setEditMode(false); setEditError(''); }} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm">
                                            <X className="w-4 h-4" /> Cancel
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>
                        </motion.div>
                    )}

                    {/* Activity Stats */}
                    <SectionCard title="Activity Statistics" icon={TrendingUp}>
                        {statsLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatBadge label="Total Scans" value={stats?.total_scans} icon={FileSearch} color="bg-primary/10 text-primary" />
                                <StatBadge label="Forgeries Found" value={stats?.forgeries_found} icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
                                <StatBadge label="Authentic Docs" value={stats?.authentic_docs} icon={CheckCircle} color="bg-green-500/10 text-green-400" />
                                <StatBadge label="Success Rate" value={stats ? `${stats.success_rate}%` : null} icon={TrendingUp} color="bg-accent/10 text-accent" />
                            </div>
                        )}
                    </SectionCard>

                    {/* Recent Activity */}
                    <SectionCard title="Recent Scan Activity" icon={Activity}>
                        {scansLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
                            </div>
                        ) : recentScans.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No scans yet. Upload a document to get started.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentScans.map(scan => (
                                    <div key={scan.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${scan.risk_level === 'critical' || scan.risk_level === 'high' ? 'bg-red-400 animate-ping' : 'bg-green-400'}`} />
                                            <div>
                                                <p className="text-sm font-medium truncate max-w-[200px]">{scan.filename}</p>
                                                <p className="text-xs text-gray-500">{scan.document_type !== 'unknown' ? scan.document_type : 'Document'} · {timeAgo(scan.upload_date)}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getRiskColor(scan.risk_level)}`}>
                                            {getRiskLabel(scan.risk_level)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* ── Right Column ── */}
                <div className="space-y-6">
                    {/* Change Password */}
                    <SectionCard title="Security" icon={Key}>
                        <form onSubmit={handleChangePassword} className="space-y-3">
                            {[
                                { key: 'current', label: 'Current Password', show: showPw.current, toggle: () => setShowPw(s => ({ ...s, current: !s.current })) },
                                { key: 'next', label: 'New Password', show: showPw.next, toggle: () => setShowPw(s => ({ ...s, next: !s.next })) },
                                { key: 'confirm', label: 'Confirm New Password', show: showPw.next, toggle: null },
                            ].map(({ key, label, show, toggle }) => (
                                <div key={key}>
                                    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                        <input
                                            type={show ? 'text' : 'password'}
                                            value={pwForm[key]}
                                            onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="w-full bg-white/5 border border-border rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                        {toggle && (
                                            <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                                {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {pwError && <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{pwError}</p>}
                            {pwSuccess && <p className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />{pwSuccess}</p>}
                            <button type="submit" disabled={pwLoading} className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-1">
                                {pwLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                                Update Password
                            </button>
                        </form>
                    </SectionCard>

                    {/* System Info */}
                    <SectionCard title="System Info" icon={Info}>
                        <div className="space-y-3 text-sm">
                            {[
                                { label: 'User ID', value: `#${user.id}` },
                                { label: 'Role', value: user.role === 'admin' ? '⚡ Admin' : '🔬 Analyst' },
                                { label: 'Account Status', value: '✅ Active' },
                                { label: 'API Access', value: user.role === 'admin' ? 'Full Access' : 'Read + Write' },
                                { label: 'Auth Method', value: 'JWT Bearer' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-medium text-xs">{value}</span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Quick Actions */}
                    <SectionCard title="Quick Actions" icon={Shield}>
                        <div className="space-y-2">
                            <button onClick={() => navigate('/')} className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary transition-all text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Go to Dashboard
                            </button>
                            <button onClick={() => navigate('/analysis')} className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary transition-all text-sm flex items-center gap-2">
                                <FileSearch className="w-4 h-4" /> Document Analysis
                            </button>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm flex items-center gap-2 text-gray-400">
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
