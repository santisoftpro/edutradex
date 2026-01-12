"use client";

import { useState } from "react";
import { Plus, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateLinkDialog } from "./create-link-dialog";

interface LinksHeaderProps {
  totalLinks: number;
}

export function LinksHeader({ totalLinks }: LinksHeaderProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-primary" />
            Tracking Links
          </h1>
          <p className="text-muted-foreground">
            Manage your affiliate links and track their performance.{" "}
            <span className="text-foreground font-medium">{totalLinks}</span> total links.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Link
        </Button>
      </div>

      <CreateLinkDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}
