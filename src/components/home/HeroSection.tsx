import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, FileText } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-glow-secondary/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-slide-up">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-mono text-muted-foreground">Anonymous • Community-driven • Open</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Know your worth in
            <span className="gradient-text block mt-2">visual arts & tech</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            A community database of real project rates for VJs, TouchDesigner artists, and interactive installation creators. 
            Submit anonymously, reference transparently.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/submit">
              <Button variant="glow" size="xl" className="gap-2 group">
                <FileText className="h-5 w-5" />
                Submit a Project
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/database">
              <Button variant="outline" size="xl" className="gap-2">
                <Database className="h-5 w-5" />
                Browse Database
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "0.4s" }}>
          {[
            { label: "Projects", value: "500+" },
            { label: "Contributors", value: "120+" },
            { label: "Countries", value: "35+" },
            { label: "Avg Rate", value: "$4.2k" },
          ].map((stat) => (
            <div key={stat.label} className="node-card rounded-lg p-4 text-center border border-border">
              <div className="text-2xl md:text-3xl font-mono font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
