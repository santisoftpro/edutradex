import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NewsForm } from "@/components/admin/news/news-form";

export const metadata: Metadata = {
  title: "Create News Article",
  description: "Create a new news article",
};

export default function CreateNewsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/news">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create News Article</h1>
          <p className="text-muted-foreground">
            Write and publish a new article for partners
          </p>
        </div>
      </div>

      <NewsForm mode="create" />
    </div>
  );
}
