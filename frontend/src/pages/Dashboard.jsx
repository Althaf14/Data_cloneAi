import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ShieldCheck, AlertTriangle, Fingerprint, Activity, Loader2, Camera, X, ZapIcon, RotateCcw, ScanLine } from 'lucide-react';
import { documentService } from '../services/api';

const StatCard = ({ icon: Icon, label, value, trend, color, loading }) => (
    <div className="glass-card p-6 flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                {loading ? (
                    <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
                ) : (
                    <h3 className="text-2xl font-bold">{value}</h3>
                )}
                {trend && !loading && <span className="text-[10px] font-bold text-secondary">{trend}</span>}
            </div>
        </div>
    </div>
);

const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
        case 'critical': return 'text-danger';
        case 'high': return 'text-orange-400';
        case 'medium': return 'text-accent';
        default: return 'text-secondary';
    }
};

const getRiskLabel = (riskLevel, authenticityScore) => {
    if (!riskLevel || riskLevel === 'unknown') return 'Pending';
    if (riskLevel === 'low') return 'Authentic';
    if (riskLevel === 'medium') return 'Suspicious';
    if (riskLevel === 'high') return 'High Risk';
    if (riskLevel === 'critical') return 'Forged';
    return riskLevel;
};

const timeAgo = (isoDate) => {
    if (!isoDate) return 'Unknown time';
    const diff = Math.floor((Date.now() - new Date(isoDate)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const Dashboard = () => {
    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState(null);
    const [recentScans, setRecentScans] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [scansLoading, setScansLoading] = useState(true);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [captured, setCaptured] = useState(null); // base64 preview
    const [capturedBlob, setCapturedBlob] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();
    // ── Camera helpers ────────────────────────────────────────────────────────
    const openCamera = useCallback(() => {
        setCameraError(null);
        setCaptured(null);
        setCapturedBlob(null);
        setCameraOpen(true);
    }, []);

    const closeCamera = useCallback(() => {
        setCameraOpen(false);
        setCaptured(null);
        setCapturedBlob(null);
        setCameraError(null);
        // Stream cleanup is handled in the effect
    }, []);

    // Effect to handle camera stream lifecycle
    useEffect(() => {
        let stream = null;

        const startCamera = async () => {
            if (cameraOpen && !captured) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: false,
                    });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play().catch(e => console.error("Error playing video:", e));
                    }
                } catch (err) {
                    console.error("Camera access error:", err);
                    setCameraError(
                        err.name === 'NotAllowedError'
                            ? 'Camera access denied. Please allow camera permissions in your browser.'
                            : `Camera error: ${err.message}`
                    );
                }
            }
        };

        if (cameraOpen) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [cameraOpen, captured]);

    const captureFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCaptured(dataUrl);
        canvas.toBlob(blob => setCapturedBlob(blob), 'image/jpeg', 0.92);
    }, []);

    const retake = useCallback(() => {
        setCaptured(null);
        setCapturedBlob(null);
        openCamera();
    }, [openCamera]);

    const analyzeCapture = useCallback(async () => {
        if (!capturedBlob) return;
        closeCamera();
        setUploading(true);
        try {
            const file = new File([capturedBlob], `sdk_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const data = await documentService.upload(file);
            fetchData();
            navigate('/analysis', { state: { result: data } });
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (err.response?.status === 422 && detail?.error === 'invalid_document') {
                navigate('/analysis', {
                    state: {
                        rejection: {
                            filename: 'SDK Capture',
                            message: detail.message,
                            category: detail.category,
                            confidence: detail.confidence,
                            details: detail.details || [],
                        }
                    }
                });
            } else {
                alert(`Analysis failed: ${detail?.message || err.message}`);
            }
        } finally {
            setUploading(false);
        }
    }, [capturedBlob, closeCamera, navigate]);

    const fetchData = async () => {
        try {
            const [statsData, scansData] = await Promise.all([
                documentService.getStats(),
                documentService.getRecentScans(5),
            ]);
            setStats(statsData);
            setRecentScans(scansData);
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
        } finally {
            setStatsLoading(false);
            setScansLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const data = await documentService.upload(file);
            fetchData();
            navigate('/analysis', { state: { result: data } });
        } catch (err) {
            const detail = err.response?.data?.detail;
            // 422 = document validation rejection
            if (err.response?.status === 422 && detail?.error === 'invalid_document') {
                navigate('/analysis', {
                    state: {
                        rejection: {
                            filename: file.name,
                            message: detail.message,
                            category: detail.category,
                            confidence: detail.confidence,
                            details: detail.details || [],
                        }
                    }
                });
            } else {
                console.error('Upload failed:', err);
                alert(`Upload failed: ${detail?.message || detail || err.message}`);
            }
        } finally {
            setUploading(false);
        }
    };

    const dashboard = (
        <div className="space-y-8">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Upload}
                    label="Total Scans"
                    value={stats?.total_scans?.toLocaleString() ?? '—'}
                    trend={stats?.total_scans > 0 ? 'Live' : null}
                    color="primary"
                    loading={statsLoading}
                />
                <StatCard
                    icon={ShieldCheck}
                    label="Authentic"
                    value={stats ? `${stats.authenticity_pct}%` : '—'}
                    trend={stats?.completed > 0 ? 'Stable' : null}
                    color="secondary"
                    loading={statsLoading}
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Detected Forgeries"
                    value={stats?.forgeries_detected?.toLocaleString() ?? '—'}
                    trend={stats?.forgeries_detected > 0 ? 'Active' : null}
                    color="danger"
                    loading={statsLoading}
                />
                <StatCard
                    icon={Fingerprint}
                    label="Identities Monitored"
                    value={stats?.identities_monitored?.toLocaleString() ?? '—'}
                    color="accent"
                    loading={statsLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Upload Area */}
                <div className="lg:col-span-2 space-y-8">
                    <label className="glass-card p-8 border-dashed border-2 border-primary/30 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-primary/5 transition-all relative overflow-hidden">
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            accept="image/*"
                        />
                        {uploading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                                <p className="font-bold">Analyzing Forensic Markers...</p>
                                <p className="text-xs text-gray-500">ML models running in secondary thread</p>
                            </div>
                        )}
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Initialize Forensic Analysis</h3>
                        <p className="text-gray-400 max-w-sm mb-6">Drag and drop document images to perform real-time visual and OCR forgery detection.</p>
                        {/* Upload + SDK buttons */}
                        <div className="flex gap-4">
                            <span className="btn-primary">Upload Document</span>
                        </div>
                    </label>

                    {/* SDK Scan button — outside label so it doesn't trigger file input */}
                    <button
                        type="button"
                        onClick={openCamera}
                        disabled={uploading}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg border border-border hover:bg-white/5 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        <Camera className="w-4 h-4" />
                        Scan via SDK
                    </button>
                    {/* Recent Activity - Real Data */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Recent Forensic Activity
                        </h3>
                        <div className="space-y-4">
                            {scansLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                                ))
                            ) : recentScans.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No scans yet. Upload a document to get started.</p>
                                </div>
                            ) : (
                                recentScans.map((scan) => (
                                    <div
                                        key={scan.id}
                                        className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${scan.risk_level === 'critical' || scan.risk_level === 'high'
                                                ? 'bg-danger animate-ping'
                                                : 'bg-secondary'
                                                }`} />
                                            <div>
                                                <p className="font-medium truncate max-w-[200px]">{scan.filename}</p>
                                                <p className="text-xs text-gray-500">
                                                    {scan.document_type !== 'unknown' ? scan.document_type : 'Document'} · {timeAgo(scan.upload_date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-sm font-bold ${getRiskColor(scan.risk_level)}`}>
                                                {getRiskLabel(scan.risk_level)}
                                            </p>
                                            {scan.confidence_score != null && (
                                                <p className="text-[10px] text-gray-500">
                                                    {(scan.confidence_score * 100).toFixed(1)}% Confidence
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Info */}
                <div className="space-y-8">
                    <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent">
                        <h3 className="text-lg font-bold mb-4">ML Engine Status</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Splicing Detect', status: 'Optimal', load: 12 },
                                { name: 'Deepfake Check', status: 'Optimal', load: 8 },
                                { name: 'OCR Inconsistency', status: 'Busy', load: 67 },
                                { name: 'Identity Linker', status: 'Optimal', load: 4 },
                            ].map((m) => (
                                <div key={m.name} className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">{m.name}</span>
                                        <span className={m.status === 'Optimal' ? 'text-secondary' : 'text-accent'}>{m.status}</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${m.status === 'Optimal' ? 'bg-primary' : 'bg-accent'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${m.load}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-4">System Alerts</h3>
                        {stats?.forgeries_detected > 0 ? (
                            <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    Forgeries Detected
                                </p>
                                <p className="text-xs opacity-80">
                                    {stats.forgeries_detected} document{stats.forgeries_detected !== 1 ? 's' : ''} flagged as potentially forged.
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-sm">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-4 h-4" />
                                    All Clear
                                </p>
                                <p className="text-xs opacity-80">No forgeries detected in recent scans.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Camera Modal ──────────────────────────────────────────────────────────
    return (
        <>
            {dashboard}

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Modal */}
            <AnimatePresence>
                {cameraOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-card w-full max-w-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <ScanLine className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold">SDK Document Scanner</h3>
                                    {!captured && !cameraError && (
                                        <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            LIVE
                                        </span>
                                    )}
                                </div>
                                <button onClick={closeCamera} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Video / Preview area */}
                            <div className="relative bg-black aspect-video">
                                {cameraError ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                        <Camera className="w-12 h-12 text-gray-600 mb-3" />
                                        <p className="text-red-400 font-medium mb-2">Camera Unavailable</p>
                                        <p className="text-gray-500 text-sm">{cameraError}</p>
                                    </div>
                                ) : captured ? (
                                    <img src={captured} alt="Captured" className="w-full h-full object-contain" />
                                ) : (
                                    <>
                                        <video
                                            ref={videoRef}
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            playsInline
                                            muted
                                        />
                                        {/* Scan guide overlay */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <div className="border-2 border-primary/60 rounded-lg w-3/4 h-3/4 relative">
                                                {/* Corner markers */}
                                                {[['top-0 left-0', 'border-t-2 border-l-2'],
                                                ['top-0 right-0', 'border-t-2 border-r-2'],
                                                ['bottom-0 left-0', 'border-b-2 border-l-2'],
                                                ['bottom-0 right-0', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                                                    <div key={i} className={`absolute ${pos} w-6 h-6 border-primary ${border}`} />
                                                ))}
                                                <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-primary/70 whitespace-nowrap uppercase tracking-widest">
                                                    Align document within frame
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="p-4 flex items-center justify-center gap-4">
                                {captured ? (
                                    <>
                                        <button
                                            onClick={retake}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-white/10 transition-all text-sm"
                                        >
                                            <RotateCcw className="w-4 h-4" /> Retake
                                        </button>
                                        <button
                                            onClick={analyzeCapture}
                                            className="btn-primary flex items-center gap-2 px-6 py-2.5"
                                        >
                                            <ZapIcon className="w-4 h-4" /> Analyze Document
                                        </button>
                                    </>
                                ) : cameraError ? (
                                    <button onClick={closeCamera} className="btn-primary px-6 py-2.5">
                                        Close
                                    </button>
                                ) : (
                                    <button
                                        onClick={captureFrame}
                                        className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20"
                                        title="Capture"
                                    >
                                        <div className="w-12 h-12 rounded-full border-4 border-gray-800" />
                                    </button>
                                )}
                            </div>
                            <p className="text-center text-xs text-gray-600 pb-4">
                                {captured ? 'Review the capture above before analyzing' : 'Press the button to capture the document'}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Dashboard;
