import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = questions.map((q: any, i: number) =>
      `Question ${i + 1} (${q.points} points): ${q.question_text}\nExpected Answer: ${q.correct_answer}\nStudent's Answer: ${q.student_answer}`
    ).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an exam grader. Grade each student answer by comparing it to the expected answer. Be fair but strict. For each question, return the score out of maximum points. Consider partial credit for partially correct answers.`
          },
          {
            role: "user",
            content: `Grade these answers and return results:\n\n${prompt}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_grades",
            description: "Submit grading results for exam questions",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_index: { type: "number" },
                      score: { type: "number" },
                      feedback: { type: "string" }
                    },
                    required: ["question_index", "score", "feedback"],
                    additionalProperties: false
                  }
                }
              },
              required: ["results"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "submit_grades" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      // Fallback: give 0 for all
      return new Response(JSON.stringify({ results: questions.map((_: any, i: number) => ({ question_index: i, score: 0, feedback: "AI grading unavailable" })) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      // Cap scores to max points
      const capped = parsed.results.map((r: any, i: number) => ({
        ...r,
        score: Math.min(Math.max(r.score, 0), questions[i]?.points || 0),
      }));
      return new Response(JSON.stringify({ results: capped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    return new Response(JSON.stringify({ results: questions.map((_: any, i: number) => ({ question_index: i, score: 0, feedback: "Could not parse AI response" })) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-grade-exam error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
