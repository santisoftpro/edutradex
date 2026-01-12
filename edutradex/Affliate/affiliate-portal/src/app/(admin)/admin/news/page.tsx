import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Newspaper, Plus, Eye, Edit, Globe, Pin } from "lucide-react";

import { AdminNewsService } from "@/services/admin/news.service";
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
import { NewsActions } from "@/components/admin/news/news-actions";

export const metadata: Metadata = {
  title: "News Management",
  description: "Manage news articles",
};

function getCategoryColor(category: string) {
  switch (category) {
    case "ANNOUNCEMENT":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "UPDATE":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "PROMOTION":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "EDUCATION":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "NEWS":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

async function NewsContent() {
  const { data: news, total } = await AdminNewsService.getNews({
    page: 1,
    pageSize: 50,
  });

  const publishedCount = news.filter((n) => n.isPublished).length;
  const draftCount = total - publishedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">News Management</h1>
          <p className="text-muted-foreground">
            {total} total articles • {publishedCount} published • {draftCount} drafts
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/news/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Article
          </Link>
        </Button>
      </div>

      {/* News Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            All Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No news articles found
                  </TableCell>
                </TableRow>
              ) : (
                news.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{article.title}</p>
                          {article.isPinned && (
                            <Pin className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                          {article.excerpt}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(article.category)}>
                        {article.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {article.isPublished ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1 w-fit">
                          <Globe className="h-3 w-3" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(article.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/admin/news/${article.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <NewsActions article={article} />
                      </div>
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

export default function AdminNewsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading news..." />}>
      <NewsContent />
    </Suspense>
  );
}
