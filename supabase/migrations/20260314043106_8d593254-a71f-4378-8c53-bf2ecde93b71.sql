
-- Online Exams System Tables

-- 1. online_exams table
CREATE TABLE public.online_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'mid_sem',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  ai_proctoring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.online_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view active exams" ON public.online_exams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers/admins can create exams" ON public.online_exams
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Creator/admin can update exams" ON public.online_exams
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Creator/admin can delete exams" ON public.online_exams
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- 2. exam_questions table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.online_exams(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  options JSONB,
  correct_answer TEXT,
  points NUMERIC NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view exam questions" ON public.exam_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers/admins can insert exam questions" ON public.exam_questions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Teachers/admins can update exam questions" ON public.exam_questions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Teachers/admins can delete exam questions" ON public.exam_questions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

-- 3. exam_attempts table
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.online_exams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB,
  score NUMERIC,
  max_score NUMERIC,
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  ai_flags JSONB DEFAULT '[]'::jsonb,
  tab_switches INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam attempts" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'instructor') OR is_parent_of(auth.uid(), user_id));

CREATE POLICY "Students can create exam attempts" ON public.exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attempts" ON public.exam_attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'instructor'));
