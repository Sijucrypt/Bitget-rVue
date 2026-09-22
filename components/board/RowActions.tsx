import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ArrowUpRight } from "lucide-react";

export function RowActions({ rToken }: { rToken: string }) {
  return (
    <div className="px-5 py-3 text-right">
      <Link
        href={`/chat?rToken=${encodeURIComponent(rToken)}`}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-brand/10 hover:text-brand"
      >
        Research <Icon icon={ArrowUpRight} size={14} />
      </Link>
    </div>
  );
}
