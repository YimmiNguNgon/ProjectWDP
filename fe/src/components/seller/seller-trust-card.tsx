"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Star, CheckCircle, Zap, ShieldAlert, Clock } from "lucide-react";

interface TrustScoreData {
    sellerId: string;
    finalScore: number;
    tier: "TRUSTED" | "STANDARD" | "RISK" | "HIGH_RISK";
    badge: string;
    avgRating: number;
    reviewCount: number;
    completionRate: string;
    totalDelivered: number;
    responseRate: string;
    disputeRate: string;
    accountAgeMonths: number;
    breakdown: {
        ratingScore: number;
        completionRateScore: number;
        responseRateScore: number;
        disputeScore: number;
        stabilityScore: number;
    };
    underMonitoring: boolean;
    lastCalculatedAt: string;
}

const TIER_CONFIG = {
    TRUSTED: {
        label: "Trusted Seller",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
        icon: "🛡",
        dot: "bg-emerald-500",
    },
    STANDARD: {
        label: "Standard Seller",
        color: "text-blue-700",
        bg: "bg-blue-50 border-blue-200",
        icon: "✓",
        dot: "bg-blue-500",
    },
    RISK: {
        label: "Risk Seller",
        color: "text-amber-700",
        bg: "bg-amber-50 border-amber-200",
        icon: "⚠",
        dot: "bg-amber-500",
    },
    HIGH_RISK: {
        label: "High Risk",
        color: "text-red-700",
        bg: "bg-red-50 border-red-200",
        icon: "✗",
        dot: "bg-red-500",
    },
};

function ScoreBar({ value, max = 5, color = "bg-blue-500" }: { value: number; max?: number; color?: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

interface Props {
    sellerId: string;
}

export function SellerTrustCard({ sellerId }: Props) {
    const [data, setData] = useState<TrustScoreData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sellerId) return;
        api
            .get(`/api/trust-score/seller/${sellerId}`)
            .then((res) => setData(res.data.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [sellerId]);

    if (loading) {
        return (
            <div className="animate-pulse rounded-xl border border-border p-4 h-40 bg-muted/30" />
        );
    }

    if (!data) return null;

    const tier = TIER_CONFIG[data.tier] ?? TIER_CONFIG.STANDARD;
    const scoreColor =
        data.finalScore >= 4.5 ? "bg-emerald-500" :
            data.finalScore >= 4.0 ? "bg-blue-500" :
                data.finalScore >= 3.0 ? "bg-amber-400" : "bg-red-500";

    return (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base text-foreground">Seller Trust Score</h3>
                {/* Badge */}
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tier.bg} ${tier.color}`}
                >
                    <span>{tier.icon}</span>
                    {data.underMonitoring ? "Under Monitoring" : tier.label}
                </span>
            </div>

            {/* Score + Stars */}
            <div className="flex items-center gap-4">
                {/* Big score circle */}
                <div className="flex-shrink-0 w-16 h-16 rounded-full border-4 border-border flex flex-col items-center justify-center">
                    <span className="text-xl font-bold leading-none">{data.finalScore.toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">/5</span>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    {/* Stars */}
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                                key={s}
                                className={`h-4 w-4 ${s <= Math.round(data.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
                        ))}
                        <span className="ml-1 text-sm text-muted-foreground">
                            {data.avgRating.toFixed(1)} ({data.reviewCount} reviews)
                        </span>
                    </div>

                    {/* Score bar */}
                    <ScoreBar value={data.finalScore} color={scoreColor} />
                </div>
            </div>

            {/* 4 Stats */}
            <div className="grid grid-cols-2 gap-3">
                <StatRow
                    icon={<CheckCircle className="h-4 w-4 text-emerald-500" />}
                    label="Completion rate"
                    value={`${data.completionRate}%`}
                    subLabel={`${data.totalDelivered} delivered`}
                />
                <StatRow
                    icon={<Zap className="h-4 w-4 text-blue-500" />}
                    label="Response rate"
                    value={`${data.responseRate}%`}
                    subLabel="within 24h"
                />
                <StatRow
                    icon={<ShieldAlert className="h-4 w-4 text-amber-500" />}
                    label="Dispute rate"
                    value={`${data.disputeRate}%`}
                    subLabel="of all orders"
                    valueClass={parseFloat(data.disputeRate) > 5 ? "text-red-600" : ""}
                />
                <StatRow
                    icon={<Clock className="h-4 w-4 text-purple-500" />}
                    label="Account age"
                    value={`${Math.floor(data.accountAgeMonths)}m`}
                    subLabel="seller tenure"
                />
            </div>

            {/* Under monitoring notice */}
            {data.underMonitoring && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <span className="mt-0.5 flex-shrink-0">⚠️</span>
                    <span>This seller is currently under quality monitoring.</span>
                </div>
            )}
        </div>
    );
}

function StatRow({
    icon,
    label,
    value,
    subLabel,
    valueClass = "",
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subLabel?: string;
    valueClass?: string;
}) {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-0.5 flex-shrink-0">{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-sm font-semibold leading-tight ${valueClass}`}>{value}</p>
                {subLabel && <p className="text-[11px] text-muted-foreground">{subLabel}</p>}
            </div>
        </div>
    );
}
