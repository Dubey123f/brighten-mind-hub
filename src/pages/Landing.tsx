import { useNavigate, Link } from "react-router-dom";
import heroImage from "@/assets/hero-illustration.png";
import { BookOpen, Brain, BarChart3, Trophy, Users, Sparkles, ArrowRight, GraduationCap } from "lucide-react";

const features = [
  { icon: Brain, title: "AI-Powered Learning", desc: "Adaptive paths that evolve with each student's progress and mastery level." },
  { icon: BookOpen, title: "Rich Course Builder", desc: "Create engaging courses with video, PDFs, quizzes, and interactive content." },
  { icon: BarChart3, title: "Deep Analytics", desc: "Track engagement, identify at-risk students, and measure outcomes." },
  { icon: Trophy, title: "Gamification", desc: "Points, badges, streaks, and leaderboards to boost student motivation." },
  { icon: Users, title: "Collaboration", desc: "Discussion forums, peer review, and real-time announcements." },
  { icon: Sparkles, title: "Smart Assessments", desc: "Auto-graded quizzes, question banks, and randomized tests." },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">IntelliLearn</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="text-sm font-medium px-4 py-2 rounded-lg gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-[0.03]" />
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Education Platform
              </div>
              <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
                Learn Smarter,{" "}
                <span className="gradient-text">Not Harder</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                IntelliLearn adapts to every student's unique learning style with AI-driven course recommendations, real-time analytics, and gamified experiences.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate("/auth?tab=signup")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-glow"
                >
                  Start Learning Free <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/auth")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-semibold text-base hover:bg-muted transition-colors"
                >
                  Instructor? Sign In
                </button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> 10k+ Students</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> 500+ Courses</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> 98% Satisfaction</span>
              </div>
            </div>
            <div className="animate-fade-up relative" style={{ animationDelay: "0.2s" }}>
              <div className="relative rounded-2xl overflow-hidden shadow-glow">
                <img src={heroImage} alt="IntelliLearn AI Education Platform" className="w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to <span className="gradient-text">Teach & Learn</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete learning management system with AI-powered features that adapt to every learner.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300 group animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="gradient-primary rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Transform Education?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
                Join thousands of educators and students already using IntelliLearn to achieve better outcomes.
              </p>
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-card text-foreground font-semibold hover:bg-card/90 transition-colors"
              >
                Get Started for Free <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> IntelliLearn © 2026
          </span>
          <span>AI-Powered Education Platform</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
