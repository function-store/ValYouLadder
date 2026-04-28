import { useState } from "react";
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
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
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
  CURRENCIES,
} from "@/lib/projectTypes";
import { validateDescription, sanitizeDescriptionWithAI } from "@/lib/sanitizeSubmission";
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
  rateType: z.string().min(1, "Rate type is required"),
  currency: z.string().min(1, "Currency is required"),
  totalBudget: z.number().min(0, "Total budget must be positive").optional(),
  yourBudget: z.number().min(0, "Your budget must be positive"),
  yearCompleted: z.number().min(2000).max(new Date().getFullYear()),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const SubmitProject = () => {
  const { toast } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descriptionWarnings, setDescriptionWarnings] = useState<string[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);

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
      rateType: "",
      currency: "USD",
      totalBudget: undefined,
      yourBudget: 0,
      yearCompleted: new Date().getFullYear(),
      description: "",
    },
  });

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
      const { sanitized, redactions } = await sanitizeDescriptionWithAI(data.description);

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
            rateType: sanitizedData.rateType,
            currency: sanitizedData.currency,
            totalBudget: sanitizedData.totalBudget ?? null,
            yourBudget: sanitizedData.yourBudget,
            yearCompleted: sanitizedData.yearCompleted,
            description: sanitizedData.description || null,
          },
        }
      );

      if (fnError) throw fnError;
      addStoredSubmission(fnData.submissionId, fnData.token);

      toast({
        title: "Project submitted!",
        description: redactions.length > 0
          ? `Thank you! ${redactions.length} identifying item(s) were automatically redacted.`
          : "Thank you for contributing to the community.",
      });
      setIsSubmitted(true);
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
              Your anonymous project submission has been received. It will help fellow creatives understand market rates.
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
            <p className="text-muted-foreground">
              Share your project details anonymously to help build a transparent rate database.
            </p>
          </div>

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
                  <Select onValueChange={(v) => form.setValue("projectLocation", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where was the project?" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.projectLocation && (
                    <p className="text-sm text-destructive">{form.formState.errors.projectLocation.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientCountry">Client Origin <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Select onValueChange={(v) => form.setValue("clientCountry", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where is the client from?" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="rateType">How Were You Paid? *</Label>
                  <Select onValueChange={(v) => form.setValue("rateType", v)}>
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

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    defaultValue="USD"
                    onValueChange={(v) => form.setValue("currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                  <Label htmlFor="yourBudget">Your Fee / Budget *</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 15000"
                    {...form.register("yourBudget", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">What you personally received</p>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="node-card rounded-xl p-6 border border-border space-y-4">
              <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Additional Notes</h2>
              <Textarea
                placeholder="Any additional context about the project (optional)"
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Please don't include any identifying information about the client or yourself.
                Any detected names, URLs, or identifiers will be automatically redacted.
              </p>
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
              disabled={!isVerified || !privacyConsent || isSubmitting}
            >
              <Send className="h-5 w-5" />
              {isSubmitting ? "Submitting..." : "Submit Anonymously"}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SubmitProject;
