import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  CONTRACTED_AS,
} from "@/lib/projectTypes";

export interface DBSubmission {
  id: string;
  project_type: string;
  client_type: string;
  project_length: string;
  client_country: string | null;
  project_location: string;
  skills: string[];
  expertise_level: string;
  your_role: string | null;
  contracted_as: string | null;
  rate_type: string | null;
  currency: string;
  total_budget: number | null;
  your_budget: number;
  year_completed: number;
  description: string | null;
  created_at: string;
}

interface Props {
  submission: DBSubmission;
  token: string;
  onSaved: () => void;
  onClose: () => void;
}

const EditSubmissionDialog = ({ submission, token, onSaved, onClose }: Props) => {
  const [saving, setSaving] = useState(false);
  const [projectType, setProjectType] = useState(submission.project_type);
  const [clientType, setClientType] = useState(submission.client_type);
  const [projectLength, setProjectLength] = useState(submission.project_length);
  const [clientCountry, setClientCountry] = useState(submission.client_country ?? "");
  const [projectLocation, setProjectLocation] = useState(submission.project_location);
  const [skills, setSkills] = useState<string[]>(submission.skills ?? []);
  const [expertiseLevel, setExpertiseLevel] = useState(submission.expertise_level);
  const [yourRole, setYourRole] = useState(submission.your_role ?? "");
  const [contractedAs, setContractedAs] = useState(submission.contracted_as ?? "");
  const [rateType, setRateType] = useState(submission.rate_type ?? "");
  const [currency, setCurrency] = useState(submission.currency);
  const [totalBudget, setTotalBudget] = useState(
    submission.total_budget != null ? String(submission.total_budget) : ""
  );
  const [yourBudget, setYourBudget] = useState(String(submission.your_budget));
  const [yearCompleted, setYearCompleted] = useState(String(submission.year_completed));
  const [description, setDescription] = useState(submission.description ?? "");

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("manage-submission", {
        body: {
          submissionId: submission.id,
          token,
          action: "edit",
          updates: {
            project_type: projectType,
            client_type: clientType,
            project_length: projectLength,
            client_country: clientCountry || null,
            project_location: projectLocation,
            skills,
            expertise_level: expertiseLevel,
            your_role: yourRole || null,
            contracted_as: contractedAs || null,
            rate_type: rateType || null,
            currency,
            total_budget: totalBudget !== "" ? Number(totalBudget) : null,
            your_budget: Number(yourBudget),
            year_completed: Number(yearCompleted),
            description: description || null,
          },
        },
      });
      if (error) throw error;
      toast.success("Submission updated.");
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type of Project</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type of Client</Label>
              <Select value={clientType} onValueChange={setClientType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Duration</Label>
              <Select value={projectLength} onValueChange={setProjectLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_LENGTHS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year Completed</Label>
              <Input
                type="number"
                min={2000}
                max={new Date().getFullYear()}
                value={yearCompleted}
                onChange={(e) => setYearCompleted(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Location</Label>
              <Select value={projectLocation} onValueChange={setProjectLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client Origin <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={clientCountry} onValueChange={setClientCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills Used</Label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
                    skills.includes(skill)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expertise Level</Label>
              <Select value={expertiseLevel} onValueChange={setExpertiseLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPERTISE_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Your Role</Label>
              <Select value={yourRole} onValueChange={setYourRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YOUR_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contracted As</Label>
              <Select value={contractedAs} onValueChange={setContractedAs}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACTED_AS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>How Were You Paid?</Label>
              <Select value={rateType} onValueChange={setRateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Production Budget <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 50000"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Your Fee / Budget</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 15000"
                value={yourBudget}
                onChange={(e) => setYourBudget(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
              placeholder="Optional context about the project"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSubmissionDialog;
