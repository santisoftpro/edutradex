import type { Metadata } from "next";
import { Suspense } from "react";
import { Wallet, Clock, CheckCircle, XCircle } from "lucide-react";

import { AdminWithdrawalsService } from "@/services/admin/withdrawals.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/loading";
import { WithdrawalActions } from "@/components/admin/withdrawals/withdrawal-actions";

export const metadata: Metadata = {
  title: "Withdrawals Management",
  description: "Manage partner withdrawal requests",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return {
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        icon: Clock,
      };
    case "PROCESSING":
      return {
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        icon: Clock,
      };
    case "COMPLETED":
      return {
        color: "bg-green-500/10 text-green-500 border-green-500/20",
        icon: CheckCircle,
      };
    case "REJECTED":
      return {
        color: "bg-red-500/10 text-red-500 border-red-500/20",
        icon: XCircle,
      };
    default:
      return {
        color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        icon: Clock,
      };
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case "STARTER":
      return "bg-gray-500/10 text-gray-400";
    case "BUILDER":
      return "bg-blue-500/10 text-blue-400";
    case "GROWTH":
      return "bg-green-500/10 text-green-400";
    case "ADVANCED":
      return "bg-purple-500/10 text-purple-400";
    case "PRO":
      return "bg-orange-500/10 text-orange-400";
    case "AMBASSADOR":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "";
  }
}

async function WithdrawalsContent() {
  const { data: withdrawals, total } = await AdminWithdrawalsService.getWithdrawals({
    page: 1,
    pageSize: 50,
  });

  const pendingCount = withdrawals.filter((w) => w.status === "PENDING").length;
  const processingCount = withdrawals.filter((w) => w.status === "PROCESSING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Withdrawals Management</h1>
          <p className="text-muted-foreground">
            {total} total withdrawals • {pendingCount} pending • {processingCount} processing
          </p>
        </div>
      </div>

      {/* Withdrawals Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            All Withdrawals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No withdrawals found
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => {
                  const statusConfig = getStatusConfig(withdrawal.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.partner.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {withdrawal.partner.email}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-xs ${getLevelColor(withdrawal.partner.level)}`}
                          >
                            {withdrawal.partner.level}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.method}</p>
                          {withdrawal.coin && (
                            <p className="text-sm text-muted-foreground">
                              {withdrawal.coin} ({withdrawal.network})
                            </p>
                          )}
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
                        {formatCurrency(withdrawal.amount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(withdrawal.fee)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        {formatCurrency(withdrawal.netAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {withdrawal.status}
                        </Badge>
                        {withdrawal.rejectionReason && (
                          <p className="text-xs text-red-400 mt-1 max-w-[150px] truncate">
                            {withdrawal.rejectionReason}
                          </p>
                        )}
                        {withdrawal.txId && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-[150px]">
                            TX: {withdrawal.txId}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          <p>{new Date(withdrawal.requestedAt).toLocaleDateString()}</p>
                          <p className="text-xs">
                            {new Date(withdrawal.requestedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <WithdrawalActions withdrawal={withdrawal} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading withdrawals..." />}>
      <WithdrawalsContent />
    </Suspense>
  );
}
