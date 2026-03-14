
-- Fix parent-child RLS: Allow parents to view linked children's enrollments, quiz_attempts, lesson_progress

-- 1. Drop and recreate enrollments SELECT policy to include parent access
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'instructor')
    OR is_parent_of(auth.uid(), user_id)
  );

-- 2. Drop and recreate quiz_attempts SELECT policy to include parent access
DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'instructor')
    OR is_parent_of(auth.uid(), user_id)
  );

-- 3. Drop and recreate lesson_progress SELECT policy to include parent access
DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
CREATE POLICY "Users can view own progress" ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'instructor')
    OR is_parent_of(auth.uid(), user_id)
  );

-- 4. Create admin_link_parent_to_child function
CREATE OR REPLACE FUNCTION public.admin_link_parent_to_child(parent_email TEXT, child_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _parent_id UUID;
  _child_id UUID;
  _existing BOOLEAN;
BEGIN
  -- Check caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Only admins can use this function');
  END IF;

  -- Find parent by email
  SELECT id INTO _parent_id FROM auth.users WHERE email = lower(trim(parent_email));
  IF _parent_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No account found with parent email');
  END IF;

  -- Find child by email
  SELECT id INTO _child_id FROM auth.users WHERE email = lower(trim(child_email));
  IF _child_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No account found with child email');
  END IF;

  -- Validate parent has parent role
  IF NOT has_role(_parent_id, 'parent') THEN
    RETURN json_build_object('success', false, 'message', 'Parent account does not have parent role');
  END IF;

  -- Validate child has student role
  IF NOT has_role(_child_id, 'student') THEN
    RETURN json_build_object('success', false, 'message', 'Child account does not have student role');
  END IF;

  -- Prevent same user
  IF _parent_id = _child_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot link same account');
  END IF;

  -- Check if already linked
  SELECT EXISTS(SELECT 1 FROM parent_child_links WHERE parent_id = _parent_id AND child_id = _child_id) INTO _existing;
  IF _existing THEN
    RETURN json_build_object('success', false, 'message', 'Already linked');
  END IF;

  -- Create link
  INSERT INTO parent_child_links (parent_id, child_id) VALUES (_parent_id, _child_id);
  RETURN json_build_object('success', true, 'message', 'Parent-child linked successfully');
END;
$$;

-- 5. Fix parent_child_links INSERT policy to also allow admins
DROP POLICY IF EXISTS "Parents can create links" ON public.parent_child_links;
CREATE POLICY "Parents or admins can create links" ON public.parent_child_links
  FOR INSERT TO authenticated
  WITH CHECK (
    ((parent_id = auth.uid()) AND has_role(auth.uid(), 'parent'))
    OR is_admin(auth.uid())
  );
