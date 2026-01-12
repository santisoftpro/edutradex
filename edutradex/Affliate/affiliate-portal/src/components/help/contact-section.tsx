"use client";

import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Clock,
  Send,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ContactSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Contact Support */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Contact Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">
                  partners@optigobroker.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Response Time</p>
                <p className="text-sm text-muted-foreground">
                  Usually within 24 hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <Send className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Telegram</p>
                <p className="text-sm text-muted-foreground">@OptigoPartners</p>
              </div>
            </div>
          </div>

          <Button className="w-full" asChild>
            <Link href="/support">
              <MessageSquare className="h-4 w-4 mr-2" />
              Create Support Ticket
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Useful Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Additional resources to help you succeed as a partner.
          </p>

          <div className="space-y-2">
            <Link
              href="/affiliate-level"
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>Partner Level Details</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/links"
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>Create Tracking Links</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/statistics"
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>View Your Statistics</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/payments"
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>Payment & Withdrawals</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="/settings"
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>Account Settings</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Partner Guidelines */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-4">
            <h4 className="font-medium text-primary mb-2">Partner Guidelines</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Make sure to review our partner guidelines to ensure compliance and
              avoid account restrictions.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">
                View Guidelines
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
