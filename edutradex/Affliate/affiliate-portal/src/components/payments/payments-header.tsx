"use client";

import { useState } from "react";
import { Wallet, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WithdrawDialog } from "./withdraw-dialog";

export function PaymentsHeader() {
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Payments
          </h1>
          <p className="text-muted-foreground">
            Manage your withdrawals and track your earnings.
          </p>
        </div>
        <Button onClick={() => setIsWithdrawOpen(true)}>
          <ArrowUpRight className="h-4 w-4" />
          Request Withdrawal
        </Button>
      </div>

      <WithdrawDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
    </>
  );
}
