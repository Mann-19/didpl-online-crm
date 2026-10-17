-- =============================================================
-- v312: Add plot_structure discriminator to projects & seed Flex project
-- Supports parallel workflows:
--   'fixed' -> Pre-seeded plots with predefined layout renderer
--   'flex'  -> Open/on-demand custom plot assignments
-- =============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS plot_structure TEXT
    CHECK (plot_structure IN ('fixed', 'flex'))
    DEFAULT 'fixed';

COMMENT ON COLUMN public.projects.plot_structure
  IS 'Plot structure mode: fixed (pre-seeded layout plots) or flex (on-demand customized plots)';

-- Ensure all existing projects are marked as 'fixed'
UPDATE public.projects
  SET plot_structure = 'fixed'
  WHERE plot_structure IS NULL;

-- Create parallel test project for AeroTown Logistic Park (Flex)
INSERT INTO public.projects (
  name,
  project_code,
  location,
  description,
  total_plots,
  area_size,
  status,
  company_id,
  plot_structure
)
SELECT
  'AeroTown Logistic Park (Flex)',
  'AELP-FLEX-001',
  'Industrial Area, Dholera SIR',
  'Custom commercial plots in Dholera Special Investment Region. Open/Flex assignment workflow.',
  0,
  50000,
  'active',
  '98fd0cb1-ee02-400e-a181-fc63dc43af23',
  'flex'
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects WHERE project_code = 'AELP-FLEX-001'
);
