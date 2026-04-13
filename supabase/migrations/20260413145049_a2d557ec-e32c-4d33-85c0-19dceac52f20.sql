
CREATE TABLE public.shipdate_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_by TEXT NOT NULL,
  new_date TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  affected_rows JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipdate_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view changelog"
  ON public.shipdate_changelog FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert changelog entries"
  ON public.shipdate_changelog FOR INSERT
  WITH CHECK (true);
