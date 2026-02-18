
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student', 'parent');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'Beginner' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  duration_minutes INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress NUMERIC DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- Lesson progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  time_spent_seconds INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'subjective')),
  options JSONB, -- for MCQ: [{text, is_correct}]
  correct_answer TEXT,
  points INT DEFAULT 1,
  sort_order INT DEFAULT 0
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC,
  max_score NUMERIC,
  answers JSONB, -- [{question_id, answer, is_correct}]
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Discussion posts
CREATE TABLE public.discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- User points / gamification
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent-child links
CREATE TABLE public.parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- ==========================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id AND course_id = _course_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of(_parent_id UUID, _child_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_child_links
    WHERE parent_id = _parent_id AND child_id = _child_id
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- USER ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
-- Allow new users to set their initial role
CREATE POLICY "Users can set initial role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- COURSES
CREATE POLICY "Anyone authed can view published courses" ON public.courses FOR SELECT TO authenticated USING (is_published = true OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Instructors/admins can create courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));
CREATE POLICY "Course owner/admin can update" ON public.courses FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Course owner/admin can delete" ON public.courses FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- MODULES
CREATE POLICY "Anyone authed can view modules" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instructors/admins can create modules" ON public.modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));
CREATE POLICY "Module creator/admin can update" ON public.modules FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND created_by = auth.uid()));
CREATE POLICY "Module creator/admin can delete" ON public.modules FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND created_by = auth.uid()));

-- LESSONS
CREATE POLICY "Anyone authed can view lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instructors/admins can create lessons" ON public.lessons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));
CREATE POLICY "Lesson creator/admin can update" ON public.lessons FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND c.created_by = auth.uid()));
CREATE POLICY "Lesson creator/admin can delete" ON public.lessons FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND c.created_by = auth.uid()));

-- ENROLLMENTS
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Students can enroll" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins can delete enrollments" ON public.enrollments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- LESSON PROGRESS
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Users can insert own progress" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- QUIZZES
CREATE POLICY "Anyone authed can view quizzes" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instructors/admins can create quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));
CREATE POLICY "Quiz creator/admin can update" ON public.quizzes FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Quiz creator/admin can delete" ON public.quizzes FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- QUIZ QUESTIONS
CREATE POLICY "Anyone authed can view quiz questions" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instructors/admins can manage quiz questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));
CREATE POLICY "Quiz question creator/admin can update" ON public.quiz_questions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));
CREATE POLICY "Quiz question creator/admin can delete" ON public.quiz_questions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND created_by = auth.uid()));

-- QUIZ ATTEMPTS
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Students can create attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Students can update own attempts" ON public.quiz_attempts FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- DISCUSSION POSTS
CREATE POLICY "Anyone authed can view discussions" ON public.discussion_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed users can post" ON public.discussion_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Post owner/admin can update" ON public.discussion_posts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Post owner/admin can delete" ON public.discussion_posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ANNOUNCEMENTS
CREATE POLICY "Anyone authed can view announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instructors/admins can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));
CREATE POLICY "Announcement owner/admin can update" ON public.announcements FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Announcement owner/admin can delete" ON public.announcements FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- BADGES
CREATE POLICY "Anyone authed can view badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update badges" ON public.badges FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- USER BADGES
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Instructors/admins can award badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'instructor') OR public.is_admin(auth.uid()));

-- USER POINTS
CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "System can insert points" ON public.user_points FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "System can update points" ON public.user_points FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- PARENT CHILD LINKS
CREATE POLICY "Parents can view own links" ON public.parent_child_links FOR SELECT TO authenticated USING (parent_id = auth.uid() OR child_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Parents can create links" ON public.parent_child_links FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND public.has_role(auth.uid(), 'parent'));
CREATE POLICY "Admins can manage links" ON public.parent_child_links FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
