"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Check, Ban, Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FraudActionsProps {
  log: {
    id: string;
    type: string;
    description: string;
    isResolved: boolean;
    partner: {
      id: string;
      name: string;
      email: string;
      status: string;
    } | null;
  };
}

type ActionType = "resolve" | "block" | null;

export function FraudActions({ log }: FraudActionsProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState("");

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast.error("Please provide a resolution note");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/fraud/${log.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resolve");
      }

      toast.success("Fraud alert resolved");
      setActionType(null);
      setResolution("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resolve");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/fraud/${log.id}/block-partner`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to block partner");
      }

      toast.success("Partner blocked and fraud alert resolved");
      setActionType(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to block partner");
    } finally {
      setLoading(false);
    }
  };

  if (log.isResolved) {
    return (
      <span className="text-xs text-muted-foreground">
        Resolved
      </span>
    );
  }

  const canBlock = log.partner && log.partner.status !== "BLOCKED";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActionType("resolve")}>
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Mark Resolved
          </DropdownMenuItem>
          {canBlock && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setActionType("block")}
                className="text-red-500"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block Partner
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resolve Dialog */}
      <Dialog open={actionType === "resolve"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Fraud Alert</DialogTitle>
            <DialogDescription>
              Mark this {log.type.replace("_", " ").toLowerCase()} alert as resolved.
              Please provide details about the resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium">Alert Description</p>
              <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution Notes *</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this was resolved..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={loading || !resolution.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Partner Dialog */}
      <Dialog open={actionType === "block"} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to block {log.partner?.name}? This will:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Block the partner from logging in</li>
              <li>Prevent them from receiving commissions</li>
              <li>Mark this fraud alert as resolved</li>
            </ul>
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                <strong>Partner:</strong> {log.partner?.name} ({log.partner?.email})
              </p>
              <p className="text-sm text-red-400 mt-1">
                <strong>Reason:</strong> {log.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Block Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
