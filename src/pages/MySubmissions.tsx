import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2, KeyRound } from "lucide-react";
import { getStoredSubmissions, addStoredSubmission, removeStoredSubmission } from "@/lib/mySubmissions";
import EditSubmissionDialog, { DBSubmission } from "@/components/submit/EditSubmissionDialog";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  YOUR_ROLES,
  RATE_TYPES,
} from "@/lib/projectTypes";

const label = (
  list: readonly { value: string; label: string }[],
  value: string
) => list.find((i) => i.value === value)?.label ?? value;

const MySubmissions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<DBSubmission[]>([]);
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<DBSubmission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoredFromEmail, setRestoredFromEmail] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    const stored = getStoredSubmissions();
    const ids = stored.map((s) => s.id);
    const tMap = Object.fromEntries(stored.map((s) => [s.id, s.token]));
    setTokenMap(tMap);

    if (ids.length === 0) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("project_submissions")
      .select("*")
      .in("id", ids);

    if (error) {
      toast.error("Failed to load your submissions.");
    } else {
      setSubmissions((data ?? []) as unknown as DBSubmission[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    const token = searchParams.get("token");
    if (id && token) {
      addStoredSubmission(id, token);
      setSearchParams({}, { replace: true });
      setRestoredFromEmail(true);
    }
    fetchSubmissions();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Parse either:
   *  - a full edit URL like https://.../my-submissions?id=...&token=...
   *  - or two values "id, token" / "id token" / "id\ntoken"
   */
  const parseRecoveryInput = (raw: string): { id: string; token: string } | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Try URL parse first (covers both full and relative URLs)
    try {
      const url = trimmed.includes("://") ? new URL(trimmed) : new URL(trimmed, "https://placeholder.local");
      const id = url.searchParams.get("id");
      const token = url.searchParams.get("token");
      if (id && token) return { id, token };
    } catch {
      // fall through to plain-text parsing
    }

    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 2) {
      return { id: parts[0], token: parts[1] };
    }
    return null;
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    const parsed = parseRecoveryInput(recoveryInput);
    if (!parsed) {
      setRecoveryError(
        "Paste the full edit URL from your email, or both the submission id and token separated by a space."
      );
      return;
    }

    setRecoveryBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-submission", {
        body: { submissionId: parsed.id, token: parsed.token, action: "verify" },
      });

      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      if (error || !data?.success || status === 401) {
        setRecoveryError(
          "That id + token combination didn't match anything. Double-check the link in your email."
        );
        return;
      }

      addStoredSubmission(parsed.id, parsed.token);
      setRecoveryOpen(false);
      setRecoveryInput("");
      setRestoredFromEmail(true);
      toast.success("Submission restored on this browser.");
      await fetchSubmissions();
    } catch (err) {
      console.error("Recovery error:", err);
      setRecoveryError("Something went wrong. Please try again or contact us.");
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this submission? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.functions.invoke("manage-submission", {
        body: { submissionId: id, token: tokenMap[id], action: "delete" },
      });
      if (error) throw error;
      removeStoredSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setTokenMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Submission deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete submission.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Submissions</h1>
            <p className="text-muted-foreground">
              Submissions from this browser. You can edit or delete any entry.
            </p>
          </div>

          {restoredFromEmail && (
            <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              Your submission has been restored from your email link and is now accessible in this browser.
            </div>
          )}

          {submissions.length === 0 ? (
            <div className="node-card rounded-xl p-12 border border-border text-center space-y-6">
              <p className="text-muted-foreground">
                No submissions found in this browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Link to="/submit">
                  <Button variant="glow">Submit a Project</Button>
                </Link>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setRecoveryOpen(true)}
                >
                  <KeyRound className="h-4 w-4" />
                  Have an edit link from email?
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If you submitted on another device or cleared this browser, paste the edit
                link from your email to restore access.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="node-card rounded-xl p-6 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-semibold">
                          {label(PROJECT_TYPES, sub.project_type)}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">
                          {label(CLIENT_TYPES, sub.client_type)}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">
                          {sub.year_completed}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                        <span>{label(PROJECT_LENGTHS, sub.project_length)}</span>
                        <span>{sub.project_location}</span>
                        {sub.your_role && (
                          <span>{label(YOUR_ROLES, sub.your_role)}</span>
                        )}
                        {sub.rate_type && (
                          <span>{label(RATE_TYPES, sub.rate_type)}</span>
                        )}
                      </div>

                      <div className="mt-3 font-semibold">
                        {sub.currency} {sub.your_budget.toLocaleString()}
                        {sub.total_budget != null && (
                          <span className="font-normal text-muted-foreground text-sm ml-2">
                            / {sub.currency} {sub.total_budget.toLocaleString()} total
                          </span>
                        )}
                      </div>

                      {sub.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sub.skills.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-sm bg-secondary text-xs font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setEditTarget(sub)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        disabled={deletingId === sub.id}
                        onClick={() => handleDelete(sub.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === sub.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 text-xs text-muted-foreground text-center">
            <p>
              Ownership is tracked by this browser only. Clearing browser data will remove your ability to edit or delete submissions.
            </p>
            {submissions.length > 0 && (
              <button
                type="button"
                onClick={() => setRecoveryOpen(true)}
                className="text-muted-foreground/80 hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Restore another submission from an email link
              </button>
            )}
          </div>
        </div>
      </div>

      {editTarget && (
        <EditSubmissionDialog
          submission={editTarget}
          token={tokenMap[editTarget.id]}
          onSaved={() => {
            setEditTarget(null);
            fetchSubmissions();
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from email link</DialogTitle>
            <DialogDescription>
              Paste the full edit URL from your email, or both the submission id and the
              token (separated by a space) into the box below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-input">Edit link or id + token</Label>
              <Input
                id="recovery-input"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="https://valyouladder.com/my-submissions?id=...&token=..."
                autoFocus
              />
              {recoveryError && (
                <p className="text-sm text-destructive">{recoveryError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRecoveryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recoveryBusy}>
                {recoveryBusy ? "Verifying…" : "Restore"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default MySubmissions;
