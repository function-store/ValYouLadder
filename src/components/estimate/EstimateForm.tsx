import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  SKILLS,
  COUNTRIES,
  YOUR_ROLES,
} from "@/lib/projectTypes";
import SearchableCombobox from "@/components/ui/searchable-combobox";

interface EstimateFormProps {
  projectType: string;
  setProjectType: (value: string) => void;
  clientType: string;
  setClientType: (value: string) => void;
  projectLength: string;
  setProjectLength: (value: string) => void;
  expertiseLevel: string;
  setExpertiseLevel: (value: string) => void;
  yourRole: string;
  setYourRole: (value: string) => void;
  clientCountry: string;
  setClientCountry: (value: string) => void;
  projectLocation: string;
  setProjectLocation: (value: string) => void;
  selectedSkills: string[];
  toggleSkill: (skill: string) => void;
  description?: string;
  setDescription?: (value: string) => void;
}

const EstimateForm = ({
  projectType,
  setProjectType,
  clientType,
  setClientType,
  projectLength,
  setProjectLength,
  expertiseLevel,
  setExpertiseLevel,
  yourRole,
  setYourRole,
  clientCountry,
  setClientCountry,
  projectLocation,
  setProjectLocation,
  selectedSkills,
  toggleSkill,
  description,
  setDescription,
}: EstimateFormProps) => {
  return (
    <div className="space-y-6">
      <div className="node-card rounded-xl p-6 border border-border space-y-6">
        <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">
          Project Details
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type of Project</Label>
            <Select value={projectType} onValueChange={setProjectType}>
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
          </div>

          <div className="space-y-2">
            <Label>Type of Client</Label>
            <Select value={clientType} onValueChange={setClientType}>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project Location</Label>
              <SearchableCombobox
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                value={projectLocation}
                onChange={(v) => {
                  if (!clientCountry || clientCountry === projectLocation) {
                    setClientCountry(v);
                  }
                  setProjectLocation(v);
                }}
                placeholder="Where?"
                searchPlaceholder="Search country..."
              />
            </div>

            <div className="space-y-2">
              <Label>
                Client Origin{" "}
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <SearchableCombobox
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                value={clientCountry}
                onChange={setClientCountry}
                placeholder="Client country"
                searchPlaceholder="Search country..."
              />
              {clientCountry && clientCountry === projectLocation && (
                <p className="text-xs text-muted-foreground">Same as project location</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Project Duration</Label>
            <Select value={projectLength} onValueChange={setProjectLength}>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Expertise Level</Label>
              <Select value={expertiseLevel} onValueChange={setExpertiseLevel}>
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
              <Label>Your Role</Label>
              <Select value={yourRole} onValueChange={setYourRole}>
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
          </div>
        </div>
      </div>

      <div className="node-card rounded-xl p-6 border border-border space-y-4">
        <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">
          Skills Required
        </h2>
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
      </div>

      {setDescription && (
        <div className="node-card rounded-xl p-6 border border-border space-y-4">
          <div className="space-y-1">
            <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">
              Project Description{" "}
              <span className="text-muted-foreground font-normal text-sm">
                (Optional)
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Add details to help AI provide a more accurate estimate
            </p>
          </div>
          <Textarea
            placeholder="Describe your project scope, deliverables, complexity, timeline constraints, or any other relevant details..."
            value={description || ""}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            className="min-h-[100px] font-mono text-sm"
            maxLength={500}
          />
          <p className={`text-xs text-right ${(description?.length ?? 0) >= 450 ? "text-yellow-500" : "text-muted-foreground"}`}>
            {description?.length ?? 0} / 500
          </p>
        </div>
      )}
    </div>
  );
};

export default EstimateForm;
