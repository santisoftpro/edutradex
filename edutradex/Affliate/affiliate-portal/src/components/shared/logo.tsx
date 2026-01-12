import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showPartners?: boolean;
  className?: string;
  asLink?: boolean;
}

const sizeClasses = {
  sm: {
    icon: "h-6 w-6",
    text: "text-lg",
    partners: "text-xs",
  },
  md: {
    icon: "h-8 w-8",
    text: "text-xl",
    partners: "text-sm",
  },
  lg: {
    icon: "h-10 w-10",
    text: "text-2xl",
    partners: "text-base",
  },
};

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-primary", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoContent({
  size = "md",
  showPartners = false,
  className,
}: Omit<LogoProps, "asLink">) {
  const sizes = sizeClasses[size];

  return (
    <div className={cn("flex items-center", className)}>
      <LogoIcon className={sizes.icon} />
      <span className={cn("ml-2 font-bold", sizes.text)}>
        <span className="text-primary">Optigo</span>
        <span className="text-foreground">Broker</span>
        {showPartners && (
          <span className={cn("ml-1 text-muted-foreground", sizes.partners)}>
            Partners
          </span>
        )}
      </span>
    </div>
  );
}

export function Logo({
  size = "md",
  showPartners = false,
  className,
  asLink = true,
}: LogoProps) {
  if (asLink) {
    return (
      <Link href="/" className={cn("flex items-center gap-2", className)}>
        <LogoContent size={size} showPartners={showPartners} />
      </Link>
    );
  }

  return <LogoContent size={size} showPartners={showPartners} className={className} />;
}

export { LogoIcon };
