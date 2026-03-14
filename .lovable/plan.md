

## Plan: Fix Parent-Child Linking + Admin Link Management + AI-Proctored Online Exam System

### Problem Analysis

1. **Parent-child linking issue**: The `link_parent_to_child` RPC function looks correct but the `enrollments` SELECT RLS policy doesn't allow parents to view their child's enrollments (only `user_id = auth.uid()`, admin, or instructor). Same issue with `quiz_attempts` and `lesson_progress` - parents can't read child data even after linking.

2. **Admin can't link parent-child**: Currently only parents can call `link_parent_to_child`. Need an admin version.

3. **Online exam/test platform with AI monitoring**: Need a proctored exam system separate from quizzes.

---

### Part 1: Fix Parent-Child Linking (RLS Issues)

**Database Migration** - Add parent visibility to RLS policies:

- **enrollments SELECT**: Add `OR is_parent_of(auth.uid(), user_id)` to the existing policy
- **quiz_attempts SELECT**: Add `OR is_parent_of(auth.uid(), user_id)`  
- **lesson_progress SELECT**: Already has this? Let me check... No, it only has `user_id = auth.uid() OR admin OR instructor`. Need to add parent access.

Update these 3 RLS policies so parents can view their linked child's data.

### Part 2: Admin Parent-Child Linking

**Database Migration** - Create `admin_link_parent_to_child(parent_email TEXT, child_email TEXT)` function:
- Security definer function that validates admin role
- Looks up both parent and child by email
- Validates parent has parent role, child has student role
- Creates the link

**AdminPanel.tsx** - Add a "Link Parent-Child" section:
- Two email inputs (parent email, child email)
- Link button that calls the new RPC
- Show existing parent-child links with unlink option

### Part 3: AI-Proctored Online Exam System

This is a large feature. Here's the approach:

**Database Migration** - New tables:
- `online_exams` - id, title, description, course_id, exam_type (mid_sem/end_sem), duration_minutes, max_marks, start_time, end_time, created_by, is_active, ai_proctoring (bool)
- `exam_questions` - id, exam_id, question_text, question_type (mcq/short/long), options (jsonb), correct_answer, points, sort_order
- `exam_attempts` - id, exam_id, user_id, started_at, completed_at, answers (jsonb), score, max_score, ai_flags (jsonb for proctoring alerts), is_submitted
- RLS policies for all tables

**New Pages:**
- `src/pages/OnlineExams.tsx` - List exams, create exam (teacher), start exam (student)
- `src/pages/ExamPlayer.tsx` - Timed exam player with:
  - Tab-switch detection (counts tab changes, warns student)
  - Fullscreen enforcement
  - Copy-paste disabled
  - Auto-submit on time expiry
  - AI proctoring flags stored in exam_attempts

**Auto Marks Upload:**
- On exam submission, auto-grade MCQ questions
- Auto-insert into `marks` table with exam_name = "mid_sem" or "end_sem"
- Short/long answer questions flagged for manual grading

**Edge Function** - `ai-grade-exam`:
- Uses Lovable AI to grade short/long answer questions
- Compares student answers with correct answers
- Returns scores per question

**Routes** - Add to App.tsx:
- `/dashboard/online-exams`
- `/dashboard/online-exams/:examId`

**Navigation** - Add "Online Exams" to sidebar nav in DashboardLayout.tsx

---

### Summary of Changes

| Area | Files |
|------|-------|
| RLS Fix | 1 migration (update 3 policies) |
| Admin Link | 1 migration (new function) + AdminPanel.tsx |
| Exam Tables | 1 migration (3 tables + RLS) |
| Exam UI | OnlineExams.tsx, ExamPlayer.tsx (new) |
| AI Grading | Edge function `ai-grade-exam` |
| Auto Marks | Logic in ExamPlayer submit flow |
| Routing | App.tsx, DashboardLayout.tsx |

Total: ~7 files changed/created, 2-3 migrations, 1 edge function.

