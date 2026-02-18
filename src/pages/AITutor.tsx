import { Brain, Send, Loader2 } from "lucide-react";
import { useState } from "react";

export default function AITutor() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hello! I'm your AI tutor. Ask me anything about your courses, concepts you're struggling with, or study strategies. I'm here to help! 🎓" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Simulate AI response (in real implementation, this would call an edge function)
    setTimeout(() => {
      const responses = [
        "Great question! Let me break this down for you. The key concept here is to understand the fundamentals first, then build on top of that knowledge progressively.",
        "I'd recommend reviewing the module on this topic first. Based on your quiz scores, you might benefit from focusing on the practical examples before attempting the theoretical portions.",
        "That's an interesting approach! Here's how I would think about it: start with the basic principles, then apply them to solve more complex problems step by step.",
        "Based on your learning pattern, I suggest trying spaced repetition for this topic. Review it today, then again in 2 days, then in a week. This helps with long-term retention!",
      ];
      setMessages(prev => [...prev, { role: "ai", content: responses[Math.floor(Math.random() * responses.length)] }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">AI Tutor</h1>
        <p className="text-muted-foreground text-sm">Your personal learning assistant</p>
      </div>

      <div className="flex-1 bg-card rounded-2xl shadow-card flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "ai" ? "gradient-primary" : "bg-muted"}`}>
                {m.role === "ai" ? <Brain className="w-4 h-4 text-primary-foreground" /> : <span className="text-xs font-bold text-muted-foreground">You</span>}
              </div>
              <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.role === "ai" ? "bg-muted text-foreground rounded-tl-sm" : "gradient-primary text-primary-foreground rounded-tr-sm"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted p-3 rounded-2xl rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask your AI tutor anything..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none"
            />
            <button onClick={handleSend} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
