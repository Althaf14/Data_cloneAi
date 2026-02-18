import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const documentService = {
    upload: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/stats');
        return response.data;
    },

    getRecentScans: async (limit = 5) => {
        const response = await api.get(`/recent-scans?limit=${limit}`);
        return response.data;
    },

    getHealth: async () => {
        const response = await api.get('/health');
        return response.data;
    },

    getIdentityNetwork: async () => {
        const response = await api.get('/linkage/network');
        return response.data;
    }
};

export default api;
