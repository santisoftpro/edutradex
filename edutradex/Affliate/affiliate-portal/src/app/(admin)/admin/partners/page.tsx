import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Users, Eye } from "lucide-react";

import { AdminPartnersService } from "@/services/admin/partners.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Partners Management",
  description: "Manage affiliate partners",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "PENDING":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "BLOCKED":
    case "SUSPENDED":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
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

async function PartnersContent() {
  const { data: partners, total } = await AdminPartnersService.getPartners({
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partners Management</h1>
          <p className="text-muted-foreground">
            {total} partners registered
          </p>
        </div>
      </div>

      {/* Partners Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Partners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">FTDs</TableHead>
                <TableHead className="text-right">Traders</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Total Earned</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {partner.firstName} {partner.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {partner.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getLevelColor(partner.level)}>
                        {partner.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(partner.status)}>
                        {partner.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {partner.totalFTD}
                    </TableCell>
                    <TableCell className="text-right">
                      {partner.totalTraders}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(partner.availableBalance)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      {formatCurrency(partner.totalEarned)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(partner.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/admin/partners/${partner.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPartnersPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading partners..." />}>
      <PartnersContent />
    </Suspense>
  );
}
