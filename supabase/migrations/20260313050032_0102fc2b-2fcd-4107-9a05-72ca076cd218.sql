
-- Allow parents to delete their own links
CREATE POLICY "Parents can delete own links"
  ON public.parent_child_links FOR DELETE TO authenticated
  USING (parent_id = auth.uid());
