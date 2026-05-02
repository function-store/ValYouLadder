import { useState, useEffect } from "react";
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
import { useCurrency, fetchRates, FALLBACK_RATES, SELECTABLE_CURRENCIES } from "@/contexts/CurrencyContext";
import PreProdBanner from "@/components/PreProdBanner";
import { IS_ESTIMATES_OPEN } from "@/lib/config";
import {
  DURATION_DAYS,
  MIN_SIMILARITY_THRESHOLD,
  ANNUAL_INFLATION,
  computeSkillIdf,
  weightedPercentile,
  computeESS,
  confidenceFromMetrics,
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
  contracted_as: string | null;
  rate_representativeness: string | null;
  standard_rate: number | null;
  days_of_work: number | null;
  year_completed: number;
  description: string | null;
}

const ESTIMATES_OPEN = IS_ESTIMATES_OPEN;
const AI_COOLDOWN_KEY = "vyl_ai_estimate_ts";
const AI_COOLDOWN_SECONDS = IS_ESTIMATES_OPEN ? 60 : 0;
const VYL_SESSION_KEY = "vyl_session_id";

/**
 * Per-browser session id, used as a secondary key on the AI rate limit
 * counter so a single browser can't bypass the per-IP limit by rotating
 * forwarded-for headers.
 */
