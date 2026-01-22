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
} from "@/lib/projectTypes";

interface EstimateFormProps {
  projectType: string;
  setProjectType: (value: string) => void;
  clientType: string;
  setClientType: (value: string) => void;
  projectLength: string;
  setProjectLength: (value: string) => void;
  expertiseLevel: string;
  setExpertiseLevel: (value: string) => void;
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
              <Label>Client Country</Label>
              <Select value={clientCountry} onValueChange={setClientCountry}>
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
              <Label>Project Location</Label>
              <Select value={projectLocation} onValueChange={setProjectLocation}>
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

          <div className="space-y-2">
            <Label>Project Length</Label>
            <Select value={projectLength} onValueChange={setProjectLength}>
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
          </div>

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

      {/* Optional Description for AI */}
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
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default EstimateForm;
