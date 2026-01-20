import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, TrendingUp, Users, Calendar } from "lucide-react";
import {
  PROJECT_TYPES,
  CLIENT_TYPES,
  PROJECT_LENGTHS,
  EXPERTISE_LEVELS,
  SKILLS,
} from "@/lib/projectTypes";

const Estimate = () => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [clientType, setClientType] = useState("");
  const [projectLength, setProjectLength] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");
  const [estimate, setEstimate] = useState<{
    low: number;
    mid: number;
    high: number;
    sampleSize: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const calculateEstimate = async () => {
    setIsCalculating(true);
    
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock calculation based on inputs
    const baseRate = {
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

    const lengthMultiplier = {
      "one-off": 0.3,
      short: 0.5,
      medium: 1,
      long: 2,
      performance: 0.4,
      tour: 3,
      "installation-temp": 0.8,
      "installation-perm": 2.5,
    }[projectLength] || 1;

    const expertiseMultiplier = {
      junior: 0.6,
      mid: 1,
      senior: 1.5,
      expert: 2.2,
    }[expertiseLevel] || 1;

    const skillsMultiplier = 1 + (selectedSkills.length * 0.05);

    const midEstimate = Math.round(baseRate * lengthMultiplier * expertiseMultiplier * skillsMultiplier);

    setEstimate({
      low: Math.round(midEstimate * 0.7),
      mid: midEstimate,
      high: Math.round(midEstimate * 1.4),
      sampleSize: Math.floor(Math.random() * 30) + 10,
    });
    
    setIsCalculating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const canCalculate = projectType && clientType && projectLength && expertiseLevel && selectedSkills.length > 0;

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
              Input your project details and our AI will analyze the community database to suggest a competitive rate.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="space-y-6">
              <div className="node-card rounded-xl p-6 border border-border space-y-6">
                <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Project Details</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type of Project</Label>
                    <Select value={projectType} onValueChange={setProjectType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Type of Client</Label>
                    <Select value={clientType} onValueChange={setClientType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Project Length</Label>
                    <Select value={projectLength} onValueChange={setProjectLength}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_LENGTHS.map((length) => (
                          <SelectItem key={length.value} value={length.value}>
                            {length.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Your Expertise Level</Label>
                    <Select value={expertiseLevel} onValueChange={setExpertiseLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERTISE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="node-card rounded-xl p-6 border border-border space-y-4">
                <h2 className="font-mono font-semibold text-lg border-b border-border pb-3">Skills Required</h2>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-md text-sm font-mono transition-all ${
                        selectedSkills.includes(skill)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="glow"
                size="xl"
                className="w-full gap-2"
                onClick={calculateEstimate}
                disabled={!canCalculate || isCalculating}
              >
                <Sparkles className="h-5 w-5" />
                {isCalculating ? "Analyzing..." : "Get AI Estimate"}
              </Button>
            </div>

            {/* Results */}
            <div className="space-y-6">
              {estimate ? (
                <>
                  <div className="node-card rounded-xl p-6 border border-primary/30 space-y-6">
                    <div className="flex items-center gap-2 text-primary">
                      <TrendingUp className="h-5 w-5" />
                      <h2 className="font-mono font-semibold text-lg">Estimated Rate Range</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Low</div>
                        <div className="text-xl font-mono font-bold">{formatCurrency(estimate.low)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-primary">Suggested</div>
                        <div className="text-3xl font-mono font-bold text-primary glow-text">{formatCurrency(estimate.mid)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">High</div>
                        <div className="text-xl font-mono font-bold">{formatCurrency(estimate.high)}</div>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-muted via-primary to-muted"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <div className="node-card rounded-xl p-6 border border-border space-y-4">
                    <h3 className="font-mono font-semibold">Analysis Based On</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{estimate.sampleSize} similar projects</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>2023-2024 data</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                      This estimate is based on anonymized community data and should be used as a starting point. 
                      Actual rates may vary based on specific project requirements, client relationship, and market conditions.
                    </p>
                  </div>
                </>
              ) : (
                <div className="node-card rounded-xl p-12 border border-border text-center">
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-mono font-semibold mb-2">Ready to Estimate</h3>
                  <p className="text-sm text-muted-foreground">
                    Fill in your project details and click "Get AI Estimate" to receive a rate suggestion based on community data.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Estimate;
