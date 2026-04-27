import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
} from "@/lib/projectTypes";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Briefcase,
  Award,
} from "lucide-react";

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
  description?: string;
  teamSize?: number;
  clientCountry?: string;
  /** Similarity score used for ranking and weighted percentile calculation */
  similarityScore?: number;
  /** Budget normalized to a daily effective rate */
  effectiveRate?: number;
}

interface SimilarProjectsListProps {
  projects: SimilarProject[];
  formatCurrency: (amount: number) => string;
}

const getLabel = (
  value: string,
  options: readonly { value: string; label: string }[]
): string => {
  const option = options.find((opt) => opt.value === value);
  return option ? option.label : value;
};

const SimilarProjectsList = ({ projects, formatCurrency }: SimilarProjectsListProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<SimilarProject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleProjectClick = (project: SimilarProject) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };

  return (
    <>
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
            <button
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="w-full text-left p-4 rounded-lg bg-secondary/50 border border-border space-y-3 hover:border-primary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {getLabel(project.projectType, PROJECT_TYPES)}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {getLabel(project.clientType, CLIENT_TYPES)}
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
                    {getLabel(project.expertiseLevel, EXPERTISE_LEVELS)}
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
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Project Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Project Details
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Budget */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                  <span className="text-sm text-muted-foreground">Project Budget</span>
                </div>
                <span className="text-2xl font-mono font-bold text-primary">
                  {formatCurrency(selectedProject.budget)}
                </span>
              </div>

              {/* Project Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Project Type
                  </label>
                  <p className="font-medium">
                    {getLabel(selectedProject.projectType, PROJECT_TYPES)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Client Type
                  </label>
                  <p className="font-medium">
                    {getLabel(selectedProject.clientType, CLIENT_TYPES)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Project Length
                  </label>
                  <p className="font-medium">
                    {getLabel(selectedProject.projectLength, PROJECT_LENGTHS)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Expertise Level
                  </label>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {getLabel(selectedProject.expertiseLevel, EXPERTISE_LEVELS)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Year */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{selectedProject.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{selectedProject.yearCompleted}</span>
                </div>
                {selectedProject.teamSize && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{selectedProject.teamSize} team members</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Skills Used
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="font-mono">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description if available */}
              {selectedProject.description && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Description
                  </label>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedProject.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimilarProjectsList;
