import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, Filter, DollarSign, Eye, Loader2 } from "lucide-react";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  ProjectSubmission,
} from "@/lib/projectTypes";
import ProjectDetailDialog from "@/components/database/ProjectDetailDialog";
import { sanitizeDescription } from "@/lib/sanitizeSubmission";
import { supabase } from "@/integrations/supabase/client";

const Database = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProjectType, setFilterProjectType] = useState<string>("all");
  const [filterClientType, setFilterClientType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"yourBudget" | "totalBudget" | "yearCompleted">("yourBudget");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProject, setSelectedProject] = useState<ProjectSubmission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const allData: ProjectSubmission[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("project_submissions")
          .select("*")
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error("Error fetching projects:", error);
          break;
        }

        if (data && data.length > 0) {
          allData.push(
            ...data.map((row) => ({
              id: row.id,
              projectType: row.project_type,
              clientType: row.client_type,
              projectLength: row.project_length,
              clientCountry: row.client_country,
              projectLocation: row.project_location,
              skills: row.skills || [],
              expertiseLevel: row.expertise_level,
              totalBudget: row.total_budget,
              yourBudget: row.your_budget,
              teamSize: row.team_size,
              yearCompleted: row.year_completed,
              description: row.description ?? undefined,
            }))
          );
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setProjects(allData);
      setLoading(false);
    };

    fetchProjects();
  }, []);

  const handleViewProject = (project: ProjectSubmission) => {
    const sanitizedProject = {
      ...project,
      description: sanitizeDescription(project.description),
    };
    setSelectedProject(sanitizedProject);
    setDialogOpen(true);
  };

  const filteredData = useMemo(() => {
    let data = [...projects];

    if (filterProjectType !== "all") {
      data = data.filter((p) => p.projectType === filterProjectType);
    }
    if (filterClientType !== "all") {
      data = data.filter((p) => p.clientType === filterClientType);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (p) =>
          p.skills.some((s) => s.toLowerCase().includes(term)) ||
          p.description?.toLowerCase().includes(term) ||
          p.clientCountry.toLowerCase().includes(term)
      );
    }

    data.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === "asc") return (aVal as number) - (bVal as number);
      return (bVal as number) - (aVal as number);
    });

    return data;
  }, [projects, searchTerm, filterProjectType, filterClientType, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLabel = (value: string, options: readonly { value: string; label: string }[]) => {
    return options.find((o) => o.value === value)?.label || value;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Project <span className="text-primary">Database</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Browse anonymized project data from the creative tech community. Filter by type, client, or search by skills.
            </p>
          </div>

          {/* Filters */}
          <div className="node-card rounded-xl p-4 border border-border mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by skills, description, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={filterProjectType} onValueChange={setFilterProjectType}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Project Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterClientType} onValueChange={setFilterClientType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Client Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {CLIENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[140px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yourBudget">Your Fee</SelectItem>
                    <SelectItem value="totalBudget">Total Budget</SelectItem>
                    <SelectItem value="yearCompleted">Year</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Results count */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <>
          <div className="mb-4 text-sm text-muted-foreground font-mono">
            {filteredData.length} project{filteredData.length !== 1 ? "s" : ""} found
          </div>

          {/* Project Cards */}
          <div className="grid gap-4">
            {filteredData.map((project) => (
              <div 
                key={project.id} 
                className="node-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => handleViewProject(project)}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Left side - Budget highlight */}
                  <div className="flex lg:flex-col items-center gap-4 lg:gap-2 lg:min-w-[120px] lg:text-center">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-mono font-bold text-primary">{formatCurrency(project.yourBudget)}</div>
                      <div className="text-xs text-muted-foreground">Your fee</div>
                    </div>
                  </div>

                  {/* Right side - Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {getLabel(project.projectType, PROJECT_TYPES)}
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        {getLabel(project.clientType, CLIENT_TYPES)}
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        {getLabel(project.projectLength, PROJECT_LENGTHS)}
                      </Badge>
                      <span className="text-sm text-muted-foreground ml-auto flex items-center gap-2">
                        {project.yearCompleted}
                        <Eye className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {sanitizeDescription(project.description)}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                      {project.skills.length > 4 && (
                        <span className="px-2 py-0.5 rounded text-xs text-muted-foreground font-mono">
                          +{project.skills.length - 4} more
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                      <span>Total budget: {formatCurrency(project.totalBudget)}</span>
                      <span>Team: {project.teamSize} {project.teamSize === 1 ? "person" : "people"}</span>
                      <span>Experience: {getLabel(project.expertiseLevel, EXPERTISE_LEVELS)}</span>
                      <span>Location: {project.projectLocation}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Project Detail Dialog */}
          <ProjectDetailDialog
            project={selectedProject}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />

          {filteredData.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No projects match your criteria.</p>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Database;
