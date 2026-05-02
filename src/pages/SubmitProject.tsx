import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, CheckCircle2, AlertTriangle, Lock, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { triggerMailingListPopup } from "@/components/MailingListPopup";
import { supabase } from "@/integrations/supabase/client";
import { addStoredSubmission } from "@/lib/mySubmissions";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  SKILLS,
  COUNTRIES,
  RATE_TYPES,
  YOUR_ROLES,
  CURRENCY_OPTIONS,
  CONTRACTED_AS,
  RATE_REPRESENTATIVENESS,
} from "@/lib/projectTypes";
import SearchableCombobox from "@/components/ui/searchable-combobox";
import { validateDescription, sanitizeDescriptionWithAI, SanitizationUnavailableError } from "@/lib/sanitizeSubmission";
import VerificationStep from "@/components/submit/VerificationStep";
import PrivacyConsentCheckbox from "@/components/gdpr/PrivacyConsentCheckbox";

const formSchema = z.object({
  projectType: z.string().min(1, "Project type is required"),
  clientType: z.string().min(1, "Client type is required"),
  projectLength: z.string().min(1, "Project length is required"),
  clientCountry: z.string().optional(),
  projectLocation: z.string().min(1, "Project location is required"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  expertiseLevel: z.string().min(1, "Expertise level is required"),
  yourRole: z.string().min(1, "Your role is required"),
  contractedAs: z.string().min(1, "Required"),
  rateType: z.string().min(1, "Rate type is required"),
  currency: z.string().min(1, "Currency is required"),
  totalBudget: z.number().min(0, "Total budget must be positive").optional(),
  yourBudget: z.number().min(0, "Your budget must be positive"),
  daysOfWork: z.number().min(1).optional(),
  rateRepresentativeness: z.string().min(1, "Required"),
  standardRate: z.number().min(0).optional(),
  yearCompleted: z.number().min(2000).max(new Date().getFullYear()),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

import { IS_SUBMISSIONS_OPEN as SUBMISSIONS_OPEN } from "@/lib/config";

const DRAFT_STORAGE_KEY = "vyl_submit_draft_v1";
const DRAFT_DEBOUNCE_MS = 600;

interface DraftPayload {
  form: Partial<FormData>;
  selectedSkills: string[];
  contactEmail: string;
  sendEditLink: boolean;
  newsletterOptIn: boolean;
  privacyConsent: boolean;
  savedAt: string;
  preferencesOnly?: boolean;
}

function readDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(payload: DraftPayload) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full / disabled — silently ignore. We don't want a draft-save
    // failure to interrupt the user mid-form.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

const SubmitProject = () => {
  const { toast } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionWarnings, setDescriptionWarnings] = useState<string[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [sendEditLink, setSendEditLink] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectType: "",
      clientType: "",
      projectLength: "",
      clientCountry: "",
      projectLocation: "",
      skills: [],
      expertiseLevel: "",
      yourRole: "",
      contractedAs: "",
      rateType: "project",
      rateRepresentativeness: "",
      standardRate: undefined,
      currency: "USD",
      totalBudget: undefined,
      yourBudget: 0,
      yearCompleted: new Date().getFullYear(),
      description: "",
    },
  });

  const rateRepresentativeness = form.watch("rateRepresentativeness");

  // ───────────────────────────────────────────────────────────────────────
  // Draft persistence: restore on mount, debounced auto-save on changes,
  // beforeunload guard while dirty, clear on successful submit.
  // ───────────────────────────────────────────────────────────────────────

  // Restore once on mount
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;

    if (draft.form) {
      // reset() merges with defaults and resets dirty flags
      form.reset({
        ...form.getValues(),
        ...draft.form,
      });
    }
    if (Array.isArray(draft.selectedSkills)) {
      setSelectedSkills(draft.selectedSkills);
      form.setValue("skills", draft.selectedSkills);
    }
    if (typeof draft.contactEmail === "string") setContactEmail(draft.contactEmail);
    if (typeof draft.sendEditLink === "boolean") setSendEditLink(draft.sendEditLink);
    if (typeof draft.newsletterOptIn === "boolean") setNewsletterOptIn(draft.newsletterOptIn);
    if (typeof draft.privacyConsent === "boolean") setPrivacyConsent(draft.privacyConsent);

    if (!draft.preferencesOnly) {
      setDraftRestored(true);
      toast({
        title: "We restored your draft",
        description: "Your previous answers were saved on this device.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save
  const saveTimer = useRef<number | null>(null);
  const watchedValues = form.watch();
  useEffect(() => {
    setIsDirty(true);
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      writeDraft({
        form: watchedValues,
        selectedSkills,
        contactEmail,
        sendEditLink,
        newsletterOptIn,
        privacyConsent,
        savedAt: new Date().toISOString(),
      });
    }, DRAFT_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
      }
    };
    // watchedValues is a new object each render; React diffs the referenced
    // deps and skips noop runs.
  }, [watchedValues, selectedSkills, contactEmail, sendEditLink, newsletterOptIn, privacyConsent]);

  // beforeunload guard while we have unsaved (in-memory only) edits
  useEffect(() => {
    if (!isDirty || isSubmitted || isSubmitting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom strings but require a returnValue
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isSubmitted, isSubmitting]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setDraftRestored(false);
    form.reset({
      projectType: "",
      clientType: "",
      projectLength: "",
      clientCountry: "",
      projectLocation: "",
      skills: [],
      expertiseLevel: "",
      yourRole: "",
      contractedAs: "",
      rateType: "project",
      rateRepresentativeness: "",
      standardRate: undefined,
      currency: "USD",
      totalBudget: undefined,
      yourBudget: 0,
      yearCompleted: new Date().getFullYear(),
      description: "",
    });
    setSelectedSkills([]);
    setContactEmail("");
    setSendEditLink(false);
    setNewsletterOptIn(false);
    setPrivacyConsent(false);
    setIsDirty(false);
    toast({ title: "Draft discarded" });
  }, [form, toast]);

  const toggleSkill = (skill: string) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(updated);
    form.setValue("skills", updated);
  };

  const handleDescriptionChange = (value: string) => {
    form.setValue("description", value);
    const warnings = validateDescription(value);
    setDescriptionWarnings(warnings);
  };

  const onSubmit = async (data: FormData) => {
    if (!isVerified || !privacyConsent) {
      toast({
        title: !isVerified ? "Verification required" : "Consent required",
        description: !isVerified
          ? "Please complete the verification step first."
          : "Please agree to the privacy policy before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let sanitized = "";
      let redactions: string[] = [];
      if (data.description && data.description.trim() !== "") {
        try {
          const result = await sanitizeDescriptionWithAI(data.description);
          sanitized = result.sanitized;
          redactions = result.redactions;
        } catch (sanErr) {
          if (sanErr instanceof SanitizationUnavailableError) {
            toast({
              title: "Couldn't process your description",
              description:
                sanErr.message ||
                "Our description cleanup is unavailable. Please try again in a minute, or remove the description and resubmit.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          throw sanErr;
        }
      }

      const sanitizedData = {
        ...data,
        description: sanitized,
      };

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "submit-project",
        {
          body: {
            projectType: sanitizedData.projectType,
            clientType: sanitizedData.clientType,
            projectLength: sanitizedData.projectLength,
            clientCountry: sanitizedData.clientCountry || undefined,
            projectLocation: sanitizedData.projectLocation,
            skills: sanitizedData.skills,
            expertiseLevel: sanitizedData.expertiseLevel,
            yourRole: sanitizedData.yourRole,
            contractedAs: sanitizedData.contractedAs,
            rateRepresentativeness: sanitizedData.rateRepresentativeness,
            standardRate: sanitizedData.standardRate ?? null,
            rateType: sanitizedData.rateType,
            currency: sanitizedData.currency,
            totalBudget: sanitizedData.totalBudget ?? null,
            yourBudget: sanitizedData.yourBudget,
            daysOfWork: sanitizedData.daysOfWork ?? null,
            yearCompleted: sanitizedData.yearCompleted,
            description: sanitizedData.description || null,
            contactEmail: (sendEditLink || newsletterOptIn) ? contactEmail : undefined,
            sendEditLink,
            newsletterOptIn,
          },
        }
      );

      if (fnError) throw fnError;
      addStoredSubmission(fnData.submissionId, fnData.token);

      // Submission persisted — clear the draft but keep sticky preferences.
      const vals = form.getValues();
      writeDraft({
        form: { currency: vals.currency, projectLocation: vals.projectLocation, clientCountry: vals.clientCountry },
        selectedSkills: [],
        contactEmail,
        sendEditLink,
        newsletterOptIn,
        privacyConsent: false,
        preferencesOnly: true,
        savedAt: new Date().toISOString(),
      });
      setIsDirty(false);

      toast({
        title: "Project submitted!",
        description: redactions.length > 0
          ? `Thank you! ${redactions.length} identifying item(s) were automatically redacted.`
          : "Thank you for contributing to the community.",
      });
      setIsSubmitted(true);
      if (newsletterOptIn) localStorage.setItem("mailing-list-dismissed", "subscribed");
      setTimeout(triggerMailingListPopup, 2000);
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-lg mx-auto text-center">
            <div className="h-20 w-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Thank you!</h1>
            <p className="text-muted-foreground mb-8">
              Your submission is in. Got another project worth adding? Every entry makes the estimates more accurate — especially ones from different project types or locations.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                Submit Another
              </Button>
              <Link to="/my-submissions">
                <Button variant="secondary">My Submissions</Button>
              </Link>
              <Link to="/database">
                <Button variant="glow">View Database</Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Submit a <span className="text-primary">Project</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Each submission is one real project you remember clearly — the rate, the scope, who it was for. Specific beats vague every time.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 px-5 py-4 mb-8 space-y-1.5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground text-xs uppercase tracking-wide font-mono mb-2">What makes a useful submission</p>
            <p>→ A project where you remember the scope and rate well enough to be accurate</p>
            <p>→ Below or above your usual rate? Still valuable — just flag it in the form</p>
            <p>→ Adding working days and a short description makes your entry significantly more useful</p>
          </div>

          {!SUBMISSIONS_OPEN && (
            <div className="w-full border border-yellow-500/40 bg-yellow-500/10 rounded-xl px-4 py-3 flex items-start gap-3 mb-8">
              <Lock className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-500/90 leading-snug">
                <span className="font-semibold font-mono">Preview mode — </span>
                Submissions are not open yet. You can explore the form, but nothing will be saved.
              </p>
            </div>
          )}

          {draftRestored && (
            <div className="w-full border border-primary/30 bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-8">
              <p className="text-sm text-muted-foreground leading-snug">
                <span className="font-medium text-foreground">Draft restored.</span>{" "}
                We loaded your previous answers from this device.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={discardDraft}
              >
                Discard draft
              </Button>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Project Details */}
            <div className="node-card rounded-xl p-6 border border-border space-y-6">
              <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Project Details</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Type of Project *</Label>
                  <Select onValueChange={(v) => form.setValue("projectType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.projectType && (
                    <p className="text-sm text-destructive">{form.formState.errors.projectType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientType">Type of Client *</Label>
                  <Select onValueChange={(v) => form.setValue("clientType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.clientType && (
                    <p className="text-sm text-destructive">{form.formState.errors.clientType.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectLength">Project Duration *</Label>
                  <Select onValueChange={(v) => form.setValue("projectLength", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_LENGTHS.map((length) => (
                        <SelectItem key={length.value} value={length.value}>
                          {length.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.projectLength && (
                    <p className="text-sm text-destructive">{form.formState.errors.projectLength.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearCompleted">Year Completed *</Label>
                  <Input
                    type="number"
                    min={2000}
                    max={new Date().getFullYear()}
                    {...form.register("yearCompleted", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="node-card rounded-xl p-6 border border-border space-y-6">
              <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Location</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectLocation">Project Location *</Label>
                  <SearchableCombobox
                    options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                    value={form.watch("projectLocation")}
                    onChange={(v) => {
                      const prevProject = form.getValues("projectLocation");
                      const currentClient = form.getValues("clientCountry");
                      form.setValue("projectLocation", v);
                      if (!currentClient || currentClient === prevProject) {
                        form.setValue("clientCountry", v);
                      }
                    }}
                    placeholder="Where was the project?"
                    searchPlaceholder="Search country..."
                  />
                  {form.formState.errors.projectLocation && (
                    <p className="text-sm text-destructive">{form.formState.errors.projectLocation.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientCountry">
                    Client Origin{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <SearchableCombobox
                    options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                    value={form.watch("clientCountry")}
                    onChange={(v) => form.setValue("clientCountry", v)}
                    placeholder="Where is the client from?"
                    searchPlaceholder="Search country..."
                  />
                  {form.watch("clientCountry") && form.watch("clientCountry") === form.watch("projectLocation") && (
                    <p className="text-xs text-muted-foreground">Same as project location</p>
                  )}
                </div>
              </div>
            </div>

            {/* Skills & Expertise */}
            <div className="node-card rounded-xl p-6 border border-border space-y-6">
              <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Skills & Expertise</h2>

              <div className="space-y-4">
                <Label>Skills Used *</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
                        selectedSkills.includes(skill)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {form.formState.errors.skills && (
                  <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expertiseLevel">Your Expertise Level *</Label>
                  <Select onValueChange={(v) => form.setValue("expertiseLevel", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERTISE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.expertiseLevel && (
                    <p className="text-sm text-destructive">{form.formState.errors.expertiseLevel.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yourRole">Your Role *</Label>
                  <Select onValueChange={(v) => form.setValue("yourRole", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {YOUR_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.yourRole && (
                    <p className="text-sm text-destructive">{form.formState.errors.yourRole.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="node-card rounded-xl p-6 border border-border space-y-6">
              <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Budget</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractedAs">Contracted As *</Label>
                  <Select onValueChange={(v) => form.setValue("contractedAs", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACTED_AS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.contractedAs && (
                    <p className="text-sm text-destructive">{form.formState.errors.contractedAs.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateType">How Were You Paid? *</Label>
                  <Select defaultValue="project" onValueChange={(v) => form.setValue("rateType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.rateType && (
                    <p className="text-sm text-destructive">{form.formState.errors.rateType.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <SearchableCombobox
                    options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
                    value={form.watch("currency") || "USD"}
                    onChange={(v) => form.setValue("currency", v)}
                    placeholder="Select currency"
                    searchPlaceholder="Search currency..."
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yourBudget">Your Fee / Budget *</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 15000"
                    {...form.register("yourBudget", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">What you personally received</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalBudget">Total Production Budget</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 50000"
                    {...form.register("totalBudget", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })}
                  />
                  <p className="text-xs text-muted-foreground">Optional — if you know the full project budget</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daysOfWork">Days of Work <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 15"
                    {...form.register("daysOfWork", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })}
                  />
                  <p className="text-xs text-muted-foreground">Total working days you personally put in</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Does this rate reflect your standard pricing? *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {RATE_REPRESENTATIVENESS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        form.setValue("rateRepresentativeness", opt.value);
                        if (opt.value === "standard") form.setValue("standardRate", undefined);
                      }}
                      className={`px-3 py-2.5 rounded-md text-sm text-left transition-all border ${
                        rateRepresentativeness === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.formState.errors.rateRepresentativeness && (
                  <p className="text-sm text-destructive">{form.formState.errors.rateRepresentativeness.message}</p>
                )}
              </div>

              {(rateRepresentativeness === "below_market" || rateRepresentativeness === "above_market") && (
                <div className="space-y-2">
                  <Label htmlFor="standardRate">
                    What would your standard rate have been? <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 20000"
                    {...form.register("standardRate", { setValueAs: (v) => v === "" || v === undefined ? undefined : Number(v) })}
                  />
                  <p className="text-xs text-muted-foreground">Helps calibrate estimates for others — not shown publicly as your identity</p>
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="node-card rounded-xl p-6 border border-border space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="font-mono font-semibold text-lg">Additional Notes</h2>
                <p className="text-xs text-muted-foreground mt-1">Write freely — AI will automatically strip any client names, brand names, venues, or other identifying details before saving.</p>
              </div>
              <Textarea
                placeholder="Scope, deliverables, unusual circumstances, what made this project unique..."
                onChange={(e) => handleDescriptionChange(e.target.value.slice(0, 500))}
                className="min-h-[100px]"
                maxLength={500}
              />
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  The more context you add, the more useful your entry is to the community.
                </p>
                <p className={`text-xs shrink-0 ${(form.watch("description")?.length ?? 0) >= 450 ? "text-yellow-500" : "text-muted-foreground"}`}>
                  {form.watch("description")?.length ?? 0} / 500
                </p>
              </div>
              {descriptionWarnings.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-500 space-y-1">
                    {descriptionWarnings.map((warning, i) => (
                      <p key={i}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Consent */}
            <PrivacyConsentCheckbox
              checked={privacyConsent}
              onCheckedChange={setPrivacyConsent}
              id="submit-privacy-consent"
            />

            {/* Optional email */}
            <div className="rounded-xl p-5 border border-border/40 bg-secondary/10 space-y-4">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Optional</p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={sendEditLink}
                    onCheckedChange={(v) => setSendEditLink(!!v)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm leading-snug">Email me a private edit link</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sent once, then your email is deleted. Not linked to your public submission.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={newsletterOptIn}
                    onCheckedChange={(v) => setNewsletterOptIn(!!v)}
                    className="mt-0.5"
                  />
                  <p className="text-sm leading-snug">Keep me updated on new features and data</p>
                </label>
              </div>
              {(sendEditLink || newsletterOptIn) && (
                <div className="relative max-w-sm">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
            </div>

            {/* Verification Step */}
            <VerificationStep
              onVerified={() => setIsVerified(true)}
              isVerifying={isSubmitting}
            />

            {isVerified && privacyConsent && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Ready to submit
              </div>
            )}

            <Button
              type="submit"
              variant="glow"
              size="xl"
              className="w-full gap-2"
              disabled={!SUBMISSIONS_OPEN || !isVerified || !privacyConsent || isSubmitting}
            >
              <Send className="h-5 w-5" />
              {!SUBMISSIONS_OPEN ? "Submissions not open yet" : isSubmitting ? "Submitting..." : "Submit Anonymously"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SubmitProject;
