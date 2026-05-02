import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import NewsletterSignup from "@/components/NewsletterSignup";

const CTASection = () => {
  return (
    <section className="py-24 border-t border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get a rate estimate for your next project
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Describe your project and get a rate range built from real community data — matched by type, skills, expertise, and location. Optionally layer in AI for contextual reasoning on top.
          </p>

          <Link to="/estimate">
            <Button variant="glow" size="xl" className="gap-2 group">
              Get Estimate
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Want updates when new data and features land?</p>
            <NewsletterSignup />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
