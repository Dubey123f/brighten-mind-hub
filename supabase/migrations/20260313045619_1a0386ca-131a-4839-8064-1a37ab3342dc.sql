
-- Add unique constraint so teacher can update marks for same exam/student/course
ALTER TABLE public.marks ADD CONSTRAINT marks_course_student_exam_unique UNIQUE (course_id, student_id, exam_name);
