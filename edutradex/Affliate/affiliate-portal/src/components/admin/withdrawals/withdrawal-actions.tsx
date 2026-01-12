"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, MoreHorizontal, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface WithdrawalActionsProps {
  withdrawal: {
    id: string;
    status: string;
    amount: number;
    partner: {
      name: string;
    };
  };
}

type ActionType = "approve" | "complete" | "reject" | null;

export function WithdrawalActions({ withdrawal }: WithdrawalActionsProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState("");
  const [reason, setReason] = useState("");

  const handleAction = async () => {
    if (!actionType) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawal.id}/${actionType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(actionType === "approve" && txId && { txId }),
          ...(actionType === "complete" && { txId }),
          ...(actionType === "reject" && { reason }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Action failed");
      }

      toast.success(
        actionType === "approve"
          ? "Withdrawal approved"
          : actionType === "complete"
          ? "Withdrawal completed"
          : "Withdrawal rejected"
      );

      setActionType(null);
      setTxId("");
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const canApprove = withdrawal.status === "PENDING";
  const canComplete = withdrawal.status === "PROCESSING";
  const canReject = withdrawal.status === "PENDING" || withdrawal.status === "PROCESSING";

  if (!canApprove && !canComplete && !canReject) {
    return (
      <span className="text-xs text-muted-foreground">
        No actions
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canApprove && (
            <DropdownMenuItem onClick={() => setActionType("approve")}>
              <Check className="h-4 w-4 mr-2 text-blue-500" />
              Approve
            </DropdownMenuItem>
          )}
          {canComplete && (
            <DropdownMenuItem onClick={() => setActionType("complete")}>
              <Send className="h-4 w-4 mr-2 text-green-500" />
              Mark Completed
            </DropdownMenuItem>
          )}
          {(canApprove || canComplete) && canReject && <DropdownMenuSeparator />}
          {canReject && (
            <DropdownMenuItem onClick={() => setActionType("reject")} className="text-red-500">
              <X className="h-4 w-4 mr-2" />
              Reject
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Approve Dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Approve withdrawal of ${withdrawal.amount.toFixed(2)} for {withdrawal.partner.name}.
              This will change status to Processing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="txId">Transaction ID (Optional)</Label>
              <Input
                id="txId"
                placeholder="Enter transaction ID if already sent"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={actionType === "complete"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Withdrawal</DialogTitle>
            <DialogDescription>
              Mark withdrawal of ${withdrawal.amount.toFixed(2)} for {withdrawal.partner.name} as completed.
              This will deduct from partner&apos;s balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="completeTxId">Transaction ID *</Label>
              <Input
                id="completeTxId"
                placeholder="Enter blockchain transaction ID"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={loading || !txId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Reject withdrawal of ${withdrawal.amount.toFixed(2)} for {withdrawal.partner.name}.
              Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rejection"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleAction} disabled={loading || !reason}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
