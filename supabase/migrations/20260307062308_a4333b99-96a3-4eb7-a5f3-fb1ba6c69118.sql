
-- Live classes table
CREATE TABLE public.live_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Live class messages (chat)
CREATE TABLE public.live_class_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_classes
CREATE POLICY "Anyone authenticated can view live classes" ON public.live_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instructors and admins can create live classes" ON public.live_classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their live classes" ON public.live_classes FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their live classes" ON public.live_classes FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RLS policies for live_class_messages
CREATE POLICY "Anyone authenticated can view messages" ON public.live_class_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can send messages" ON public.live_class_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_messages;
