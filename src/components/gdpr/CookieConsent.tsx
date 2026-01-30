import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_CONSENT_KEY = "cookie-consent-accepted";

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay showing banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential-only");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl p-4 md:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">We value your privacy</h3>
              <p className="text-sm text-muted-foreground">
                We use essential cookies to ensure our website functions properly. 
                By clicking "Accept", you consent to our use of cookies for analytics and 
                personalization.{" "}
                <Link 
                  to="/privacy" 
                  className="text-primary hover:underline"
                >
                  Read our Privacy Policy
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={declineCookies}
            >
              Essential Only
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={acceptCookies}
            >
              Accept All
            </Button>
          </div>
        </div>
        <button
          onClick={declineCookies}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary transition-colors md:hidden"
          aria-label="Close cookie banner"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
