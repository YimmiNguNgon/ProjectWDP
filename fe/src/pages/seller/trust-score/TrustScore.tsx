import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock3,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react";

type TrustTier = "TRUSTED" | "WARNING" | "HIGH_RISK";
type ModerationMode = "AUTO_APPROVED" | "REQUIRE_ADMIN";

interface TrustScoreData {
  finalScore: number;
  tier: TrustTier;
  badge: string;
  riskFlagged: boolean;
  productModerationMode: ModerationMode;
  breakdown: {
    ratingScore: number;
    completionRateScore: number;
    responseRateScore: number;
    disputeScore: number;
    stabilityScore: number;
  };
  metrics: {
    avgRating: number;
    reviewCount: number;
    completionRate: string;
    responseRate: string;
    disputeRate: string;
    accountAgeMonths: number;
  };
  lastCalculatedAt: string | null;
}

type WarningLevel = "high" | "medium" | "low" | "good";

const WEIGHTS = {
  ratingScore: 0.4,
  completionRateScore: 0.2,
  responseRateScore: 0.1,
  disputeScore: 0.15,
  stabilityScore: 0.15,
};

const TIER_STYLE: Record<
  TrustTier,
  {
    label: string;
    badgeClass: string;
    scoreClass: string;
  }
> = {
  TRUSTED: {
    label: "Trusted",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    scoreClass: "text-emerald-700",
  },
  WARNING: {
    label: "Warning",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    scoreClass: "text-amber-700",
  },
  HIGH_RISK: {
    label: "High Risk",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    scoreClass: "text-red-700",
  },
};

const resolveTier = (tier: string): TrustTier => {
  if (tier === "TRUSTED" || tier === "WARNING" || tier === "HIGH_RISK") {
    return tier;
  }
  return "TRUSTED";
};

const toPercentNumber = (value: string) =>
  Number(
    String(value || "")
      .replace("%", "")
      .trim(),
  ) || 0;

const toDateTimeLabel = (value: string | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
};

