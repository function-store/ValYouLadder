import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface SimilarProject {
  id: string;
  projectType: string;
  clientType: string;
  projectLength: string;
  location: string;
  skills: string[];
  expertiseLevel: string;
  budget: number;
  yearCompleted: number;
}

interface SimilarProjectsListProps {
  projects: SimilarProject[];
  formatCurrency: (amount: number) => string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  commission: "Commission",
  collaboration: "Collaboration",
  technical: "Technical",
  consultation: "Consultation",
  workshop: "Workshop",
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  "global-brand": "Global Brand",
  "big-brand": "Big Brand",
  "small-brand": "Small Brand",
  institution: "Institution",
  festival: "Festival",
  musician: "Musician",
  exhibition: "Exhibition",
  agency: "Agency",
  private: "Private",
  other: "Other",
};

const EXPERTISE_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  expert: "Expert",
};

const SimilarProjectsList = ({ projects, formatCurrency }: SimilarProjectsListProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
        >
          <span>View {projects.length} similar projects</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    {PROJECT_TYPE_LABELS[project.projectType] || project.projectType}
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {CLIENT_TYPE_LABELS[project.clientType] || project.clientType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {project.location} • {project.yearCompleted}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-primary">
                  {formatCurrency(project.budget)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {EXPERTISE_LABELS[project.expertiseLevel] || project.expertiseLevel}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {project.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 text-xs font-mono bg-background rounded border border-border"
                >
                  {skill}
                </span>
              ))}
              {project.skills.length > 4 && (
                <span className="px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  +{project.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SimilarProjectsList;
