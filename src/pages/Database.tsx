import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, Filter, DollarSign } from "lucide-react";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  ProjectSubmission,
} from "@/lib/projectTypes";

// Mock data for demonstration
const MOCK_DATA: ProjectSubmission[] = [
  {
    id: "1",
    projectType: "commission",
    clientType: "global-brand",
    projectLength: "medium",
    clientCountry: "United States",
    projectLocation: "United States",
    skills: ["TouchDesigner", "LED Mapping", "Projection Mapping"],
    expertiseLevel: "senior",
    totalBudget: 150000,
    yourBudget: 35000,
    teamSize: 4,
    yearCompleted: 2024,
    description: "Large-scale brand activation with interactive LED installation",
  },
  {
    id: "2",
    projectType: "collaboration",
    clientType: "festival",
    projectLength: "short",
    clientCountry: "Germany",
    projectLocation: "Germany",
    skills: ["VJing", "Resolume", "Audio Reactive"],
    expertiseLevel: "mid",
    totalBudget: 15000,
    yourBudget: 4500,
    teamSize: 2,
    yearCompleted: 2024,
    description: "Festival stage visuals for electronic music event",
  },
  {
    id: "3",
    projectType: "technical",
    clientType: "institution",
    projectLength: "installation-perm",
    clientCountry: "United Kingdom",
    projectLocation: "United Kingdom",
    skills: ["TouchDesigner", "Interactive Installation", "Kinect / Depth Sensors"],
    expertiseLevel: "expert",
    totalBudget: 280000,
    yourBudget: 75000,
    teamSize: 3,
    yearCompleted: 2023,
    description: "Interactive museum piece with motion tracking",
  },
  {
    id: "4",
    projectType: "commission",
    clientType: "musician",
    projectLength: "tour",
    clientCountry: "United States",
    projectLocation: "United States",
    skills: ["Notch", "Unreal Engine", "Live Performance"],
    expertiseLevel: "senior",
    totalBudget: 200000,
    yourBudget: 45000,
    teamSize: 2,
    yearCompleted: 2024,
    description: "Tour visuals for major artist, 30 dates",
  },
  {
    id: "5",
    projectType: "workshop",
    clientType: "institution",
    projectLength: "one-off",
    clientCountry: "Netherlands",
    projectLocation: "Netherlands",
    skills: ["TouchDesigner", "Generative Art"],
    expertiseLevel: "expert",
    totalBudget: 3000,
    yourBudget: 2500,
    teamSize: 1,
    yearCompleted: 2024,
    description: "Two-day intensive TouchDesigner workshop",
  },
];

const Database = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProjectType, setFilterProjectType] = useState<string>("all");
  const [filterClientType, setFilterClientType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"yourBudget" | "totalBudget" | "yearCompleted">("yourBudget");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredData = useMemo(() => {
    let data = [...MOCK_DATA];

    // Apply filters
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

    // Apply sorting
    data.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === "asc") return (aVal as number) - (bVal as number);
      return (bVal as number) - (aVal as number);
    });

    return data;
  }, [searchTerm, filterProjectType, filterClientType, sortBy, sortOrder]);

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
          <div className="mb-4 text-sm text-muted-foreground font-mono">
            {filteredData.length} project{filteredData.length !== 1 ? "s" : ""} found
          </div>

          {/* Project Cards */}
          <div className="grid gap-4">
            {filteredData.map((project) => (
              <div key={project.id} className="node-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors">
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
                      <span className="text-sm text-muted-foreground ml-auto">{project.yearCompleted}</span>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {project.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground font-mono"
                        >
                          {skill}
                        </span>
                      ))}
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

          {filteredData.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No projects match your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Database;
