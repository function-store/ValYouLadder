import { TrendingUp, Users, Calendar, Sparkles, Brain, Lightbulb, ShieldCheck } from "lucide-react";
import SimilarProjectsList, { SimilarProject } from "./SimilarProjectsList";
import { Badge } from "@/components/ui/badge";

interface EstimateResultsProps {
  estimate: {
    low: number;
    mid: number;
    high: number;
    sampleSize: number;
    similarProjects: SimilarProject[];
    dataConfidence?: "high" | "medium" | "low";
  } | null;
  formatCurrency: (amount: number, currency?: string) => string;
  aiInsights?: {
    reasoning: string;
    confidenceLevel: string;
    keyFactors: string[];
  } | null;
}

const EstimateResults = ({ estimate, formatCurrency, aiInsights }: EstimateResultsProps) => {
  if (!estimate) {
    return (
      <div className="node-card rounded-xl p-12 border border-border text-center">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-mono font-semibold mb-2">Ready to Estimate</h3>
        <p className="text-sm text-muted-foreground">
          Fill in your project details and click "Get AI Estimate" to receive a
          rate suggestion based on community data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="node-card rounded-xl p-6 border border-primary/30 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="h-5 w-5" />
            <h2 className="font-mono font-semibold text-lg">
              Estimated Rate Range
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">approx. USD baseline</span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Low</div>
            <div className="text-xl font-mono font-bold">
              {formatCurrency(estimate.low, "USD")}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-primary">Suggested</div>
            <div className="text-3xl font-mono font-bold text-primary glow-text">
              {formatCurrency(estimate.mid, "USD")}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">High</div>
            <div className="text-xl font-mono font-bold">
              {formatCurrency(estimate.high, "USD")}
            </div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-muted via-primary to-muted"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <div className="node-card rounded-xl p-6 border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="h-5 w-5" />
              <h3 className="font-mono font-semibold">AI Analysis</h3>
            </div>
            <Badge
              variant={
                aiInsights.confidenceLevel === "high"
                  ? "default"
                  : aiInsights.confidenceLevel === "medium"
                  ? "secondary"
                  : "outline"
              }
              className="font-mono text-xs"
            >
              {aiInsights.confidenceLevel} confidence
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {aiInsights.reasoning}
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span>Key Factors</span>
            </div>
            <ul className="space-y-1">
              {aiInsights.keyFactors.map((factor, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary mt-1">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="node-card rounded-xl p-6 border border-border space-y-4">
        <h3 className="font-mono font-semibold">Analysis Based On</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>{estimate.sampleSize} similar projects</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Community data</span>
          </div>
        </div>

        {/* Data confidence indicator based on effective sample size */}
        {estimate.dataConfidence && (
          <div className="flex items-center gap-2 pt-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Data confidence:</span>
            <Badge
              variant={
                estimate.dataConfidence === "high"
                  ? "default"
                  : estimate.dataConfidence === "medium"
                  ? "secondary"
                  : "outline"
              }
              className="font-mono text-xs"
            >
              {estimate.dataConfidence}
            </Badge>
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <SimilarProjectsList
            projects={estimate.similarProjects}
            formatCurrency={formatCurrency}
          />
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          This estimate is based on unverified, crowd-sourced data and is for
          informational purposes only — not professional advice. Actual rates vary
          significantly. ValYouLadder is not liable for decisions based on these figures.
        </p>
      </div>
    </div>
  );
};

export default EstimateResults;
