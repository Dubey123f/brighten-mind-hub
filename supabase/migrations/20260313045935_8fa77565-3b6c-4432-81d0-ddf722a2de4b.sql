
-- Server-side function to link parent to child by email
-- This avoids exposing auth.users email to the client
CREATE OR REPLACE FUNCTION public.link_parent_to_child(child_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _child_id UUID;
  _parent_id UUID;
  _child_role TEXT;
  _existing BOOLEAN;
BEGIN
  _parent_id := auth.uid();
  
  -- Check caller is a parent
  IF NOT has_role(_parent_id, 'parent') THEN
    RETURN json_build_object('success', false, 'message', 'Only parents can link children');
  END IF;

  -- Find user by email from auth.users
  SELECT id INTO _child_id FROM auth.users WHERE email = lower(trim(child_email));
  
  IF _child_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No account found with this email');
  END IF;

  -- Prevent self-linking
  IF _child_id = _parent_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot link your own account');
  END IF;

  -- Check child has student role
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = _child_id AND role = 'student') INTO _existing;
  IF NOT _existing THEN
    RETURN json_build_object('success', false, 'message', 'This account is not a student');
  END IF;

  -- Check if already linked
  SELECT EXISTS(SELECT 1 FROM parent_child_links WHERE parent_id = _parent_id AND child_id = _child_id) INTO _existing;
  IF _existing THEN
    RETURN json_build_object('success', false, 'message', 'Already linked to this student');
  END IF;

  -- Create link
  INSERT INTO parent_child_links (parent_id, child_id) VALUES (_parent_id, _child_id);

  RETURN json_build_object('success', true, 'message', 'Child linked successfully');
END;
$$;
