
-- Add FK from user_points.user_id to profiles.user_id
ALTER TABLE public.user_points ADD CONSTRAINT user_points_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from discussion_posts.user_id to profiles.user_id
ALTER TABLE public.discussion_posts ADD CONSTRAINT discussion_posts_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from announcements.user_id to profiles.user_id
ALTER TABLE public.announcements ADD CONSTRAINT announcements_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
