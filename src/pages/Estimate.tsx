import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Sparkles, Calculator } from "lucide-react";
import { SKILLS, COUNTRIES } from "@/lib/projectTypes";
import EstimateForm from "@/components/estimate/EstimateForm";
import EstimateResults from "@/components/estimate/EstimateResults";
import { SimilarProject } from "@/components/estimate/SimilarProjectsList";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIEstimateResponse {
  low: number;
  mid: number;
  high: number;
  reasoning: string;
  confidenceLevel: "low" | "medium" | "high";
  keyFactors: string[];
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

  const generateSimilarProjects = (
    count: number,
    baseRate: number,
    skills: string[]
  ): SimilarProject[] => {
    const clientTypes = [
      "global-brand",
      "big-brand",
      "small-brand",
      "institution",
      "festival",
      "musician",
      "agency",
    ];
    const projectTypes = [
      "commission",
      "collaboration",
      "technical",
      "consultation",
    ];
    const expertiseLevels = ["junior", "mid", "senior", "expert"];
    const locations = COUNTRIES.filter((c) => c !== "Other").slice(0, 10);

    return Array.from({ length: count }, (_, i) => ({
      id: `project-${i + 1}`,
      projectType: projectTypes[Math.floor(Math.random() * projectTypes.length)],
      clientType: clientTypes[Math.floor(Math.random() * clientTypes.length)],
      projectLength: projectLength || "medium",
      location: locations[Math.floor(Math.random() * locations.length)],
      skills: skills
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 2),
      expertiseLevel:
        expertiseLevels[Math.floor(Math.random() * expertiseLevels.length)],
      budget: Math.round(baseRate * (0.5 + Math.random() * 1.5)),
      yearCompleted: Math.random() > 0.5 ? 2024 : 2023,
    }));
  };

  const calculateBaseEstimate = () => {
    // Mock calculation based on inputs
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

    // Location-based adjustments
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

    return Math.round(
      baseRate *
        lengthMultiplier *
        expertiseMultiplier *
        skillsMultiplier *
        locationMultiplier
    );
  };

  const calculateEstimate = async () => {
    setIsCalculating(true);
    setAiInsights(null);

    const sampleSize = Math.floor(Math.random() * 30) + 10;
    const baseEstimate = calculateBaseEstimate();
    const similarProjects = generateSimilarProjects(
      sampleSize,
      baseEstimate,
      selectedSkills.length > 0 ? selectedSkills : SKILLS.slice(0, 5)
    );

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

        setEstimate({
          low: data.low,
          mid: data.mid,
          high: data.high,
          sampleSize,
          similarProjects,
        });

        setAiInsights({
          reasoning: data.reasoning,
          confidenceLevel: data.confidenceLevel,
          keyFactors: data.keyFactors,
        });

        toast.success("AI analysis complete!");
      } catch (error) {
        console.error("AI estimation error:", error);
        toast.error("AI estimation failed, using formula-based calculation");
        
        // Fallback to formula-based
        setEstimate({
          low: Math.round(baseEstimate * 0.7),
          mid: baseEstimate,
          high: Math.round(baseEstimate * 1.4),
          sampleSize,
          similarProjects,
        });
      }
    } else {
      // Formula-based estimation
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setEstimate({
        low: Math.round(baseEstimate * 0.7),
        mid: baseEstimate,
        high: Math.round(baseEstimate * 1.4),
        sampleSize,
        similarProjects,
      });
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
