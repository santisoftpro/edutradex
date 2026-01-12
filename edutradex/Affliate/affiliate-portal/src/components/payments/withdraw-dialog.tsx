"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Wallet,
  Bitcoin,
  ArrowRightLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { WITHDRAWAL_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const cryptoWithdrawSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= WITHDRAWAL_CONFIG.MIN_AMOUNT, {
      message: `Minimum withdrawal is $${WITHDRAWAL_CONFIG.MIN_AMOUNT}`,
    }),
  coin: z.string().min(1, "Please select a cryptocurrency"),
  network: z.string().min(1, "Please select a network"),
  address: z
    .string()
    .min(1, "Wallet address is required")
    .min(10, "Invalid wallet address"),
});

const internalTransferSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= WITHDRAWAL_CONFIG.MIN_AMOUNT, {
      message: `Minimum withdrawal is $${WITHDRAWAL_CONFIG.MIN_AMOUNT}`,
    }),
  tradingUid: z
    .string()
    .min(1, "Trading UID is required")
    .min(5, "Invalid Trading UID"),
});

type CryptoFormData = z.infer<typeof cryptoWithdrawSchema>;
type InternalFormData = z.infer<typeof internalTransferSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawDialog({ open, onOpenChange }: WithdrawDialogProps) {
  const router = useRouter();
  const [method, setMethod] = useState<"crypto" | "internal">("crypto");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [selectedCoin, setSelectedCoin] = useState<string>("");

  const cryptoForm = useForm<CryptoFormData>({
    resolver: zodResolver(cryptoWithdrawSchema),
    defaultValues: {
      amount: "",
      coin: "",
      network: "",
      address: "",
    },
  });

  const internalForm = useForm<InternalFormData>({
    resolver: zodResolver(internalTransferSchema),
    defaultValues: {
      amount: "",
      tradingUid: "",
    },
  });

  // Fetch balance on open
  useEffect(() => {
    if (open) {
      fetch("/api/payments/balance")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAvailableBalance(data.data.availableBalance);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const handleClose = () => {
    cryptoForm.reset();
    internalForm.reset();
    setIsSuccess(false);
    setSelectedCoin("");
    onOpenChange(false);
  };

  const selectedCoinConfig = WITHDRAWAL_CONFIG.SUPPORTED_COINS.find(
    (c) => c.symbol === selectedCoin
  );

  async function onCryptoSubmit(data: CryptoFormData) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(data.amount),
          method: "CRYPTO",
          coin: data.coin,
          network: data.network,
          address: data.address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Withdrawal request failed");
      }

      setIsSuccess(true);
      toast.success("Withdrawal request submitted successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit withdrawal"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function onInternalSubmit(data: InternalFormData) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(data.amount),
          method: "INTERNAL_TRANSFER",
          tradingUid: data.tradingUid,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Withdrawal request failed");
      }

      setIsSuccess(true);
      toast.success("Internal transfer request submitted successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit transfer"
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-4 rounded-full bg-green-500/10 p-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Your withdrawal request has been submitted and is being processed.
              You&apos;ll receive a notification once it&apos;s completed.
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Request Withdrawal
          </DialogTitle>
          <DialogDescription>
            Available balance:{" "}
            <span className="font-medium text-green-400">
              ${availableBalance.toFixed(2)}
            </span>
          </DialogDescription>
        </DialogHeader>

        {availableBalance < WITHDRAWAL_CONFIG.MIN_AMOUNT ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-4 rounded-full bg-amber-500/10 p-3">
              <AlertCircle className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Insufficient Balance</h3>
            <p className="text-muted-foreground text-sm">
              You need at least ${WITHDRAWAL_CONFIG.MIN_AMOUNT} to make a withdrawal.
              Your current balance is ${availableBalance.toFixed(2)}.
            </p>
          </div>
        ) : (
          <Tabs value={method} onValueChange={(v) => setMethod(v as "crypto" | "internal")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crypto" className="gap-2">
                <Bitcoin className="h-4 w-4" />
                Crypto
              </TabsTrigger>
              <TabsTrigger value="internal" className="gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Internal Transfer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crypto" className="mt-4">
              <Form {...cryptoForm}>
                <form
                  onSubmit={cryptoForm.handleSubmit(onCryptoSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={cryptoForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="pl-7"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Min: ${WITHDRAWAL_CONFIG.MIN_AMOUNT} | Available: $
                          {availableBalance.toFixed(2)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={cryptoForm.control}
                      name="coin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cryptocurrency</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedCoin(value);
                              cryptoForm.setValue("network", "");
                            }}
                            value={field.value}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select coin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WITHDRAWAL_CONFIG.SUPPORTED_COINS.map((coin) => (
                                <SelectItem key={coin.symbol} value={coin.symbol}>
                                  {coin.symbol} - {coin.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={cryptoForm.control}
                      name="network"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Network</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoading || !selectedCoin}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select network" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedCoinConfig?.networks.map((network) => (
                                <SelectItem key={network} value={network}>
                                  {network}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={cryptoForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wallet Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your wallet address"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Double-check your address. Transactions cannot be reversed.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="internal" className="mt-4">
              <Card className="mb-4 bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">
                    Transfer funds directly to your OptigoBroker trading account.
                    Funds will be credited instantly.
                  </p>
                </CardContent>
              </Card>

              <Form {...internalForm}>
                <form
                  onSubmit={internalForm.handleSubmit(onInternalSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={internalForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="pl-7"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Min: ${WITHDRAWAL_CONFIG.MIN_AMOUNT} | Available: $
                          {availableBalance.toFixed(2)}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={internalForm.control}
                    name="tradingUid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trading UID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your trading account UID"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Your OptigoBroker trading account identifier.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
