import { Link } from "react-router-dom";
import { Heart, Mail } from "lucide-react";
import NewsletterSignup from "@/components/NewsletterSignup";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">Stay in the loop</p>
          <NewsletterSignup compact />
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ValYouLadder by{" "}
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
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>

  );
};

export default Footer;