function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(VYL_SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VYL_SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

let warnedUnknownCurrency = false;

/**
 * Supabase functions.invoke wraps non-2xx responses in a FunctionsHttpError
 * that carries `context.status`. Centralised so we don't sprinkle `as any`
 * casts at every call-site.
 */
function functionStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const ctx = (error as { context?: { status?: number } }).context;
  return ctx && typeof ctx.status === "number" ? ctx.status : undefined;
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
  const [aiCooldownRemaining, setAiCooldownRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const last = parseInt(localStorage.getItem(AI_COOLDOWN_KEY) ?? "0", 10);
      const elapsed = Math.floor((Date.now() - last) / 1000);
      setAiCooldownRemaining(Math.max(0, AI_COOLDOWN_SECONDS - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

    // Economic context: client_country is the primary rate signal (who's paying sets the budget ceiling),
    // falling back to project_location for local market work.
    const submissionEconomicContext = project.client_country ?? project.project_location;
    const queryEconomicContext = clientCountry || projectLocation;
    if (submissionEconomicContext === queryEconomicContext) score += 12;
    else if (project.project_location === projectLocation) score += 5;

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
    rates: Record<string, number>;
  }> => {
    const [{ data, error }, rates] = await Promise.all([
      supabase
        .from("project_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      fetchRates().catch(() => FALLBACK_RATES),
    ]);

    if (error) {
      console.error("Error fetching projects:", error);
      return { projects: [], weights: [], rates };
    }

    if (!data || data.length === 0) {
      return { projects: [], weights: [], rates };
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
      budget: resolvedBudget(project),
      yearCompleted: project.year_completed,
      description: project.description || undefined,
      clientCountry: project.client_country || undefined,
      currency: project.currency,
      yourRole: project.your_role || undefined,
      contractedAs: project.contracted_as || undefined,
      rateRepresentativeness: project.rate_representativeness || undefined,
      daysOfWork: project.days_of_work ?? undefined,
      similarityScore: score,
      effectiveRate: computeEffectiveRate(project),
    }));

    const weights = topMatches.map(({ score, project }) =>
      score * representativenessWeight(project)
    );

    return { projects, weights, rates };
  };

  /**
   * Returns the budget signal to use for estimation.
   * Prefers standard_rate when provided (explicitly reported market rate),
   * otherwise falls back to your_budget.
   */
  const resolvedBudget = (project: DatabaseProject): number =>
    project.standard_rate ?? project.your_budget;

  /**
   * Weight multiplier based on how representative the rate is.
   * If standard_rate is provided it's already a clean market signal → full weight.
   * Otherwise penalize below/above market entries.
   */
  const representativenessWeight = (project: DatabaseProject): number => {
    if (project.standard_rate != null) return 1.0;
    if (project.rate_representativeness === "below_market") return 0.5;
    if (project.rate_representativeness === "above_market") return 0.85;
    return 1.0;
  };

  /**
   * Normalize budget to a daily effective rate so projects of different lengths are comparable.
   */
  const computeEffectiveRate = (project: DatabaseProject): number => {
    const durationDays = DURATION_DAYS[project.project_length] || 15;
    return resolvedBudget(project) / durationDays;
  };

  /**
   * Calculate estimate from real project data using similarity-weighted percentiles.
   */
  const calculateFromRealData = (
    projects: SimilarProject[],
    weights: number[],
    rates: Record<string, number>
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

    const weightedItems = projects
      .map((p, i) => {
        const currency = p.currency ?? "USD";

        // Skip rows with unknown currencies — silently treating them as USD
        // (previous behavior) skews percentiles whenever a row carries a
        // currency we can't convert.
        if (!SELECTABLE_CURRENCIES.includes(currency) || !(currency in rates)) {
          if (!warnedUnknownCurrency) {
            warnedUnknownCurrency = true;
            console.warn(
              "Estimate: skipping projects with unknown / unconverted currency. First seen:",
              currency
            );
          }
          return null;
        }

        const fromRate = rates[currency];
        if (!fromRate || fromRate <= 0) {
          return null;
        }

        // Reject zero/negative budgets — they don't carry useful signal and
        // negative budgets combined with non-integer year deltas could
        // otherwise produce NaN through Math.pow.
        if (!(p.budget > 0)) {
          return null;
        }

        const durationDays = DURATION_DAYS[p.projectLength] || 15;
        const budgetUSD = p.budget / fromRate;
        const dailyRate = budgetUSD / durationDays;

        if (!(dailyRate > 0) || !Number.isFinite(dailyRate)) {
          return null;
        }

        const yearsOld = currentYear - p.yearCompleted;
        const adjustedRate = dailyRate * Math.pow(1 + ANNUAL_INFLATION, yearsOld);

        if (!Number.isFinite(adjustedRate)) {
          return null;
        }

        return { value: adjustedRate, weight: weights[i] };
      })
      .filter((item): item is { value: number; weight: number } => item !== null);

    if (weightedItems.length === 0) {
      return null;
    }

    const low = weightedPercentile(weightedItems, 0.25);
    const mid = weightedPercentile(weightedItems, 0.5);
    const high = weightedPercentile(weightedItems, 0.75);

    const scaledLow = low * userDurationDays;
    const scaledMid = mid * userDurationDays;
    const scaledHigh = high * userDurationDays;

    const ess = computeESS(weights);
    // Top match score gates confidence so niche queries with weak matches
    // don't report "high" purely on ESS magnitude. Projects are sorted by
    // score descending in fetchSimilarProjects, so projects[0] is the best match.
    const topScore = projects[0]?.similarityScore ?? 0;
    const dataConfidence = confidenceFromMetrics(ess, topScore);

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
      const { projects: similarProjects, weights, rates } =
        await fetchSimilarProjects();
      const sampleSize = similarProjects.length;

      if (useAI) {
        if (aiCooldownRemaining > 0) {
          toast.error(`Please wait ${aiCooldownRemaining}s before requesting another AI estimate.`);
          setIsCalculating(false);
          return;
        }

        try {
          const statResult = calculateFromRealData(similarProjects, weights, rates);

          const { data, error } = await supabase.functions.invoke(
            "estimate-rate",
            {
              headers: {
                "x-vyl-session": getOrCreateSessionId(),
              },
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
                statisticalEstimate: statResult
                  ? { low: statResult.low, mid: statResult.mid, high: statResult.high }
                  : undefined,
              },
            }
          );

          // 502 / AI_INVALID_SHAPE — fall back to the statistical estimate
          // rather than surfacing a hard failure to the user.
          if (data?.code === "AI_INVALID_SHAPE" || functionStatus(error) === 502) {
            if (statResult) {
              toast.warning(
                "AI returned an unexpected shape — showing the data-based estimate instead."
              );
              setEstimate({
                low: statResult.low,
                mid: statResult.mid,
                high: statResult.high,
                sampleSize,
                similarProjects,
                dataConfidence: statResult.dataConfidence,
              });
              await saveEstimateToDatabase(statResult, sampleSize, false);
              setIsCalculating(false);
              return;
            }
            throw new Error("AI returned an unexpected shape and no fallback estimate was available.");
          }

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
          const topScore = similarProjects[0]?.similarityScore ?? 0;
          const dataConfidence = confidenceFromMetrics(ess, topScore);

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

          localStorage.setItem(AI_COOLDOWN_KEY, Date.now().toString());
          toast.success("AI analysis complete!");
        } catch (error) {
          console.error("AI estimation error:", error);

          if (functionStatus(error) === 429) {
            toast.error("You've used your 5 AI estimates for this hour. Try again later, or use the data-only estimate.");
            setIsCalculating(false);
            return;
          }

          const result = calculateFromRealData(similarProjects, weights, rates);
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
        const result = calculateFromRealData(similarProjects, weights, rates);

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
          {!IS_ESTIMATES_OPEN && <PreProdBanner message="Estimates are based on mock data only. Results do not reflect real market rates." />}

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
                disabled={!ESTIMATES_OPEN || !canCalculate || isCalculating || (useAI && aiCooldownRemaining > 0)}
              >
                {useAI ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Calculator className="h-5 w-5" />
                )}
                {!ESTIMATES_OPEN
                  ? "Estimates not open yet"
                  : isCalculating
                  ? useAI
                    ? "AI Analyzing..."
                    : "Calculating..."
                  : useAI && aiCooldownRemaining > 0
                  ? `Wait ${aiCooldownRemaining}s`
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
