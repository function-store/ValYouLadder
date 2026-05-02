import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, MapPin, Calendar, UserCheck, Briefcase } from "lucide-react";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  YOUR_ROLES,
  RATE_TYPES,
  CONTRACTED_AS,
  ProjectSubmission,
} from "@/lib/projectTypes";
import { triggerMailingListPopup } from "@/components/MailingListPopup";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ProjectDetailDialogProps {
  project: ProjectSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getLabel = (value: string, options: readonly { value: string; label: string }[]) => {
  return options.find((o) => o.value === value)?.label || value;
};

const ProjectDetailDialog = ({ project, open, onOpenChange }: ProjectDetailDialogProps) => {
  const triggered = useRef(false);
  const { format: formatCurrency } = useCurrency();

  useEffect(() => {
    if (open && !triggered.current) {
      triggered.current = true;
      const timer = setTimeout(triggerMailingListPopup, 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            Project Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Budget Highlight */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <div className="text-2xl font-mono font-bold text-primary">
                  {formatCurrency(project.yourBudget, project.currency)}
                </div>
                <div className="text-xs text-muted-foreground">Your fee</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono text-muted-foreground">
                {formatCurrency(project.totalBudget, project.currency)}
              </div>
              <div className="text-xs text-muted-foreground">Total budget</div>
            </div>
          </div>

          {/* Project Type */}
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Project Classification
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono">
                {getLabel(project.projectType, PROJECT_TYPES)}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {getLabel(project.clientType, CLIENT_TYPES)}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {getLabel(project.projectLength, PROJECT_LENGTHS)}
              </Badge>
              {project.contractedAs && (
                <Badge variant="outline" className="font-mono">
                  {getLabel(project.contractedAs, CONTRACTED_AS)}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase">
                <MapPin className="h-3 w-3" />
                Client Region
              </div>
              <div className="font-medium">{project.clientCountry}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase">
                <MapPin className="h-3 w-3" />
                Project Location
              </div>
              <div className="font-medium">{project.projectLocation}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase">
                <Calendar className="h-3 w-3" />
                Year Completed
              </div>
              <div className="font-medium">{project.yearCompleted}</div>
            </div>
            {project.yourRole && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase">
                  <UserCheck className="h-3 w-3" />
                  Your Role
                </div>
                <div className="font-medium">
                  {getLabel(project.yourRole, YOUR_ROLES)}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Expertise */}
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Expertise Level
            </h3>
            <div className="font-medium">
              {getLabel(project.expertiseLevel, EXPERTISE_LEVELS)}
            </div>
          </div>

          <Separator />

          {/* Skills */}
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Skills & Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-md text-sm bg-secondary text-secondary-foreground font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  Additional Context
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.description}
                </p>
              </div>
            </>
          )}

          {/* Budget Breakdown */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Budget Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {project.rateType && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-muted-foreground text-xs font-mono mb-1">Rate Type</div>
                  <div className="font-mono font-bold">
                    {getLabel(project.rateType, RATE_TYPES)}
                  </div>
                </div>
              )}
              {project.daysOfWork && project.daysOfWork > 0 && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-muted-foreground text-xs font-mono mb-1">Implied Day Rate</div>
                  <div className="font-mono font-bold">
                    {project.currency} {Math.round(project.yourBudget / project.daysOfWork).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-xs">{project.daysOfWork} day{project.daysOfWork !== 1 ? "s" : ""} worked</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailDialog;
