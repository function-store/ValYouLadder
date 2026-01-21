import { useState } from "react";
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
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  SKILLS,
  COUNTRIES,
} from "@/lib/projectTypes";
import { validateDescription, sanitizeDescription } from "@/lib/sanitizeSubmission";
import VerificationStep from "@/components/submit/VerificationStep";

const formSchema = z.object({
  projectType: z.string().min(1, "Project type is required"),
  clientType: z.string().min(1, "Client type is required"),
  projectLength: z.string().min(1, "Project length is required"),
  clientCountry: z.string().min(1, "Client country is required"),
  projectLocation: z.string().min(1, "Project location is required"),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  expertiseLevel: z.string().min(1, "Expertise level is required"),
  totalBudget: z.number().min(0, "Total budget must be positive"),
  yourBudget: z.number().min(0, "Your budget must be positive"),
  teamSize: z.number().min(1, "Team size must be at least 1"),
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
      totalBudget: 0,
      yourBudget: 0,
      teamSize: 1,
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
    if (!isVerified) {
      toast({
        title: "Verification required",
        description: "Please complete the verification step first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Sanitize description before submission
    const sanitizedData = {
      ...data,
      description: sanitizeDescription(data.description),
    };
    
    console.log("Form submitted:", sanitizedData);
    // TODO: Submit to database
    
    toast({
      title: "Project submitted!",
      description: "Thank you for contributing to the community.",
    });
    setIsSubmitting(false);
    setIsSubmitted(true);
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
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                Submit Another
              </Button>
              <Button variant="glow" onClick={() => window.location.href = "/database"}>
                View Database
              </Button>
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
                  <Label htmlFor="projectLength">Project Length *</Label>
                  <Select onValueChange={(v) => form.setValue("projectLength", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
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
                  <Label htmlFor="clientCountry">Client Origin (Country) *</Label>
                  <Select onValueChange={(v) => form.setValue("clientCountry", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
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

                <div className="space-y-2">
                  <Label htmlFor="projectLocation">Project Location *</Label>
                  <Select onValueChange={(v) => form.setValue("projectLocation", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
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

            {/* Skills */}
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    type="number"
                    min={1}
                    {...form.register("teamSize", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="node-card rounded-xl p-6 border border-border space-y-6">
              <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Budget</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalBudget">Total Production Budget ($) *</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 50000"
                    {...form.register("totalBudget", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">The entire project budget including all costs</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yourBudget">Your Fee / Budget ($) *</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 15000"
                    {...form.register("yourBudget", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">What you received for your work</p>
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

            {/* Verification Step */}
            <VerificationStep
              onVerified={() => setIsVerified(true)}
              isVerifying={isSubmitting}
            />

            {isVerified && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Verification complete
              </div>
            )}

            <Button 
              type="submit" 
              variant="glow" 
              size="xl" 
              className="w-full gap-2"
              disabled={!isVerified || isSubmitting}
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
