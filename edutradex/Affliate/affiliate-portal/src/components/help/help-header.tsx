"use client";

import { useState } from "react";
import { HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HelpHeader() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-2">
        <HelpCircle className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-3xl font-bold">Help Center</h1>
      <p className="text-muted-foreground max-w-xl mx-auto">
        Find answers to common questions, learn how to maximize your earnings,
        and get the support you need.
      </p>

      {/* Search */}
      <div className="max-w-md mx-auto pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>
    </div>
  );
}
