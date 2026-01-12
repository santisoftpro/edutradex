import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
} from "lucide-react";

import { AdminFraudService } from "@/services/admin/fraud.service";
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
import { FraudActions } from "@/components/admin/fraud/fraud-actions";

export const metadata: Metadata = {
  title: "Fraud Detection",
  description: "Monitor and manage fraud alerts",
};

function getSeverityConfig(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return {
        color: "bg-red-500/10 text-red-500 border-red-500/20",
        icon: ShieldAlert,
      };
    case "HIGH":
      return {
        color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        icon: AlertTriangle,
      };
    case "MEDIUM":
      return {
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        icon: AlertCircle,
      };
    case "LOW":
      return {
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        icon: Info,
      };
    default:
      return {
        color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        icon: Info,
      };
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "MULTIPLE_ACCOUNTS":
      return "Multiple Accounts";
    case "SUSPICIOUS_IP":
      return "Suspicious IP";
    case "SELF_REFERRAL":
      return "Self Referral";
    case "FAKE_DEPOSITS":
      return "Fake Deposits";
    case "CLICK_FRAUD":
      return "Click Fraud";
    case "BONUS_ABUSE":
      return "Bonus Abuse";
    case "OTHER":
      return "Other";
    default:
      return type;
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

async function FraudContent() {
  const [{ data: logs, total }, stats] = await Promise.all([
    AdminFraudService.getFraudLogs({ page: 1, pageSize: 50 }),
    AdminFraudService.getFraudStats(),
  ]);

  const statCards = [
    {
      title: "Unresolved",
      value: stats.unresolvedLogs,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Critical",
      value: stats.criticalLogs,
      icon: ShieldAlert,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "High",
      value: stats.highLogs,
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Last 24h",
      value: stats.recentLogs,
      icon: AlertCircle,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Fraud Detection</h1>
        <p className="text-muted-foreground">
          {total} total alerts • {stats.unresolvedLogs} unresolved
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fraud Logs Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Fraud Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No fraud alerts found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const severityConfig = getSeverityConfig(log.severity);
                  const SeverityIcon = severityConfig.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted">
                          {getTypeLabel(log.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.partner ? (
                          <div>
                            <p className="font-medium">{log.partner.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.partner.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${getLevelColor(log.partner.level)}`}>
                                {log.partner.level}
                              </Badge>
                              {log.partner.status === "BLOCKED" && (
                                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">
                                  BLOCKED
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[200px] truncate">{log.description}</p>
                        {log.ipAddress && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            IP: {log.ipAddress}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${severityConfig.color} flex items-center gap-1 w-fit`}>
                          <SeverityIcon className="h-3 w-3" />
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.isResolved ? (
                          <div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Resolved
                            </Badge>
                            {log.resolution && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[120px] truncate">
                                {log.resolution}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          <p>{new Date(log.detectedAt).toLocaleDateString()}</p>
                          <p className="text-xs">
                            {new Date(log.detectedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <FraudActions log={log} />
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

export default function AdminFraudPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading fraud alerts..." />}>
      <FraudContent />
    </Suspense>
  );
}