export default function SellerTrustScorePage() {
  const [score, setScore] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScore = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/api/trust-score/my-score");
      setScore(res.data?.data || null);
    } catch (error) {
      console.error("Failed to load trust score", error);
      setScore(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const breakdownRows = useMemo(() => {
    if (!score) return [];

    return [
      {
        key: "ratingScore",
        label: "Rating Quality",
        hint: "Bayesian weighted rating to prevent manipulation with too few reviews.",
        score: Number(score.breakdown.ratingScore || 0),
        weight: WEIGHTS.ratingScore,
      },
      {
        key: "completionRateScore",
        label: "Completion",
        hint: "Delivered orders ratio over delivered + cancelled + returned orders.",
        score: Number(score.breakdown.completionRateScore || 0),
        weight: WEIGHTS.completionRateScore,
      },
      {
        key: "responseRateScore",
        label: "Response",
        hint: "How consistently and quickly you respond to buyers.",
        score: Number(score.breakdown.responseRateScore || 0),
        weight: WEIGHTS.responseRateScore,
      },
      {
        key: "disputeScore",
        label: "Dispute Health",
        hint: "Lower dispute ratio gives a higher score.",
        score: Number(score.breakdown.disputeScore || 0),
        weight: WEIGHTS.disputeScore,
      },
      {
        key: "stabilityScore",
        label: "Stability",
        hint: "Account tenure and long-term consistency.",
        score: Number(score.breakdown.stabilityScore || 0),
        weight: WEIGHTS.stabilityScore,
      },
    ];
  }, [score]);

  const warnings = useMemo(() => {
    if (!score) return [];

    const items: { level: WarningLevel; title: string; detail: string }[] = [];
    const disputeRate = toPercentNumber(score.metrics.disputeRate);
    const responseRate = toPercentNumber(score.metrics.responseRate);
    const completionRate = toPercentNumber(score.metrics.completionRate);

    if (score.tier === "HIGH_RISK") {
      items.push({
        level: "high",
        title: "High-risk tier detected",
        detail:
          "New listings can be held for admin review before they go live.",
      });
    } else if (score.tier === "WARNING") {
      items.push({
        level: "medium",
        title: "Warning tier",
        detail:
          "Score is in the warning zone. Further decline may trigger stricter moderation.",
      });
    }

    if (score.riskFlagged) {
      items.push({
        level: "high",
        title: "Under monitoring",
        detail: "Recent refund behavior has triggered dynamic risk monitoring.",
      });
    }

    if (disputeRate > 5) {
      items.push({
        level: "high",
        title: "Dispute rate is high",
        detail: `Current dispute rate is ${score.metrics.disputeRate}. Keep it below 5%.`,
      });
    }

    if (responseRate < 80) {
      items.push({
        level: "medium",
        title: "Response rate can improve",
        detail: `Current response rate is ${score.metrics.responseRate}. Aim for 80%+.`,
      });
    }

    if (completionRate < 90) {
      items.push({
        level: "medium",
        title: "Completion rate can improve",
        detail: `Current completion rate is ${score.metrics.completionRate}. Aim for 90%+.`,
      });
    }

    if (items.length === 0) {
      items.push({
        level: "good",
        title: "Healthy score profile",
        detail: "No major warning is currently detected.",
      });
    }

    return items;
  }, [score]);

  const scoreColorClass = useMemo(() => {
    if (!score) return "text-gray-700";
    return TIER_STYLE[resolveTier(score.tier)]?.scoreClass || "text-gray-700";
  }, [score]);

  const moderationLabel = (mode: ModerationMode) =>
    mode === "AUTO_APPROVED" ? "Auto approved" : "Require admin review";

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!score) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Unable to load seller score.
            </p>
            <Button onClick={() => fetchScore()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-white">
        <CardContent className="py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Seller Score Center
              </h1>
              <p className="text-sm text-gray-600">
                Monitor trust score, understand calculation logic, and resolve
                warnings early.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={TIER_STYLE[resolveTier(score.tier)].badgeClass}
                >
                  {TIER_STYLE[resolveTier(score.tier)].label}
                </Badge>
                {score.riskFlagged && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    Under Monitoring
                  </Badge>
                )}
                <Badge variant="outline">
                  {moderationLabel(score.productModerationMode)}
                </Badge>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`text-5xl font-extrabold leading-none ${scoreColorClass}`}
              >
                {Number(score.finalScore || 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                out of 5.00
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                Last calculated: {toDateTimeLabel(score.lastCalculatedAt)}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={async () => {
                setRefreshing(true);
                await fetchScore(true);
                setRefreshing(false);
              }}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh score
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/seller/products">Improve listing quality</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Star className="h-4 w-4 text-yellow-500" />}
          label="Average rating"
          value={Number(score.metrics.avgRating || 0).toFixed(2)}
          sub={`${score.metrics.reviewCount} reviews`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          label="Completion"
          value={score.metrics.completionRate}
          sub="Target 90%+"
        />
        <StatCard
          icon={<MessageSquareWarning className="h-4 w-4 text-blue-500" />}
          label="Response"
          value={score.metrics.responseRate}
          sub="Target 80%+"
        />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4 text-red-500" />}
          label="Dispute"
          value={score.metrics.disputeRate}
          sub="Target under 5%"
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4 text-violet-500" />}
          label="Account age"
          value={`${Math.floor(Number(score.metrics.accountAgeMonths || 0))} mo`}
          sub="Stability factor"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm">
              <div className="font-semibold text-blue-800">Formula</div>
              <div className="mt-1 text-blue-700">
                Final = 0.40*Rating + 0.20*Completion + 0.10*Response +
                0.15*Dispute + 0.15*Stability
              </div>
            </div>

            {breakdownRows.map((row) => {
              const contribution = row.score * row.weight;
              const widthPercent = Math.min((row.score / 5) * 100, 100);
              return (
                <div key={row.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {row.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.hint}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-gray-800">
                        {row.score.toFixed(2)} / 5
                      </div>
                      <div className="text-muted-foreground">
                        weight {(row.weight * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Contribution: <strong>{contribution.toFixed(2)}</strong>{" "}
                    points
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.map((warning, index) => (
              <div
                key={`${warning.title}-${index}`}
                className={`rounded-lg border p-3 text-sm ${
                  warning.level === "high"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : warning.level === "medium"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : warning.level === "low"
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <div className="font-semibold">{warning.title}</div>
                <div className="mt-1 text-xs">{warning.detail}</div>
              </div>
            ))}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              Tier thresholds:
              <div className="mt-1">- TRUSTED: 4.00-5.00</div>
              <div>- WARNING: 3.00-3.99</div>
              <div>- HIGH_RISK: below 3.00</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            How To Improve Your Score
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">
              Improve rating quality
            </div>
            <div className="text-muted-foreground mt-1">
              Deliver exactly as described, proactively communicate, and request
              feedback after successful delivery.
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">
              Keep completion high
            </div>
            <div className="text-muted-foreground mt-1">
              Avoid avoidable cancellations and keep inventory synced to prevent
              failed orders.
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">
              Lower disputes & refunds
            </div>
            <div className="text-muted-foreground mt-1">
              Improve packaging quality, shipping accuracy, and return handling
              speed.
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">Respond quickly</div>
            <div className="text-muted-foreground mt-1">
              Keep response rate above 80% and answer buyer questions within 24
              hours.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold mt-2 text-gray-900">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}
