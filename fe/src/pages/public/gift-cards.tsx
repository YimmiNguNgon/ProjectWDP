import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimVoucherCode, getMyVoucherWallet, type Voucher } from "@/api/vouchers";
import { useAuth } from "@/hooks/use-auth";
import VoucherTicket from "@/components/voucher/voucher-ticket";

export default function GiftCardsPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<Voucher[]>([]);

  const loadWallet = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await getMyVoucherWallet();
      setWallet(response.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [user?.username]);

  const grouped = useMemo(() => {
    return {
      global: wallet.filter((item) => item.scope === "global"),
      seller: wallet.filter((item) => item.scope === "seller"),
    };
  }, [wallet]);

  const handleClaim = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      toast.error("Please enter voucher code");
      return;
    }

    try {
      setClaiming(true);
      const response = await claimVoucherCode(normalized);
      toast.success(response.message || "Voucher claimed");
      setCode("");
      await loadWallet();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to claim voucher");
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="py-10">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Gift Cards & Voucher Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in to claim voucher codes and use them at checkout.
            </p>
            <Button asChild>
              <Link to="/auth/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gift Cards</h1>
        <p className="text-muted-foreground mt-1">
          Enter gift code to receive voucher into your wallet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redeem Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter gift/voucher code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="uppercase"
            />
            <Button onClick={handleClaim} disabled={claiming}>
              {claiming ? "Redeeming..." : "Redeem"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Vouchers ({grouped.global.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : grouped.global.length === 0 ? (
              <p className="text-sm text-muted-foreground">No global vouchers in wallet.</p>
            ) : (
              grouped.global.map((voucher) => (
                <VoucherTicket key={voucher._id} voucher={voucher} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop Vouchers ({grouped.seller.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : grouped.seller.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shop vouchers in wallet.</p>
            ) : (
              grouped.seller.map((voucher) => (
                <VoucherTicket key={voucher._id} voucher={voucher} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
