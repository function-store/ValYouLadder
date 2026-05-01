import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { X } from "lucide-react";
import SearchableCombobox from "@/components/ui/searchable-combobox";

interface ProjectSubmission {
  id: string;
  project_type: string;
  client_type: string;
  project_length: string;
  client_country: string | null;
  project_location: string;
  skills: string[];
  expertise_level: string;
  total_budget: number | null;
  your_budget: number;
  days_of_work: number | null;
  currency: string;
  rate_type: string | null;
  contracted_as: string | null;
  rate_representativeness: string | null;
  standard_rate: number | null;
  your_role: string | null;
  year_completed: number;
  description: string | null;
  created_at: string;
}

interface AdminEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: ProjectSubmission;
  onSave: (updated: ProjectSubmission) => void;
}

const AdminEditDialog = ({
  open,
  onOpenChange,
  submission,
  onSave,
}: AdminEditDialogProps) => {
  const [formData, setFormData] = useState<ProjectSubmission>(submission);

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Submission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select
                value={formData.project_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client Type</Label>
              <Select
                value={formData.client_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, client_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project Duration</Label>
              <Select
                value={formData.project_length}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_length: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_LENGTHS.map((length) => (
                    <SelectItem key={length.value} value={length.value}>
                      {length.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expertise Level</Label>
              <Select
                value={formData.expertise_level}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, expertise_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Your Role</Label>
              <Select
                value={formData.your_role || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, your_role: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {YOUR_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rate Representativeness</Label>
              <Select
                value={formData.rate_representativeness || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, rate_representativeness: value || null }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {RATE_REPRESENTATIVENESS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Standard Rate (optional)</Label>
              <Input
                type="number"
                value={formData.standard_rate ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    standard_rate: e.target.value === "" ? null : parseInt(e.target.value) || null,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Contracted As</Label>
              <Select
                value={formData.contracted_as || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, contracted_as: value || null }))
                }
              >
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
            </div>

            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select
                value={formData.rate_type || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, rate_type: value || null }))
                }
              >
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
            </div>

            <div className="space-y-2">
              <Label>Project Location</Label>
              <Select
                value={formData.project_location}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, project_location: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Client Origin <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Select
                value={formData.client_country || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, client_country: value || null }))
                }
              >
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
              <Label>Currency</Label>
              <Select
                value={formData.currency || "USD"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
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

            <div className="space-y-2">
              <Label>Year Completed</Label>
              <Input
                type="number"
                value={formData.year_completed}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    year_completed: parseInt(e.target.value) || new Date().getFullYear(),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Your Budget</Label>
              <Input
                type="number"
                value={formData.your_budget}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    your_budget: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Total Budget (optional)</Label>
              <Input
                type="number"
                value={formData.total_budget ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    total_budget: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Days of Work (optional)</Label>
              <Input
                type="number"
                min={1}
                value={formData.days_of_work ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    days_of_work: e.target.value === "" ? null : parseInt(e.target.value) || null,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2 p-3 border border-border rounded-md bg-secondary/20 max-h-32 overflow-y-auto">
              {formData.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => handleSkillToggle(skill)}
                >
                  {skill}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {SKILLS.filter((skill) => !formData.skills.includes(skill)).map(
                (skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => handleSkillToggle(skill)}
                  >
                    + {skill}
                  </Badge>
                )
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value || null,
                }))
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEditDialog;
