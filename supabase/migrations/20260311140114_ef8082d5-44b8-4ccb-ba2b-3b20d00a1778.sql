
-- Add FK from enrollments.user_id to profiles.user_id (different name since enrollments_user_id_fkey exists)
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from marks.student_id to profiles.user_id
ALTER TABLE public.marks ADD CONSTRAINT marks_student_id_profiles_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from attendance.student_id to profiles.user_id
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_profiles_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from assignment_submissions.student_id to profiles.user_id
ALTER TABLE public.assignment_submissions ADD CONSTRAINT assignment_submissions_student_id_profiles_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
