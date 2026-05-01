import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Target, Users, TrendingUp, Shield, Heart, Mail, ArrowRight } from "lucide-react";
import NewsletterSignup from "@/components/NewsletterSignup";

import { IS_PRE_PROD } from "@/lib/config";

const SUBMISSIONS_OPEN = !IS_PRE_PROD;

const About = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-16 w-16 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-6">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Our Mission</h1>
            <p className="text-xl text-muted-foreground">
              Empowering freelancers and contractors with transparent market data
            </p>
          </div>

          {/* Mission Statement */}
          <section className="node-card rounded-xl p-8 border border-border mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">Fair Pay Through Transparency</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                We believe that <span className="text-foreground font-medium">knowledge is power</span>. 
                Too often, freelancers and contractors enter negotiations without understanding their 
                true market value. This information asymmetry leads to underpricing, burnout, and 
                unsustainable careers.
              </p>
              <p>
                Our platform exists to change that. By crowdsourcing anonymous rate data from real
                projects, we want to build a transparent picture of what the market actually pays—not
                what clients claim they can afford, or what outdated salary surveys suggest.
              </p>
              <p>
                <span className="text-foreground font-medium">Fair pay isn't just about money.</span> It's
                about valuing expertise, respecting time, and building an industry where talented
                professionals can thrive without racing to the bottom.
              </p>
              <p className="text-sm border-l-2 border-primary/40 pl-4 italic">
                <span className="text-foreground font-medium">Where we are today:</span> we're early.
                The database is still small, and estimates will tighten as real projects accumulate —
                every submission pulls the picture closer to reality.
              </p>
            </div>
          </section>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="node-card rounded-xl p-6 border border-border text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Community-Driven</h3>
              <p className="text-sm text-muted-foreground">
                Built to be filled by real professionals sharing project rates anonymously, one
                submission at a time.
              </p>
            </div>

            <div className="node-card rounded-xl p-6 border border-border text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Data-Backed</h3>
              <p className="text-sm text-muted-foreground">
                Every estimate is based on aggregated market data, not guesswork or averages.
              </p>
            </div>

            <div className="node-card rounded-xl p-6 border border-border text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Privacy-First</h3>
              <p className="text-sm text-muted-foreground">
                All submissions are anonymous. We never collect or expose personal information.
              </p>
            </div>
          </div>

          {/* Creator */}
          <section className="node-card rounded-xl p-8 border border-border mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xl">
                🍌
              </div>
              <h2 className="text-2xl font-semibold">Meet the Creator</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-foreground font-medium">Dan Molnar</span> aka {" "}
                  <a href="https://functionstore.xyz/link-in-bio" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:text-primary/80 transition-colors">Function Store</a> is a Berlin-based artist working with sound, light, and real-time technology to craft immersive installations and live visuals. His work ranges from small experimental spaces and audiovisual performances to arena productions, blending technical precision with both musical and visual intuition.
                </p>
                <p>
                  He is a co-founder of{" "}
                  <a href="https://www.derealstudio.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:text-primary/80 transition-colors">DEREAL Studio</a> and an active educator who develops and shares tools for the creative-tech community.
                </p>
                <p>
                  ValYouLadder grew out of a real frustration: the creative-tech industry has no shared language around rates. This tool is Dan's attempt to change that — built for the community, by the community.
                </p>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="node-card rounded-xl p-8 border border-primary/40 bg-primary/5 mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Support the Project</h2>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed mb-6">
              <p>
                ValYouLadder is a community project run by{" "}
                <a href="https://functionstore.xyz/link-in-bio" target="_blank" rel="noopener noreferrer" className="text-foreground font-medium hover:text-primary transition-colors">Function Store</a>. Keeping the
                website up, the database running, and new features coming takes real money and time.
              </p>
              <p>
                If this tool has helped you negotiate a better rate or understand your market value,
                consider becoming a supporter on Patreon — and get access to extra goodies along the way.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://patreon.com/function_store"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-mono font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Heart className="h-4 w-4" />
                Support on Patreon
              </a>
              <a
                href="mailto:dan@functionstore.xyz"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground font-mono font-semibold text-sm hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                Send Feedback
              </a>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="node-card rounded-xl p-8 border border-border mb-8">
            <h2 className="text-2xl font-semibold mb-6">Disclaimer</h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                ValYouLadder is a community-driven platform. All rate data is submitted anonymously
                by individuals and is not independently verified. The figures shown on this site —
                including database entries, statistical estimates, and AI-generated suggestions —
                are for informational purposes only and should not be taken as professional advice.
              </p>
              <p>
                Rates vary significantly based on scope, location, client relationship, experience,
                and many other factors that cannot be fully captured in a database. Use this tool as
                one data point among many when evaluating your market position.
              </p>
              <p>
                ValYouLadder, its creator, and contributors are not liable for any decisions made
                based on the data or estimates provided. This platform is offered "as is" without
                warranty of any kind. By using this site, you acknowledge that rate information is
                crowd-sourced, unverified, and may not reflect current market conditions.
              </p>
            </div>
          </section>

          {/* Call to Action */}
          <section className="node-card rounded-xl p-8 border border-border bg-secondary/20 text-center">
            <h2 className="text-xl font-semibold mb-3">Join the Movement</h2>
            <p className="text-muted-foreground mb-4">
              Help build a more transparent industry by contributing your project data.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Every submission strengthens the database and helps fellow professionals negotiate fair rates.
            </p>

            {SUBMISSIONS_OPEN ? (
              <Link to="/submit">
                <Button variant="glow" className="gap-2 group mb-8">
                  Submit a Project
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            ) : (
              <div className="mb-8">
                <Button disabled className="gap-2 opacity-50 cursor-not-allowed">
                  Submit a Project
                </Button>
                <p className="text-xs text-muted-foreground mt-2 font-mono">Submissions opening soon</p>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <p className="text-sm text-muted-foreground mb-4">Get notified when submissions open</p>
              <NewsletterSignup />
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default About;
