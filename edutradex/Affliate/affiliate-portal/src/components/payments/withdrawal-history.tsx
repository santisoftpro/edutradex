"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  X,
  ExternalLink,
  Copy,
  History,
} from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Withdrawal {
  id: string;
  amount: number | { toNumber(): number };
  fee: number | { toNumber(): number };
  netAmount: number | { toNumber(): number };
  method: string;
  coin: string | null;
  network: string | null;
  address: string | null;
  tradingUid: string | null;
  status: string;
  txId: string | null;
  rejectionReason: string | null;
  requestedAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
}

interface WithdrawalHistoryProps {
  initialData: {
    data: Withdrawal[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: {
      totalWithdrawn: number | { toNumber(): number };
      completedCount: number;
    };
  };
  partnerId: string;
}

function toNumber(value: number | { toNumber(): number }): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  PROCESSING: {
    label: "Processing",
    icon: Loader2,
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
    className: "bg-muted text-muted-foreground",
  },
};

export function WithdrawalHistory({ initialData, partnerId }: WithdrawalHistoryProps) {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState(initialData.data);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const cancelWithdrawal = async (withdrawalId: string) => {
    if (!confirm("Are you sure you want to cancel this withdrawal request?")) {
      return;
    }

    setIsLoading(withdrawalId);

    try {
      const response = await fetch(`/api/payments/withdraw/${withdrawalId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel withdrawal");
      }

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === withdrawalId ? { ...w, status: "CANCELLED" } : w
        )
      );

      toast.success("Withdrawal cancelled. Funds returned to your balance.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel withdrawal"
      );
    } finally {
      setIsLoading(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (withdrawals.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Withdrawal History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <History className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No withdrawals yet</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            When you make a withdrawal request, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Withdrawal History
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Total withdrawn:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(toNumber(initialData.summary.totalWithdrawn))}
          </span>{" "}
          ({initialData.summary.completedCount} transactions)
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => {
                const status = statusConfig[withdrawal.status] || statusConfig.PENDING;
                const StatusIcon = status.icon;

                return (
                  <TableRow key={withdrawal.id} className="border-border">
                    <TableCell className="text-sm">
                      {format(new Date(withdrawal.requestedAt), "MMM d, yyyy")}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(withdrawal.requestedAt), "h:mm a")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {withdrawal.method === "CRYPTO"
                            ? `${withdrawal.coin} (${withdrawal.network})`
                            : "Internal Transfer"}
                        </Badge>
                        {withdrawal.address && (
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                            {withdrawal.address}
                          </p>
                        )}
                        {withdrawal.tradingUid && (
                          <p className="text-xs text-muted-foreground">
                            UID: {withdrawal.tradingUid}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(toNumber(withdrawal.amount))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(toNumber(withdrawal.fee))}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-400">
                      {formatCurrency(toNumber(withdrawal.netAmount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", status.className)}
                      >
                        <StatusIcon
                          className={cn(
                            "h-3 w-3",
                            withdrawal.status === "PROCESSING" && "animate-spin"
                          )}
                        />
                        {status.label}
                      </Badge>
                      {withdrawal.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1">
                          {withdrawal.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {withdrawal.txId && (
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(withdrawal.txId!)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy TX ID
                            </DropdownMenuItem>
                          )}
                          {withdrawal.address && (
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(withdrawal.address!)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Address
                            </DropdownMenuItem>
                          )}
                          {withdrawal.status === "PENDING" && (
                            <DropdownMenuItem
                              onClick={() => cancelWithdrawal(withdrawal.id)}
                              className="text-destructive focus:text-destructive"
                              disabled={isLoading === withdrawal.id}
                            >
                              {isLoading === withdrawal.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <X className="mr-2 h-4 w-4" />
                              )}
                              Cancel Request
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {withdrawals.map((withdrawal) => {
            const status = statusConfig[withdrawal.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;

            return (
              <div key={withdrawal.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(toNumber(withdrawal.netAmount))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(withdrawal.requestedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("gap-1", status.className)}
                  >
                    <StatusIcon
                      className={cn(
                        "h-3 w-3",
                        withdrawal.status === "PROCESSING" && "animate-spin"
                      )}
                    />
                    {status.label}
                  </Badge>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Method: </span>
                  {withdrawal.method === "CRYPTO"
                    ? `${withdrawal.coin} (${withdrawal.network})`
                    : "Internal Transfer"}
                </div>

                {withdrawal.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => cancelWithdrawal(withdrawal.id)}
                    disabled={isLoading === withdrawal.id}
                  >
                    {isLoading === withdrawal.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        Cancel Request
                      </>
                    )}
                  </Button>
                )}

                {withdrawal.rejectionReason && (
                  <p className="text-xs text-red-400">
                    Reason: {withdrawal.rejectionReason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
