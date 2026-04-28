import Layout from "@/components/layout/Layout";
import { Target, Users, TrendingUp, Shield } from "lucide-react";

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
                projects, we create a transparent picture of what the market actually pays—not what 
                clients claim they can afford, or what outdated salary surveys suggest.
              </p>
              <p>
                <span className="text-foreground font-medium">Fair pay isn't just about money.</span> It's 
                about valuing expertise, respecting time, and building an industry where talented 
                professionals can thrive without racing to the bottom.
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
                Our data comes from real professionals sharing real project rates anonymously.
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
                  <span className="text-primary font-medium">Function Store</span> is a Berlin-based artist working with sound, light, and real-time technology to craft immersive installations and live visuals. His work ranges from small experimental spaces and audiovisual performances to arena productions, blending technical precision with both musical and visual intuition.
                </p>
                <p>
                  He is a co-founder of{" "}
                  <span className="text-primary font-medium">DEREAL Studio</span> and an active educator who develops and shares tools for the creative-tech community.
                </p>
                <p>
                  rate_ref grew out of a real frustration: the creative-tech industry has no shared language around rates. This tool is Dan's attempt to change that — built for the community, by the community.
                </p>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="node-card rounded-xl p-8 border border-primary/30 bg-primary/5 text-center">
            <h2 className="text-xl font-semibold mb-3">Join the Movement</h2>
            <p className="text-muted-foreground mb-4">
              Help build a more transparent industry by contributing your project data.
            </p>
            <p className="text-sm text-muted-foreground">
              Every submission strengthens the database and helps fellow professionals negotiate fair rates.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default About;
