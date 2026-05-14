import { Link } from "react-router-dom";
import { Heart, Mail, Github } from "lucide-react";
import NewsletterSignup from "@/components/NewsletterSignup";
import BrandName from "@/components/BrandName";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">Stay in the loop</p>
          <NewsletterSignup compact />
        </div>
        <p className="text-xs text-muted-foreground text-center mb-4">
          All data is community-submitted and unverified. Estimates are for informational purposes only, not professional advice.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} <BrandName /> by{" "}
            <a
              href="https://patreon.com/function_store"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              Function Store
            </a>
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://patreon.com/function_store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Heart className="h-3.5 w-3.5" />
              Support on Patreon
            </a>
            <a
              href="mailto:dan@functionstore.xyz"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              Feedback
            </a>
            <a
              href="https://github.com/function-store/ValYouLadder"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              Open Source
            </a>
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/40 text-center mt-4 font-mono">
          build {new Date(__BUILD_TIME__).toISOString().slice(0, 16).replace("T", " ")} UTC
        </p>
      </div>
    </footer>

  );
};

export default Footer;
