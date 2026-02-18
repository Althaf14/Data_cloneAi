import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, Network, AlertTriangle, Search, FileText,
    Calendar, Hash, Fingerprint, Shield
} from 'lucide-react';
import { documentService } from '../services/api';

const IdentityCard = ({ group }) => {
    const isSuspicious = group.document_count > 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 border-l-4 ${isSuspicious ? 'border-l-orange-500' : 'border-l-green-500'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {group.primary_name || 'Unknown Identity'}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Hash className="w-3 h-3" /> ID: {group.primary_id || 'N/A'}
                    </p>
                </div>
                {isSuspicious && (
                    <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wide border border-orange-500/20">
                        Linked ({group.document_count})
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {group.documents.map((doc, i) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-white/5 text-sm">
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                                <p className="text-gray-300 text-xs">{doc.filename}</p>
                                <p className="text-[10px] text-gray-600 uppercase">{doc.type}</p>
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-500">
                            {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const IdentityLinkagePage = () => {
    const [network, setNetwork] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNetwork = async () => {
            try {
                const data = await documentService.getIdentityNetwork();
                setNetwork(data);
            } catch (err) {
                console.error("Failed to fetch identity network:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNetwork();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!network || network.groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-lg mx-auto p-8">
                <Users className="w-20 h-20 text-gray-700/50 mb-6" />
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-3">No Identity Data</h2>
                <p className="text-gray-400 mb-8 max-w-sm">No identity documents have been analyzed yet. Upload documents to start visualizing the identity graph.</p>
                <div className="grid grid-cols-2 gap-4 w-full text-xs text-gray-500">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                        <Fingerprint className="w-6 h-6 mb-2 mx-auto text-primary/50" />
                        <p>Analyze ID proofs to extract identity data</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                        <Network className="w-6 h-6 mb-2 mx-auto text-accent/50" />
                        <p>Automatically link related documents</p>
                    </div>
                </div>
            </div>
        );
    }

    const { stats, groups } = network;

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto">
            <header>
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Network className="w-6 h-6 text-primary" />
                    Identity Linkage Graph
                </h1>
                <p className="text-gray-500 text-sm">
                    Visualizing connections between <span className="text-white font-bold">{stats.total_documents_analyzed}</span> analyzed documents.
                </p>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-primary">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Fingerprint className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold">{stats.unique_identities}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">Unique Identities</p>
                    </div>
                </div>
                <div className={`glass-card p-6 flex items-center gap-4 border-l-4 ${stats.linked_groups > 0 ? 'border-l-orange-500' : 'border-l-gray-700'}`}>
                    <div className={`p-3 rounded-full ${stats.linked_groups > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-700/10 text-gray-500'}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold">{stats.linked_groups}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">Linked Clusters</p>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-green-500">
                    <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-green-400">System Active</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">Status</p>
                    </div>
                </div>
            </div>

            {/* Grid of Identities */}
            <h2 className="text-lg font-bold border-b border-white/10 pb-4 mb-4">Detected Identity Clusters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group, index) => (
                    <motion.div
                        key={group.group_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className={`glass-card p-0 overflow-hidden`}>
                            <div className="p-5 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${group.document_count > 1 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-gray-700/50 text-gray-400'}`}>
                                            {group.primary_name ? group.primary_name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white leading-tight">
                                                {group.primary_name || 'Unknown Identity'}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-mono">
                                                <Hash className="w-3 h-3" /> {group.primary_id || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    {group.document_count > 1 && (
                                        <span className="tooltip" title="Multiple documents linked to this identity">
                                            <Network className="w-5 h-5 text-orange-500" />
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-black/20">
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Linked Documents ({group.document_count})
                                </p>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {group.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group cursor-default">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${group.document_count > 1 ? 'bg-orange-400' : 'bg-gray-500'}`} />
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-300 truncate group-hover:text-white transition-colors">{doc.filename}</p>
                                                    <p className="text-[10px] text-gray-600 uppercase font-semibold">{doc.type}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-600 whitespace-nowrap ml-2">
                                                {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default IdentityLinkagePage;
