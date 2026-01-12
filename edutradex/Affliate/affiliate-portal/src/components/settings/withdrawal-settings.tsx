"use client";

import { useState } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Bitcoin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SavedAddress {
  coin: string;
  network: string;
  address: string;
}

interface WithdrawalSettingsProps {
  savedAddresses: SavedAddress[];
}

const cryptoOptions = [
  { coin: "USDT", networks: ["TRC20", "ERC20", "BEP20"] },
  { coin: "BTC", networks: ["Bitcoin"] },
  { coin: "ETH", networks: ["ERC20"] },
  { coin: "USDC", networks: ["ERC20", "TRC20"] },
  { coin: "LTC", networks: ["Litecoin"] },
];

const coinIcons: Record<string, string> = {
  USDT: "💵",
  BTC: "₿",
  ETH: "Ξ",
  USDC: "💲",
  LTC: "Ł",
};

export function WithdrawalSettings({ savedAddresses }: WithdrawalSettingsProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(savedAddresses);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCoin, setNewCoin] = useState("");
  const [newNetwork, setNewNetwork] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const availableNetworks = cryptoOptions.find((c) => c.coin === newCoin)?.networks || [];

  async function handleCopyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  }

  function handleAddAddress() {
    if (!newCoin || !newNetwork || !newAddress) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic address validation
    if (newAddress.length < 20) {
      toast.error("Please enter a valid wallet address");
      return;
    }

    // Check for duplicates
    const isDuplicate = addresses.some(
      (a) => a.address.toLowerCase() === newAddress.toLowerCase()
    );

    if (isDuplicate) {
      toast.error("This address is already saved");
      return;
    }

    const newSavedAddress: SavedAddress = {
      coin: newCoin,
      network: newNetwork,
      address: newAddress,
    };

    setAddresses([...addresses, newSavedAddress]);
    setIsAddDialogOpen(false);
    setNewCoin("");
    setNewNetwork("");
    setNewAddress("");
    toast.success("Address saved successfully");
  }

  function handleRemoveAddress(address: string) {
    setAddresses(addresses.filter((a) => a.address !== address));
    toast.success("Address removed");
  }

  function truncateAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  return (
    <div className="space-y-6">
      {/* Saved Addresses */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Saved Wallet Addresses
              </CardTitle>
              <CardDescription>
                Your saved cryptocurrency wallet addresses for withdrawals
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Address
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>Add Wallet Address</DialogTitle>
                  <DialogDescription>
                    Add a new cryptocurrency wallet address for withdrawals
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Cryptocurrency</Label>
                    <Select
                      value={newCoin}
                      onValueChange={(value) => {
                        setNewCoin(value);
                        setNewNetwork("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cryptocurrency" />
                      </SelectTrigger>
                      <SelectContent>
                        {cryptoOptions.map((option) => (
                          <SelectItem key={option.coin} value={option.coin}>
                            {coinIcons[option.coin]} {option.coin}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Network</Label>
                    <Select
                      value={newNetwork}
                      onValueChange={setNewNetwork}
                      disabled={!newCoin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableNetworks.map((network) => (
                          <SelectItem key={network} value={network}>
                            {network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <Input
                      placeholder="Enter wallet address"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
                      <p className="text-sm text-amber-400">
                        Please double-check your wallet address. Funds sent to an incorrect
                        address cannot be recovered.
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddAddress}>Save Address</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No saved addresses</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a wallet address to make withdrawals faster
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr, index) => (
                <div
                  key={`${addr.address}-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {coinIcons[addr.coin] || "💰"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{addr.coin}</span>
                        <Badge variant="outline" className="text-xs">
                          {addr.network}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {truncateAddress(addr.address)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleCopyAddress(addr.address)}
                    >
                      {copiedAddress === addr.address ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                      onClick={() => handleRemoveAddress(addr.address)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Preferences */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-primary" />
            Withdrawal Preferences
          </CardTitle>
          <CardDescription>Configure your default withdrawal settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select defaultValue="USDT">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cryptoOptions.map((option) => (
                  <SelectItem key={option.coin} value={option.coin}>
                    {coinIcons[option.coin]} {option.coin}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This currency will be pre-selected when you request a withdrawal
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-border">
            <h4 className="font-medium mb-2">Withdrawal Limits</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Minimum</p>
                <p className="font-medium">$50.00</p>
              </div>
              <div>
                <p className="text-muted-foreground">Maximum (per day)</p>
                <p className="font-medium">$10,000.00</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-border">
            <h4 className="font-medium mb-2">Processing Fees</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">USDT (TRC20)</span>
                <span>$1.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">USDT (ERC20)</span>
                <span>$5.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BTC</span>
                <span>0.0001 BTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Internal Transfer</span>
                <span className="text-green-400">Free</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
