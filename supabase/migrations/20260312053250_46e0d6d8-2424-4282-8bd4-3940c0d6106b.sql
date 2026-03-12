
-- 1. Create assignment_questions table for teachers to add questions
CREATE TABLE public.assignment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view questions
CREATE POLICY "Anyone authed can view assignment questions"
  ON public.assignment_questions FOR SELECT TO authenticated
  USING (true);

-- Teachers/admins can manage questions
CREATE POLICY "Teachers can insert assignment questions"
  ON public.assignment_questions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) OR is_admin(auth.uid()));

CREATE POLICY "Teachers can update assignment questions"
  ON public.assignment_questions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'instructor'::app_role) OR is_admin(auth.uid()));

CREATE POLICY "Teachers can delete assignment questions"
  ON public.assignment_questions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'instructor'::app_role) OR is_admin(auth.uid()));

-- 2. Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', true);

-- Storage policies for assignment files
CREATE POLICY "Authenticated users can upload assignment files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assignment-files');

CREATE POLICY "Anyone can view assignment files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assignment-files');

CREATE POLICY "Users can delete own assignment files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assignment-files' AND (storage.foldername(name))[1] = auth.uid()::text);
