import { Shield, Search, Lightbulb, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "100% Anonymous",
    description: "No client names, no personal details. Share your rates without compromising relationships.",
  },
  {
    icon: Search,
    title: "Searchable Database",
    description: "Filter by project type, client category, skills, budget range, and more.",
  },
  {
    icon: Lightbulb,
    title: "AI-Powered Estimates",
    description: "Get intelligent rate suggestions based on community data and your project specifics.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Built by creatives, for creatives. Help others by sharing your experience.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it <span className="text-primary">works</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A transparent system designed to help the creative tech community understand market rates.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="node-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-mono font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
