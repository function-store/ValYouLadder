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
import PrivacyConsentCheckbox from "@/components/gdpr/PrivacyConsentCheckbox";
import { triggerMailingListPopup } from "@/components/MailingListPopup";
import { useCurrency } from "@/contexts/CurrencyContext";
import PreProdBanner from "@/components/PreProdBanner";
import {
  DURATION_DAYS,
  MIN_SIMILARITY_THRESHOLD,
  ANNUAL_INFLATION,
  computeSkillIdf,
  weightedPercentile,
  computeESS,
  essToConfidence,
} from "@/lib/estimateAlgorithm";

interface DatabaseProject {
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
  currency: string;
  rate_type: string | null;
  your_role: string | null;
  days_of_work: number | null;
  year_completed: number;
  description: string | null;
}

const Estimate = () => {
  const { format: formatCurrencyFn } = useCurrency();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [clientType, setClientType] = useState("");
  const [projectLength, setProjectLength] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");
  const [yourRole, setYourRole] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
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
    dataConfidence?: "high" | "medium" | "low";
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  /**
   * Calculate similarity score between user input and a project.
   * Uses IDF-weighted skill overlap so rare skills matter more.
   * yourRole match added as a similarity signal.
   */
  const calculateSimilarityScore = (
    project: DatabaseProject,
    skillIdf: Map<string, number>
  ): number => {
    let score = 0;

    if (project.project_type === projectType) score += 20;
    if (project.client_type === clientType) score += 25;
    if (project.expertise_level === expertiseLevel) score += 15;
    if (project.project_length === projectLength) score += 10;
    if (project.your_role && yourRole && project.your_role === yourRole) score += 10;

    if (project.project_location === projectLocation) score += 10;
    if (project.client_country && clientCountry && project.client_country === clientCountry) score += 5;

    // IDF-weighted skill overlap — rare skills carry more signal
    if (selectedSkills.length > 0) {
      const projectSkills = new Set(project.skills);
      let matchingIdfSum = 0;
      let totalIdfSum = 0;

      for (const skill of selectedSkills) {
        const idf = skillIdf.get(skill) || 0;
        totalIdfSum += idf;
        if (projectSkills.has(skill)) {
          matchingIdfSum += idf;
        }
      }

      const skillScore =
        totalIdfSum > 0
          ? matchingIdfSum / totalIdfSum
          : projectSkills.size > 0
          ? selectedSkills.filter((s) => projectSkills.has(s)).length /
            selectedSkills.length
          : 0;

      score += skillScore * 30;
    }

    // Recency bonus — tapering +8/+5/+2
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - project.year_completed;
    if (yearsAgo === 0) score += 8;
    else if (yearsAgo === 1) score += 5;
    else if (yearsAgo === 2) score += 2;

    return score;
  };

  /**
   * Fetch candidate projects, score, filter by threshold, and return ranked matches.
   */
  const fetchSimilarProjects = async (): Promise<{
    projects: SimilarProject[];
    weights: number[];
  }> => {
    const { data, error } = await supabase
      .from("project_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching projects:", error);
      return { projects: [], weights: [] };
    }

    if (!data || data.length === 0) {
      return { projects: [], weights: [] };
    }

    const skillIdf = computeSkillIdf(data as DatabaseProject[]);

    const scoredProjects = (data as DatabaseProject[]).map((project) => ({
      project,
      score: calculateSimilarityScore(project, skillIdf),
    }));

    const qualifiedProjects = scoredProjects.filter(
      (sp) => sp.score >= MIN_SIMILARITY_THRESHOLD
    );

    qualifiedProjects.sort((a, b) => b.score - a.score);

    const topMatches = qualifiedProjects.slice(0, 50);

    const projects = topMatches.map(({ project, score }) => ({
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
      clientCountry: project.client_country || undefined,
      currency: project.currency,
      yourRole: project.your_role || undefined,
      daysOfWork: project.days_of_work ?? undefined,
      similarityScore: score,
      effectiveRate: computeEffectiveRate(project),
    }));

    const weights = topMatches.map(({ score }) => score);

    return { projects, weights };
  };

  /**
   * Normalize budget to a daily effective rate so projects of different lengths are comparable.
   */
  const computeEffectiveRate = (project: DatabaseProject): number => {
    const durationDays = DURATION_DAYS[project.project_length] || 15;
    return project.your_budget / durationDays;
  };

  /**
   * Calculate estimate from real project data using similarity-weighted percentiles.
   */
  const calculateFromRealData = (
    projects: SimilarProject[],
    weights: number[]
  ): {
    low: number;
    mid: number;
    high: number;
    dataConfidence: "high" | "medium" | "low";
  } | null => {
    if (projects.length === 0) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    const userDurationDays = DURATION_DAYS[projectLength] || 15;

    const weightedItems = projects.map((p, i) => {
      const durationDays = DURATION_DAYS[p.projectLength] || 15;
      const dailyRate = p.budget / durationDays;
      const yearsOld = currentYear - p.yearCompleted;
      const adjustedRate = dailyRate * Math.pow(1 + ANNUAL_INFLATION, yearsOld);
      return { value: adjustedRate, weight: weights[i] };
    });

    const low = weightedPercentile(weightedItems, 0.25);
    const mid = weightedPercentile(weightedItems, 0.5);
    const high = weightedPercentile(weightedItems, 0.75);

    const scaledLow = low * userDurationDays;
    const scaledMid = mid * userDurationDays;
    const scaledHigh = high * userDurationDays;

    const ess = computeESS(weights);
    const dataConfidence = essToConfidence(ess);

    return {
      low: Math.round(scaledLow),
      mid: Math.round(scaledMid),
      high: Math.round(scaledHigh),
      dataConfidence,
    };
  };

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
        your_role: yourRole || null,
        low_estimate: estimates.low,
        mid_estimate: estimates.mid,
        high_estimate: estimates.high,
        used_ai: usedAi,
        sample_size: sampleSize,
      });
    } catch (error) {
      console.error("Failed to save estimate:", error);
    }
  };

  const calculateEstimate = async () => {
    setIsCalculating(true);
    setAiInsights(null);

    try {
      const { projects: similarProjects, weights } =
        await fetchSimilarProjects();
      const sampleSize = similarProjects.length;

      if (useAI) {
        try {
          const { data, error } = await supabase.functions.invoke(
            "estimate-rate",
            {
              body: {
                projectDetails: {
                  projectType,
                  clientType,
                  projectLength,
                  expertiseLevel,
                  yourRole,
                  projectLocation,
                  clientCountry,
                  skills: selectedSkills,
                  description: description || undefined,
                },
                similarProjects,
              },
            }
          );

          if (error) throw error;

          if (data.error) {
            throw new Error(data.error);
          }

          const estimates = {
            low: data.low,
            mid: data.mid,
            high: data.high,
          };

          const ess = computeESS(weights);
          const dataConfidence = essToConfidence(ess);

          setEstimate({
            ...estimates,
            sampleSize,
            similarProjects,
            dataConfidence,
          });

          setAiInsights({
            reasoning: data.reasoning,
            confidenceLevel: data.confidenceLevel,
            keyFactors: data.keyFactors,
          });

          await saveEstimateToDatabase(estimates, sampleSize, true);

          toast.success("AI analysis complete!");
        } catch (error) {
          console.error("AI estimation error:", error);

          const result = calculateFromRealData(similarProjects, weights);
          if (!result) {
            toast.error(
              "Not enough community data to generate an estimate. Try broadening your criteria."
            );
            setIsCalculating(false);
            return;
          }

          toast.error("AI estimation failed, using data-based calculation");
          setEstimate({
            low: result.low,
            mid: result.mid,
            high: result.high,
            sampleSize,
            similarProjects,
            dataConfidence: result.dataConfidence,
          });
          await saveEstimateToDatabase(result, sampleSize, false);
        }
      } else {
        const result = calculateFromRealData(similarProjects, weights);

        if (!result) {
          toast.info(
            "Not enough community data to generate an estimate. Try broadening your criteria or submit your own project to help grow the database."
          );
          setIsCalculating(false);
          return;
        }

        setEstimate({
          low: result.low,
          mid: result.mid,
          high: result.high,
          sampleSize,
          similarProjects,
          dataConfidence: result.dataConfidence,
        });

        if (result.dataConfidence === "low") {
          toast.warning(
            "Very few comparable projects found. This estimate has high uncertainty."
          );
        }

        await saveEstimateToDatabase(result, sampleSize, false);
      }
    } catch (error) {
      console.error("Estimation error:", error);
      toast.error("Failed to calculate estimate. Please try again.");
    }

    setIsCalculating(false);
    setTimeout(triggerMailingListPopup, 2000);
  };

  const formatCurrency = (amount: number, currency?: string) => formatCurrencyFn(amount, currency);

  const canCalculate =
    projectType &&
    clientType &&
    projectLength &&
    expertiseLevel &&
    selectedSkills.length > 0 &&
    privacyConsent;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <PreProdBanner message="Estimates are based on mock data only. Results do not reflect real market rates." />

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
                yourRole={yourRole}
                setYourRole={setYourRole}
                clientCountry={clientCountry}
                setClientCountry={setClientCountry}
                projectLocation={projectLocation}
                setProjectLocation={setProjectLocation}
                selectedSkills={selectedSkills}
                toggleSkill={toggleSkill}
                description={description}
                setDescription={setDescription}
              />

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

              <PrivacyConsentCheckbox
                checked={privacyConsent}
                onCheckedChange={setPrivacyConsent}
                id="estimate-privacy-consent"
              />

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
