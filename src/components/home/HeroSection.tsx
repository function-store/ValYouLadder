import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, FileText } from "lucide-react";
import PreProdBanner from "@/components/PreProdBanner";

const HeroSection = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <PreProdBanner message="This is a preview of ValYouLadder. Data shown on this site is for demonstration purposes only and does not reflect real submissions." />
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
            A community database of project rates for VJs, TouchDesigner artists, and interactive installation creators.
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
          <div className="animate-slide-up mt-4" style={{ animationDelay: "0.4s" }}>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
              Read our mission
            </Link>
          </div>
        </div>

        {/* Honest "where we are today" line — no fabricated stats */}
        <div className="mt-16 max-w-2xl mx-auto text-center animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <p className="text-sm text-muted-foreground font-mono">
            30 starter examples to bootstrap the database — be one of the first real submissions.
          </p>
          <Link to="/submit" className="inline-block mt-3 text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline">
            Add your project →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
