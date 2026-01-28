import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Sparkles, Calculator } from "lucide-react";
import { SKILLS } from "@/lib/projectTypes";
import EstimateForm from "@/components/estimate/EstimateForm";
import EstimateResults from "@/components/estimate/EstimateResults";
import { SimilarProject } from "@/components/estimate/SimilarProjectsList";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DatabaseProject {
  id: string;
  project_type: string;
  client_type: string;
  project_length: string;
  client_country: string;
  project_location: string;
  skills: string[];
  expertise_level: string;
  total_budget: number;
  your_budget: number;
  team_size: number;
  year_completed: number;
  description: string | null;
}

const Estimate = () => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [clientType, setClientType] = useState("");
  const [projectLength, setProjectLength] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [description, setDescription] = useState("");
  const [aiInsights, setAiInsights] = useState<{
    reasoning: string;
    confidenceLevel: string;
    keyFactors: string[];
  } | null>(null);
  const [estimate, setEstimate] = useState<{
    low: number;
    mid: number;
    high: number;
    sampleSize: number;
    similarProjects: SimilarProject[];
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Calculate similarity score between user input and a project
  const calculateSimilarityScore = (project: DatabaseProject): number => {
    let score = 0;
    
    // Exact matches (higher weight)
    if (project.project_type === projectType) score += 20;
    if (project.client_type === clientType) score += 25;
    if (project.expertise_level === expertiseLevel) score += 15;
    if (project.project_length === projectLength) score += 10;
    
    // Location matches
    if (project.project_location === projectLocation) score += 10;
    if (project.client_country === clientCountry) score += 5;
    
    // Skills overlap (most important for similarity)
    const projectSkills = new Set(project.skills);
    const matchingSkills = selectedSkills.filter(s => projectSkills.has(s));
    const skillOverlapRatio = selectedSkills.length > 0 
      ? matchingSkills.length / selectedSkills.length 
      : 0;
    score += skillOverlapRatio * 30;
    
    // Recency bonus (prefer recent projects)
    const currentYear = new Date().getFullYear();
    if (project.year_completed === currentYear) score += 5;
    else if (project.year_completed === currentYear - 1) score += 3;
    
    return score;
  };

  // Fetch and rank similar projects from the database
  const fetchSimilarProjects = async (): Promise<SimilarProject[]> => {
    const { data, error } = await supabase
      .from("project_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching projects:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Score and sort projects by similarity
    const scoredProjects = data.map((project) => ({
      project,
      score: calculateSimilarityScore(project),
    }));

    scoredProjects.sort((a, b) => b.score - a.score);

    // Take top matches and convert to SimilarProject format
    return scoredProjects.slice(0, 20).map(({ project }) => ({
      id: project.id,
      projectType: project.project_type,
      clientType: project.client_type,
      projectLength: project.project_length,
      location: project.project_location,
      skills: project.skills,
      expertiseLevel: project.expertise_level,
      budget: project.your_budget,
      yearCompleted: project.year_completed,
      description: project.description || undefined,
      teamSize: project.team_size,
      clientCountry: project.client_country,
    }));
  };

  // Calculate estimate from real project data
  const calculateFromRealData = (projects: SimilarProject[]): { low: number; mid: number; high: number } => {
    if (projects.length === 0) {
      // Fallback to formula-based if no data
      return calculateFormulaEstimate();
    }

    // Weight budgets by similarity (top projects weighted more)
    const budgets = projects.map(p => p.budget);
    
    // Calculate weighted percentiles
    const sorted = [...budgets].sort((a, b) => a - b);
    const low = sorted[Math.floor(sorted.length * 0.25)] || sorted[0];
    const high = sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1];
    
    // Median as mid estimate
    const mid = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      low: Math.round(low),
      mid: Math.round(mid),
      high: Math.round(high),
    };
  };

  // Formula-based fallback
  const calculateFormulaEstimate = () => {
    const baseRate =
      {
        "global-brand": 25000,
        "big-brand": 15000,
        "small-brand": 5000,
        institution: 12000,
        festival: 4000,
        musician: 8000,
        exhibition: 10000,
        agency: 12000,
        private: 3000,
        other: 5000,
      }[clientType] || 5000;

    const lengthMultiplier =
      {
        "one-off": 0.3,
        short: 0.5,
        medium: 1,
        long: 2,
        performance: 0.4,
        tour: 3,
        "installation-temp": 0.8,
        "installation-perm": 2.5,
      }[projectLength] || 1;

    const expertiseMultiplier =
      {
        junior: 0.6,
        mid: 1,
        senior: 1.5,
        expert: 2.2,
      }[expertiseLevel] || 1;

    const skillsMultiplier = 1 + selectedSkills.length * 0.05;

    const highCostCountries = [
      "United States",
      "United Kingdom",
      "Switzerland",
      "Norway",
      "Denmark",
      "Sweden",
      "Australia",
    ];
    const locationMultiplier = highCostCountries.includes(projectLocation)
      ? 1.2
      : 1;

    const mid = Math.round(
      baseRate *
        lengthMultiplier *
        expertiseMultiplier *
        skillsMultiplier *
        locationMultiplier
    );

    return {
      low: Math.round(mid * 0.7),
      mid,
      high: Math.round(mid * 1.4),
    };
  };

  // Save estimate to database (anonymous tracking)
  const saveEstimateToDatabase = async (
    estimates: { low: number; mid: number; high: number },
    sampleSize: number,
    usedAi: boolean
  ) => {
    try {
      await supabase.from("estimate_submissions").insert({
        project_type: projectType,
        client_type: clientType,
        project_length: projectLength,
        client_country: clientCountry || null,
        project_location: projectLocation || null,
        skills: selectedSkills,
        expertise_level: expertiseLevel,
        low_estimate: estimates.low,
        mid_estimate: estimates.mid,
        high_estimate: estimates.high,
        used_ai: usedAi,
        sample_size: sampleSize,
      });
    } catch (error) {
      // Silent fail - we don't want to interrupt user experience
      console.error("Failed to save estimate:", error);
    }
  };

  const calculateEstimate = async () => {
    setIsCalculating(true);
    setAiInsights(null);

    try {
      // Fetch real similar projects from database
      const similarProjects = await fetchSimilarProjects();
      const sampleSize = similarProjects.length;

      if (useAI) {
        try {
          const { data, error } = await supabase.functions.invoke("estimate-rate", {
            body: {
              projectDetails: {
                projectType,
                clientType,
                projectLength,
                expertiseLevel,
                projectLocation,
                clientCountry,
                skills: selectedSkills,
                description: description || undefined,
              },
              similarProjects,
            },
          });

          if (error) throw error;

          if (data.error) {
            throw new Error(data.error);
          }

          const estimates = {
            low: data.low,
            mid: data.mid,
            high: data.high,
          };

          setEstimate({
            ...estimates,
            sampleSize,
            similarProjects,
          });

          setAiInsights({
            reasoning: data.reasoning,
            confidenceLevel: data.confidenceLevel,
            keyFactors: data.keyFactors,
          });

          // Save to database
          await saveEstimateToDatabase(estimates, sampleSize, true);

          toast.success("AI analysis complete!");
        } catch (error) {
          console.error("AI estimation error:", error);
          toast.error("AI estimation failed, using data-based calculation");
          
          // Fallback to data-based or formula
          const estimates = sampleSize > 0 
            ? calculateFromRealData(similarProjects)
            : calculateFormulaEstimate();
          
          setEstimate({
            ...estimates,
            sampleSize,
            similarProjects,
          });

          // Save fallback estimate
          await saveEstimateToDatabase(estimates, sampleSize, false);
        }
      } else {
        // Data-based or formula estimation
        const estimates = sampleSize > 0 
          ? calculateFromRealData(similarProjects)
          : calculateFormulaEstimate();

        // Show info if using formula fallback
        if (sampleSize === 0) {
          toast.info("No matching projects found. Using formula-based estimate.");
        }

        setEstimate({
          ...estimates,
          sampleSize,
          similarProjects,
        });

        // Save to database
        await saveEstimateToDatabase(estimates, sampleSize, false);
      }
    } catch (error) {
      console.error("Estimation error:", error);
      toast.error("Failed to calculate estimate");
      
      // Ultimate fallback
      const estimates = calculateFormulaEstimate();
      setEstimate({
        ...estimates,
        sampleSize: 0,
        similarProjects: [],
      });

      // Still save the fallback estimate
      await saveEstimateToDatabase(estimates, 0, false);
    }

    setIsCalculating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const canCalculate =
    projectType &&
    clientType &&
    projectLength &&
    expertiseLevel &&
    selectedSkills.length > 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono text-primary">AI-Powered</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Get a Rate <span className="text-primary">Estimate</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Input your project details and our AI will analyze the community
              database to suggest a competitive rate.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-6">
              <EstimateForm
                projectType={projectType}
                setProjectType={setProjectType}
                clientType={clientType}
                setClientType={setClientType}
                projectLength={projectLength}
                setProjectLength={setProjectLength}
                expertiseLevel={expertiseLevel}
                setExpertiseLevel={setExpertiseLevel}
                clientCountry={clientCountry}
                setClientCountry={setClientCountry}
                projectLocation={projectLocation}
                setProjectLocation={setProjectLocation}
                selectedSkills={selectedSkills}
                toggleSkill={toggleSkill}
                description={description}
                setDescription={setDescription}
              />

              {/* AI Toggle */}
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-secondary/50 border border-border">
                <Checkbox
                  id="use-ai"
                  checked={useAI}
                  onCheckedChange={(checked) => setUseAI(checked === true)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="use-ai"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    Use AI-Enhanced Estimation
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get smarter estimates with reasoning and key factors
                  </p>
                </div>
              </div>

              <Button
                variant="glow"
                size="xl"
                className="w-full gap-2"
                onClick={calculateEstimate}
                disabled={!canCalculate || isCalculating}
              >
                {useAI ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Calculator className="h-5 w-5" />
                )}
                {isCalculating
                  ? useAI
                    ? "AI Analyzing..."
                    : "Calculating..."
                  : useAI
                  ? "Get AI Estimate"
                  : "Calculate Estimate"}
              </Button>
            </div>

            {/* Results */}
            <EstimateResults
              estimate={estimate}
              formatCurrency={formatCurrency}
              aiInsights={aiInsights}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Estimate;
