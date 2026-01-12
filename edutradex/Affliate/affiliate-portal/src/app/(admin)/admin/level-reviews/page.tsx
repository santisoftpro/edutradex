import type { Metadata } from "next";
import { Suspense } from "react";
import { TrendingUp, ArrowRight, Clock, CheckCircle, XCircle } from "lucide-react";

import { AdminLevelReviewsService } from "@/services/admin/level-reviews.service";
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
import { LevelReviewActions } from "@/components/admin/level-reviews/level-review-actions";

export const metadata: Metadata = {
  title: "Level Reviews",
  description: "Review partner level upgrade requests",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return {
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        icon: Clock,
      };
    case "APPROVED":
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

async function LevelReviewsContent() {
  const { data: reviews, total } = await AdminLevelReviewsService.getLevelReviews({
    page: 1,
    pageSize: 50,
  });

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Level Reviews</h1>
          <p className="text-muted-foreground">
            {total} total requests • {pendingCount} pending review
          </p>
        </div>
      </div>

      {/* Reviews Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Level Upgrade Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Level Change</TableHead>
                <TableHead className="text-right">FTDs</TableHead>
                <TableHead className="text-right">Traders</TableHead>
                <TableHead className="text-right">Total Earned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No level review requests found
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => {
                  const statusConfig = getStatusConfig(review.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{review.partner.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {review.partner.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getLevelColor(review.currentLevel)}>
                            {review.currentLevel}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className={getLevelColor(review.requestedLevel)}>
                            {review.requestedLevel}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {review.partner.totalFTD}
                      </TableCell>
                      <TableCell className="text-right">
                        {review.partner.totalTraders}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        {formatCurrency(review.partner.totalEarned)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {review.status}
                        </Badge>
                        {review.adminNotes && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                            {review.adminNotes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          <p>{new Date(review.requestedAt).toLocaleDateString()}</p>
                          <p className="text-xs">
                            {new Date(review.requestedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LevelReviewActions review={review} />
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

export default function AdminLevelReviewsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading level reviews..." />}>
      <LevelReviewsContent />
    </Suspense>
  );
}
