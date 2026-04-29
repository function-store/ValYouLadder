import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewsletterSignupProps {
  compact?: boolean;
}

const NewsletterSignup = ({ compact = false }: NewsletterSignupProps) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("mailing_list" as any)
        .insert({ email: trimmed } as any);

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
          setDone(true);
        } else {
          throw error;
        }
      } else {
        toast.success("Thanks for subscribing!");
        setDone(true);
      }
    } catch (err) {
      console.error("Mailing list error:", err);
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <p className={`text-primary font-mono ${compact ? "text-xs" : "text-sm"}`}>
        ✓ You're on the list
      </p>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-8 text-xs w-44"
        />
        <Button type="submit" size="sm" className="h-8 text-xs px-3" disabled={submitting}>
          {submitting ? "..." : "Subscribe"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Get notified when we add new features or data insights. No spam.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "..." : "Subscribe"}
        </Button>
      </form>
    </div>
  );
};

export default NewsletterSignup;
