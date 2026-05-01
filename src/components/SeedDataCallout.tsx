import { Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Threshold above which the corpus is dense enough that the "early-days"
 * callout becomes noise. Tuned conservatively — disappears automatically
 * as submissions accumulate.
 */
const SEED_DATA_CUTOFF = 50;

interface SeedDataCalloutProps {
  /** Override copy (e.g. softer wording on the database page). */
  message?: string;
  className?: string;
}

/**
 * Visible-but-not-alarming callout shown while the database is still small.
 * Visibility is gated on the live row count — it disappears automatically
 * once enough submissions accumulate.
 */
const SeedDataCallout = ({ message, className }: SeedDataCalloutProps) => {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count, error } = await supabase
          .from("project_submissions")
          .select("*", { count: "exact", head: true });
        if (cancelled) return;
        if (error) {
          // Be conservative: if we can't tell, show the callout.
          setShow(true);
          return;
        }
        setShow((count ?? 0) < SEED_DATA_CUTOFF);
      } catch {
        if (!cancelled) setShow(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3 text-sm ${className ?? ""}`}
    >
      <Sprout className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
      <p className="text-muted-foreground leading-snug">
        {message ??
          "Early days — the database is still small. Estimates will tighten as more submissions land. Your contribution helps the next person."}
      </p>
    </div>
  );
};

export default SeedDataCallout;
