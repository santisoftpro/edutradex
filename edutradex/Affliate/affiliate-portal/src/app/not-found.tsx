import { NotFound } from "@/components/shared/error-boundary";

export default function NotFoundPage() {
  return (
    <NotFound
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      actionLabel="Go to Home"
      actionHref="/"
    />
  );
}
