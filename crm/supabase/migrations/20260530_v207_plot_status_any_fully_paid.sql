-- Create a robust function to recalculate a plot's status based purely on its bookings
-- It now checks if ANY pending booking has reached 100% payment
CREATE OR REPLACE FUNCTION public.recalculate_plot_status(p_plot_id UUID)
RETURNS VOID AS $$
DECLARE
  v_has_confirmed BOOLEAN;
  v_has_fully_paid BOOLEAN;
  v_has_pending BOOLEAN;
  v_new_status public.plot_status_enum;
  v_primary_client_id UUID;
BEGIN
  -- 1. Determine states based on all active bookings
  SELECT 
    EXISTS(SELECT 1 FROM public.bookings WHERE plot_id = p_plot_id AND status = 'confirmed'),
    EXISTS(SELECT 1 FROM public.bookings WHERE plot_id = p_plot_id AND status = 'pending'),
    EXISTS(SELECT 1 FROM public.bookings 
           WHERE plot_id = p_plot_id 
             AND status = 'pending' 
             AND (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0)) > 0 
             AND COALESCE(amount_paid, 0) >= (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0)))
  INTO v_has_confirmed, v_has_pending, v_has_fully_paid;

  -- 2. Evaluate new status
  IF v_has_confirmed THEN
    v_new_status := 'sold'::public.plot_status_enum;
  ELSIF v_has_fully_paid THEN
    v_new_status := 'fully_paid'::public.plot_status_enum;
  ELSIF v_has_pending THEN
    v_new_status := 'token_paid'::public.plot_status_enum;
  ELSE
    v_new_status := 'available'::public.plot_status_enum;
  END IF;

  -- 3. Determine the "primary client" to sync with plot.client_id
  -- We prioritize confirmed, then fully paid pending, then oldest pending
  SELECT client_id INTO v_primary_client_id
  FROM public.bookings
  WHERE plot_id = p_plot_id AND status IN ('pending', 'confirmed')
  ORDER BY 
    (status = 'confirmed') DESC, 
    (COALESCE(amount_paid, 0) >= (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0))) DESC, 
    booking_date ASC
  LIMIT 1;

  -- 4. Update the plot
  UPDATE public.plots
  SET 
    status = v_new_status,
    client_id = v_primary_client_id
  WHERE id = p_plot_id 
    AND (status != v_new_status 
         OR COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::UUID) != COALESCE(v_primary_client_id, '00000000-0000-0000-0000-000000000000'::UUID));

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
