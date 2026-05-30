-- Add fully_paid enum value
ALTER TYPE "public"."plot_status_enum" ADD VALUE IF NOT EXISTS 'fully_paid';

-- The statement above requires to be run in a separate transaction from data updates usually.
-- But since Supabase migrations are run block by block, we will just use a DO block or separate statements.
COMMIT;

-- Update existing plots data to align with new logic
WITH active_bookings AS (
  SELECT 
    b.plot_id,
    b.status AS booking_status,
    (b.total_amount - COALESCE(b.discount_amount, 0)) AS deal_value,
    COALESCE(SUM(pay.amount), 0) AS total_paid,
    ROW_NUMBER() OVER(PARTITION BY b.plot_id ORDER BY b.booking_date DESC) as rn
  FROM bookings b
  LEFT JOIN payments pay ON pay.booking_id = b.id
  WHERE b.status IN ('pending', 'confirmed')
  GROUP BY b.plot_id, b.status, b.total_amount, b.discount_amount, b.booking_date
),
new_plot_statuses AS (
  SELECT 
    p.id AS plot_id,
    CASE 
      WHEN ab.deal_value > 0 AND ab.total_paid >= ab.deal_value AND ab.booking_status = 'confirmed' THEN 'sold'::public.plot_status_enum
      WHEN ab.deal_value > 0 AND ab.total_paid >= ab.deal_value AND ab.booking_status != 'confirmed' THEN 'fully_paid'::public.plot_status_enum
      WHEN ab.plot_id IS NOT NULL THEN 'token_paid'::public.plot_status_enum
      ELSE 'available'::public.plot_status_enum
    END AS new_status
  FROM plots p
  LEFT JOIN active_bookings ab ON ab.plot_id = p.id AND ab.rn = 1
)
UPDATE plots
SET status = nps.new_status
FROM new_plot_statuses nps
WHERE plots.id = nps.plot_id AND plots.status != nps.new_status;
