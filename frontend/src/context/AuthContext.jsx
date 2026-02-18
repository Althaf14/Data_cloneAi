import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';
const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('dc_token'));
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const restore = async () => {
            const saved = localStorage.getItem('dc_token');
            if (!saved) { setLoading(false); return; }
            try {
                const res = await axios.get(`${API}/auth/me`, {
                    headers: { Authorization: `Bearer ${saved}` }
                });
                setUser(res.data);
                setToken(saved);
            } catch {
                localStorage.removeItem('dc_token');
                setToken(null);
            } finally {
                setLoading(false);
            }
        };
        restore();
    }, []);

    const login = useCallback(async (username, password) => {
        const form = new URLSearchParams();
        form.append('username', username);
        form.append('password', password);
        const res = await axios.post(`${API}/auth/login`, form, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const { access_token, user: userData } = res.data;
        localStorage.setItem('dc_token', access_token);
        setToken(access_token);
        setUser(userData);
        return userData;
    }, []);

    const register = useCallback(async (username, password, full_name, email) => {
        const res = await axios.post(`${API}/auth/register`, { username, password, full_name, email });
        const { access_token, user: userData } = res.data;
        localStorage.setItem('dc_token', access_token);
        setToken(access_token);
        setUser(userData);
        return userData;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('dc_token');
        setToken(null);
        setUser(null);
    }, []);

    const updateProfile = useCallback(async (data) => {
        const saved = localStorage.getItem('dc_token');
        const res = await axios.put(`${API}/auth/me`, data, {
            headers: { Authorization: `Bearer ${saved}` }
        });
        setUser(res.data);
        return res.data;
    }, []);

    const changePassword = useCallback(async (current_password, new_password) => {
        const saved = localStorage.getItem('dc_token');
        await axios.post(`${API}/auth/change-password`, { current_password, new_password }, {
            headers: { Authorization: `Bearer ${saved}` }
        });
    }, []);

    const getUserStats = useCallback(async () => {
        const saved = localStorage.getItem('dc_token');
        const res = await axios.get(`${API}/auth/user-stats`, {
            headers: { Authorization: `Bearer ${saved}` }
        });
        return res.data;
    }, []);

    const getRecentScans = useCallback(async (limit = 5) => {
        const saved = localStorage.getItem('dc_token');
        const res = await axios.get(`${API}/recent-scans?limit=${limit}`, {
            headers: { Authorization: `Bearer ${saved}` }
        });
        return res.data;
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, changePassword, getUserStats, getRecentScans }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
