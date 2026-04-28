import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle2, Trash2 } from "lucide-react";

const Unsubscribe = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const { error } = await supabase.functions.invoke("unsubscribe", {
        body: { email: trimmed },
      });

      if (error) throw error;

      setStatus("done");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again or contact us directly.");
    }
  };

  if (status === "done") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-md mx-auto text-center">
            <div className="h-20 w-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">You've been unsubscribed</h1>
            <p className="text-muted-foreground">
              Your email has been removed from our mailing list. You won't receive any further
              emails from us.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Unsubscribe</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email address to remove it from our mailing list.
              This also fulfils your GDPR right to erasure for this data.
            </p>
          </div>

          <div className="node-card rounded-xl p-6 border border-border">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {status === "error" && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              <Button
                type="submit"
                variant="destructive"
                className="w-full gap-2"
                disabled={status === "loading"}
              >
                <Trash2 className="h-4 w-4" />
                {status === "loading" ? "Removing..." : "Remove my email"}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            If you have other data requests, contact us via the{" "}
            <a href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Unsubscribe;
