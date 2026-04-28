import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "mailing-list-dismissed";
const EVENT_NAME = "show-mailing-list";

export const triggerMailingListPopup = () => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

const MailingListPopup = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shouldShow = useCallback(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    return !dismissed;
  }, []);

  useEffect(() => {
    const handler = () => {
      if (shouldShow()) setOpen(true);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [shouldShow]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setOpen(false);
  };

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
        } else {
          throw error;
        }
      } else {
        toast.success("Thanks for subscribing!");
      }

      localStorage.setItem(STORAGE_KEY, "subscribed");
      setOpen(false);
    } catch (err) {
      console.error("Mailing list error:", err);
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Stay in the loop</DialogTitle>
          </div>
          <DialogDescription>
            Get notified when we add new features, data insights, or industry benchmarks. No spam — just updates that matter.{" "}
            <a href="/unsubscribe" className="underline hover:text-foreground transition-colors">
              Unsubscribe any time.
            </a>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
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
        <button
          onClick={dismiss}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          No thanks
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default MailingListPopup;
