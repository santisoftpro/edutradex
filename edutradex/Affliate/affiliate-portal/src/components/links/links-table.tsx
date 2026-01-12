"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Copy,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MousePointer,
  Users,
  UserCheck,
  Check,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LinkData {
  id: string;
  code: string;
  comment: string | null;
  type: string;
  program: string;
  isActive: boolean;
  clickCount: number;
  registrations: number;
  ftdCount: number;
  createdAt: Date;
  fullUrl: string;
}

interface LinksTableProps {
  initialData: {
    data: LinkData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  partnerId: string;
}

const typeLabels: Record<string, string> = {
  REGISTER: "Register",
  MAIN_PAGE: "Main Page",
  ANDROID: "Android",
  PLATFORM: "Platform",
};

export function LinksTable({ initialData, partnerId }: LinksTableProps) {
  const router = useRouter();
  const [links, setLinks] = useState(initialData.data);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (url: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(linkId);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to update link");

      setLinks((prev) =>
        prev.map((link) =>
          link.id === linkId ? { ...link, isActive: !currentStatus } : link
        )
      );

      toast.success(`Link ${!currentStatus ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update link status");
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete link");
      }

      setLinks((prev) => prev.filter((link) => link.id !== linkId));
      toast.success("Link deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete link"
      );
    }
  };

  if (links.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ExternalLink className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No tracking links yet</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Create your first tracking link to start referring traders and
            earning commissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[200px]">Link</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MousePointer className="h-3.5 w-3.5" />
                    Clicks
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Regs
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    FTDs
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id} className="border-border">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {link.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copyToClipboard(link.fullUrl, link.id)}
                          className="h-6 w-6"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {link.comment && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {link.comment}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[link.type] || link.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {link.clickCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {link.registrations.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-green-400">
                      {link.ftdCount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={link.isActive ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        link.isActive
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {link.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(link.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => copyToClipboard(link.fullUrl, link.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(link.fullUrl, "_blank")}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            toggleLinkStatus(link.id, link.isActive)
                          }
                        >
                          {link.isActive ? (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteLink(link.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {links.map((link) => (
            <div key={link.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {link.code}
                    </code>
                    <Badge
                      variant={link.isActive ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        link.isActive
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {link.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {link.comment && (
                    <p className="text-sm text-muted-foreground">
                      {link.comment}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(link.fullUrl, link.id)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        toggleLinkStatus(link.id, link.isActive)
                      }
                    >
                      {link.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteLink(link.id)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">
                    {link.clickCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {link.registrations.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Registrations</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-400">
                    {link.ftdCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">FTDs</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => copyToClipboard(link.fullUrl, link.id)}
              >
                {copiedId === link.id ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
