import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ShieldCheck, AlertCircle, Search, FileText, CheckCircle2, XCircle,
    AlertTriangle, Fingerprint, Eye, Hash, Calendar, Globe, CreditCard,
    ArrowLeft, Info, Activity, BarChart2, Clock
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const riskConfig = {
    low: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', bar: 'bg-green-400', label: 'LOW RISK', pct: 15 },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', bar: 'bg-yellow-400', label: 'MEDIUM RISK', pct: 50 },
    high: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', bar: 'bg-orange-400', label: 'HIGH RISK', pct: 75 },
    critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', bar: 'bg-red-500', label: 'CRITICAL — FORGED', pct: 95 },
};

const getRisk = (level) => riskConfig[level] || riskConfig.low;

const pct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A';

// ─── Sub-components ───────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`glass-card p-6 ${className}`}>
        <h3 className="text-base font-bold mb-5 flex items-center gap-2 border-b border-border pb-3">
            <Icon className="w-4 h-4 text-primary" />
            {title}
        </h3>
        {children}
    </div>
);

const Field = ({ label, value, icon: Icon, ok }) => (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1">
            {Icon && <Icon className="w-3 h-3" />} {label}
        </p>
        <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-medium truncate ${value && value !== 'N/A' ? 'text-white' : 'text-gray-600'}`}>
                {value || 'Not detected'}
            </span>
            {ok === true && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
            {ok === false && <XCircle className="w-4 h-4 text-red-400   flex-shrink-0" />}
        </div>
    </div>
);

const ScoreBar = ({ label, value, color = 'bg-primary' }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs">
            <span className="text-gray-400">{label}</span>
            <span className="font-bold">{Math.round(value * 100)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
                className={`h-full rounded-full ${color}`}
                initial={{ width: 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
            />
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AnalysisPage = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const result = state?.result;
    const rejection = state?.rejection;

    // ── Rejection screen ──────────────────────────────────────────────────────
    if (rejection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-lg mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-8 w-full border border-red-500/30"
                >
                    {/* Icon */}
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
                        <XCircle className="w-10 h-10 text-red-400" />
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-red-400 mb-1">Invalid Document</h2>
                    <p className="text-gray-500 text-sm mb-5">
                        <span className="text-white font-medium">{rejection.filename}</span> was rejected
                    </p>

                    {/* Reason box */}
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-left mb-5">
                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Rejection Reason
                        </p>
                        <p className="text-sm text-gray-200">{rejection.message}</p>
                    </div>

                    {/* Details */}
                    {rejection.details?.length > 0 && (
                        <div className="text-left mb-5 space-y-1">
                            <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Validation Details</p>
                            {rejection.details.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-gray-400 p-2 rounded bg-white/5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
                                    {d}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Confidence */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-6 p-3 rounded-lg bg-white/5">
                        <span>Detection Confidence</span>
                        <span className="font-bold text-red-400">{Math.round((rejection.confidence || 0) * 100)}%</span>
                    </div>

                    {/* What to upload */}
                    <div className="p-4 rounded-xl bg-white/5 border border-border text-left mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Accepted Documents</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                            {['Passport', 'National ID', 'Driver\'s License', 'Emirates ID', 'Aadhaar Card', 'Certificate', 'Diploma', 'Academic Transcript'].map(t => (
                                <div key={t} className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500/60 flex-shrink-0" /> {t}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => navigate('/')} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Try Another Document
                    </button>
                </motion.div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Search className="w-16 h-16 text-gray-700 mb-4 animate-bounce" />
                <h2 className="text-xl font-bold mb-2">No Analysis Data</h2>
                <p className="text-gray-500 text-sm mb-6">Upload a document from the dashboard to run forensic analysis.</p>
                <button onClick={() => navigate('/')} className="btn-primary px-6 py-2">
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const { risk, forensics, ocr, identity } = result.analysis;
    const rc = getRisk(risk.risk_level);
    const fields = ocr?.fields || {};
    const authenticityPct = Math.round((risk.authenticity_score || 0) * 100);
    const forgeryPct = Math.round((forensics.confidence || 0) * 100);
    const hasText = ocr?.raw_text?.trim()?.length > 0;

    return (
        <div className="space-y-6 pb-12 max-w-6xl mx-auto">
            {/* ── Header ── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-3 transition-colors">
                        <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                    </button>
                    <h2 className="text-2xl font-bold">Forensic Report: <span className="text-primary">{result.filename}</span></h2>
                    <p className="text-gray-500 text-sm mt-1">Batch ID: {result.id} · Document #{result.document_id}</p>
                </div>
                {/* Risk Badge */}
                <div className={`px-5 py-3 rounded-xl border flex items-center gap-3 ${rc.bg} ${rc.border}`}>
                    {risk.risk_level === 'low' ? <ShieldCheck className={`w-6 h-6 ${rc.color}`} /> : <AlertCircle className={`w-6 h-6 ${rc.color}`} />}
                    <div>
                        <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Global Risk Level</p>
                        <p className={`text-lg font-bold ${rc.color}`}>{rc.label}</p>
                    </div>
                </div>
            </motion.div>

            {/* ── Risk Gauge Bar ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" /> Risk Assessment Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Authenticity Score — big gauge */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center">
                        <div className="relative w-32 h-32">
                            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                                <motion.circle
                                    cx="60" cy="60" r="50"
                                    fill="none"
                                    stroke={risk.risk_level === 'low' ? '#4ade80' : risk.risk_level === 'medium' ? '#facc15' : risk.risk_level === 'high' ? '#fb923c' : '#f87171'}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 50}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - authenticityPct / 100) }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-2xl font-bold ${rc.color}`}>{authenticityPct}%</span>
                                <span className="text-[10px] text-gray-500">Authentic</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">Authenticity Score</p>
                    </div>
                    {/* Score bars */}
                    <div className="md:col-span-2 space-y-4 justify-center flex flex-col">
                        {/* Risk level bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Risk Level</span>
                                <span className={`font-bold ${rc.color}`}>{rc.label}</span>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${rc.bar}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${rc.pct}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                />
                            </div>
                        </div>
                        <ScoreBar label="Forgery Confidence" value={forensics.confidence || 0} color={forgeryPct > 50 ? 'bg-red-500' : 'bg-green-400'} />
                        <ScoreBar label="Authenticity Score" value={risk.authenticity_score || 0} color="bg-primary" />
                        <ScoreBar label="OCR Text Coverage" value={hasText ? Math.min((ocr.word_count || 0) / 50, 1) : 0} color="bg-accent" />
                    </div>
                </div>
                {/* Risk explanations */}
                <div className="space-y-2 border-t border-border pt-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Risk Factors</p>
                    {risk.explanations.map((e, i) => (
                        <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm border-l-2 ${rc.border} bg-white/5`}>
                            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${rc.color}`} />
                            <span className="text-gray-300">{e}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Left: Heatmap ── */}
                <div className="space-y-6">
                    <Section title="Forgery Heatmap" icon={Eye}>
                        {/* SVG Heatmap */}
                        <div className="rounded-lg overflow-hidden bg-black/60 mb-4 relative">
                            <svg
                                viewBox="0 0 160 120"
                                className="w-full"
                                style={{ imageRendering: 'pixelated' }}
                            >
                                {(forensics.heatmap || []).map((row, ri) =>
                                    (Array.isArray(row) ? row : [row]).map((v, ci) => {
                                        // Color: 0 = dark green, 0.5 = yellow, 1 = bright red
                                        const val = Math.max(0, Math.min(1, v || 0));
                                        const r = Math.round(val > 0.5 ? 255 : val * 2 * 255);
                                        const g = Math.round(val < 0.5 ? 255 : (1 - val) * 2 * 255);
                                        const b = 0;
                                        const a = 0.3 + val * 0.7;
                                        return (
                                            <rect
                                                key={`${ri}-${ci}`}
                                                x={ci * 10}
                                                y={ri * 10}
                                                width={10}
                                                height={10}
                                                fill={`rgba(${r},${g},${b},${a})`}
                                            />
                                        );
                                    })
                                )}
                                {/* Label */}
                                <text x="80" y="115" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="5" fontFamily="monospace" letterSpacing="2">
                                    SPECTRAL ANOMALY MAP
                                </text>
                            </svg>
                            {/* Color legend */}
                            <div className="flex items-center gap-2 px-3 pb-2">
                                <span className="text-[9px] text-gray-600">Clean</span>
                                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, rgba(0,255,0,0.6), rgba(255,255,0,0.6), rgba(255,0,0,0.9))' }} />
                                <span className="text-[9px] text-gray-600">Tampered</span>
                            </div>
                        </div>

                        {/* Confidence meter */}
                        <div className="flex items-center justify-between mb-2 text-xs">
                            <span className="text-gray-400">Tampering Confidence</span>
                            <span className={`font-bold ${forgeryPct > 50 ? 'text-red-400' : 'text-green-400'}`}>{forgeryPct}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                            <motion.div
                                className={`h-full rounded-full ${forgeryPct > 50 ? 'bg-red-500' : 'bg-green-400'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${forgeryPct}%` }}
                                transition={{ duration: 1 }}
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visual Findings</p>
                            {(forensics.findings || []).map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-gray-400 p-2 rounded bg-white/5">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                                    {f}
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Identity Linkage */}
                    <Section title="Identity Linkage Analysis" icon={Fingerprint}>
                        <div className={`p-4 rounded-xl border mb-4 ${identity.duplicates_found > 0 ? 'border-red-500/30 bg-red-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
                            <p className={`text-sm font-bold flex items-center gap-2 mb-1 ${identity.duplicates_found > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {identity.duplicates_found > 0 ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                {identity.duplicates_found > 0 ? `${identity.duplicates_found} Duplicate Record(s) Detected` : 'Unique Identity Verified'}
                            </p>
                            <p className="text-xs text-gray-400">
                                {identity.duplicates_found > 0
                                    ? 'This document matches previously submitted records in the system.'
                                    : 'No duplicate demographic or biometric records found in master repository.'}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-white/5 text-center">
                                <p className={`text-2xl font-bold ${identity.duplicates_found > 0 ? 'text-red-400' : 'text-green-400'}`}>{identity.duplicates_found}</p>
                                <p className="text-xs text-gray-500 mt-1">Duplicates Found</p>
                            </div>
                            <div className="p-3 rounded-lg bg-white/5 text-center">
                                <p className={`text-2xl font-bold ${identity.duplicates_found > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {identity.duplicates_found > 0 ? '⚠' : '✓'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Status</p>
                            </div>
                        </div>
                        {/* Duplicate details list */}
                        {(identity.duplicates || []).length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Match Details</p>
                                {identity.duplicates.map((dup, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                                        <p className="text-red-300 font-medium mb-1">{dup.reason}</p>
                                        <div className="flex items-center justify-between text-gray-500">
                                            <span>Confidence: <span className="text-red-400 font-bold">{Math.round((dup.confidence || 0) * 100)}%</span></span>
                                            {dup.uploaded_at && <span>Previously: {new Date(dup.uploaded_at).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                </div>

                {/* ── Right: OCR + Details ── */}
                <div className="space-y-6">
                    {/* Extracted Fields */}
                    <Section title="Extracted Document Fields" icon={CreditCard}>
                        {!hasText && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs mb-4">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                OCR could not extract text. Image may be low quality or OCR engine unavailable.
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Full Name" value={fields.detected_names?.join(' ') || null} icon={FileText} ok={fields.detected_names?.length > 0} />
                            <Field label="ID Number" value={fields.id_number} icon={Hash} ok={!!fields.id_number} />
                            <Field label="Date of Birth" value={fields.date_of_birth} icon={Calendar} ok={!!fields.date_of_birth} />
                            <Field label="Expiry Date" value={fields.expiry_date} icon={Clock} ok={!!fields.expiry_date} />
                            <Field label="Nationality" value={fields.nationality} icon={Globe} ok={!!fields.nationality} />
                            <Field label="MRZ Line" value={fields.mrz_line ? fields.mrz_line.slice(0, 16) + '…' : null} icon={Activity} ok={!!fields.mrz_line} />
                        </div>
                        {/* Consistency */}
                        <div className={`mt-4 p-3 rounded-lg border text-xs ${ocr.is_consistent ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400'}`}>
                            <p className="font-bold flex items-center gap-1 mb-1">
                                {ocr.is_consistent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                Logical Consistency: {ocr.is_consistent ? 'Validated' : 'Issues Detected'}
                            </p>
                            {(ocr.consistency_findings || []).map((f, i) => <p key={i} className="opacity-80">• {f}</p>)}
                        </div>
                    </Section>

                    {/* OCR Stats */}
                    <Section title="OCR Extraction Stats" icon={FileText}>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {[
                                { label: 'Characters', value: ocr.char_count ?? '—' },
                                { label: 'Words', value: ocr.word_count ?? '—' },
                                { label: 'Fields Found', value: Object.values(fields).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length },
                            ].map(({ label, value }) => (
                                <div key={label} className="p-3 rounded-lg bg-white/5 text-center">
                                    <p className="text-xl font-bold text-primary">{value}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{label}</p>
                                </div>
                            ))}
                        </div>
                        {hasText && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Raw Extracted Text</p>
                                <div className="p-3 rounded-lg bg-black/30 border border-border text-xs text-gray-400 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                    {ocr.raw_text}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* Risk Justification */}
                    <Section title="Risk Justification" icon={AlertCircle}>
                        <div className="space-y-2">
                            {risk.explanations.map((e, i) => (
                                <p key={i} className={`text-sm p-3 rounded-lg bg-black/20 border-l-2 ${rc.border} text-gray-300`}>
                                    {e}
                                </p>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-gray-500 mb-1">Authenticity Score</p>
                                <p className="text-lg font-bold text-primary">{pct(risk.authenticity_score)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-gray-500 mb-1">Forgery Confidence</p>
                                <p className={`text-lg font-bold ${forgeryPct > 50 ? 'text-red-400' : 'text-green-400'}`}>{forgeryPct}%</p>
                            </div>
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;
