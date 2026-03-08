
-- Attendance table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid NOT NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  max_marks numeric NOT NULL DEFAULT 100,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Assignment submissions table
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  content text,
  file_url text,
  marks_obtained numeric,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  graded_by uuid,
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Marks/Grades table for exams
CREATE TABLE public.marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  exam_name text NOT NULL,
  max_marks numeric NOT NULL DEFAULT 100,
  marks_obtained numeric NOT NULL DEFAULT 0,
  remarks text,
  entered_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "Teachers/admins can insert attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Teachers/admins can update attendance" ON public.attendance
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Users can view relevant attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()) OR is_parent_of(auth.uid(), student_id));

CREATE POLICY "Admins can delete attendance" ON public.attendance
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- RLS Policies for assignments
CREATE POLICY "Teachers/admins can create assignments" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Teachers/admins can update assignments" ON public.assignments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Anyone authed can view assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Creator/admin can delete assignments" ON public.assignments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can submit assignments" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own submissions" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Users can view relevant submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

-- RLS Policies for marks
CREATE POLICY "Teachers/admins can insert marks" ON public.marks
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Teachers/admins can update marks" ON public.marks
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()));

CREATE POLICY "Users can view relevant marks" ON public.marks
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR has_role(auth.uid(), 'instructor') OR is_admin(auth.uid()) OR is_parent_of(auth.uid(), student_id));

CREATE POLICY "Admins can delete marks" ON public.marks
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));
