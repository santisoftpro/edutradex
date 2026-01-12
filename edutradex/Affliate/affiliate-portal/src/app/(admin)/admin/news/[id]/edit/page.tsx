import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminNewsService } from "@/services/admin/news.service";
import { Button } from "@/components/ui/button";
import { NewsForm } from "@/components/admin/news/news-form";

export const metadata: Metadata = {
  title: "Edit News Article",
  description: "Edit an existing news article",
};

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await AdminNewsService.getNewsById(id);

  if (!article) {
    notFound();
  }

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
          <h1 className="text-2xl font-bold">Edit Article</h1>
          <p className="text-muted-foreground">
            Update &quot;{article.title}&quot;
          </p>
        </div>
      </div>

      <NewsForm mode="edit" initialData={article} />
    </div>
  );
}
