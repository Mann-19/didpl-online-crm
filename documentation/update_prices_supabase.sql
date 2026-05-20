-- Update prices for AeroTown Residency (ATC-001) to 5500
UPDATE public.plots
SET 
    price_per_unit = 5500,
    price = area_sqyd * 5500
WHERE project_id = (SELECT id FROM public.projects WHERE project_code = 'ATC-001');

-- Update prices for Dholera Homes 3 (DH3-001) to 3000
UPDATE public.plots
SET 
    price_per_unit = 3000,
    price = area_sqyd * 3000
WHERE project_id = (SELECT id FROM public.projects WHERE project_code = 'DH3-001');

-- Update prices for AeroTown Logistic Park (AELP-001) to 4500
UPDATE public.plots
SET 
    price_per_unit = 4500,
    price = area_sqyd * 4500
WHERE project_id = (SELECT id FROM public.projects WHERE project_code = 'AELP-001');

-- Recalculate calculations for existing bookings based on the new prices.
-- This ensures that the total_amount, commission_amount, and tds_amount are correct.
UPDATE public.bookings b
SET 
    total_amount = p.price,
    -- Recalculate commission if commission_percent is set
    commission_amount = CASE 
        WHEN b.commission_percent IS NOT NULL 
        THEN p.price * (b.commission_percent / 100.0) 
        ELSE 0 
    END,
    -- Recalculate TDS (2% of the new commission)
    tds_amount = CASE 
        WHEN b.commission_percent IS NOT NULL 
        THEN (p.price * (b.commission_percent / 100.0)) * 0.02 
        ELSE 0 
    END
FROM public.plots p
WHERE b.plot_id = p.id
AND p.project_id IN (
    SELECT id FROM public.projects WHERE project_code IN ('ATC-001', 'DH3-001', 'AELP-001')
);
