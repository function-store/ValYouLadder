import { TriangleAlert } from "lucide-react";
import { SUPABASE_PROJECT_ID } from "@/lib/config";

interface PreProdBannerProps {
  message: string;
}

const PreProdBanner = ({ message }: PreProdBannerProps) => {
  return (
    <div
      className="w-full border border-yellow-500/40 bg-yellow-500/10 rounded-xl px-4 py-3 flex items-start gap-3 mb-8"
      data-project-id={SUPABASE_PROJECT_ID}
    >
      <TriangleAlert className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-yellow-500/90 leading-snug">
        <span className="font-semibold font-mono">Preview — </span>
        {message}
      </p>
    </div>
  );
};

export default PreProdBanner;
