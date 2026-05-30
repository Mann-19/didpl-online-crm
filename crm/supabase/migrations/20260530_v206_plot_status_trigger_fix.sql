-- 1. Create a robust function to recalculate a plot's status based purely on its bookings
CREATE OR REPLACE FUNCTION public.recalculate_plot_status(p_plot_id UUID)
RETURNS VOID AS $$
DECLARE
  v_primary_booking RECORD;
  v_new_status public.plot_status_enum;
  v_deal_value REAL;
BEGIN
  -- Get the primary active booking for the plot (confirmed takes precedence, then oldest pending)
  SELECT * INTO v_primary_booking 
  FROM public.bookings 
  WHERE plot_id = p_plot_id AND status IN ('pending', 'confirmed')
  ORDER BY (status = 'confirmed') DESC, booking_date ASC
  LIMIT 1;

  IF NOT FOUND THEN
    v_new_status := 'available'::public.plot_status_enum;
  ELSE
    v_deal_value := COALESCE(v_primary_booking.total_amount, 0) - COALESCE(v_primary_booking.discount_amount, 0);
    
    -- Fully paid if amount_paid >= deal_value
    IF v_deal_value > 0 AND COALESCE(v_primary_booking.amount_paid, 0) >= v_deal_value THEN
      IF v_primary_booking.status = 'confirmed' THEN
        v_new_status := 'sold'::public.plot_status_enum;
      ELSE
        v_new_status := 'fully_paid'::public.plot_status_enum;
      END IF;
    ELSE
      v_new_status := 'token_paid'::public.plot_status_enum;
    END IF;
  END IF;

  -- Update the plot status, and sync the client_id with the primary booking
  UPDATE public.plots
  SET 
    status = v_new_status,
    client_id = CASE WHEN v_new_status = 'available'::public.plot_status_enum THEN NULL ELSE v_primary_booking.client_id END
  WHERE id = p_plot_id AND (status != v_new_status OR COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::UUID) != COALESCE(CASE WHEN v_new_status = 'available'::public.plot_status_enum THEN NULL ELSE v_primary_booking.client_id END, '00000000-0000-0000-0000-000000000000'::UUID));

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger handler
CREATE OR REPLACE FUNCTION public.trg_plot_status_calc()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_plot_status(OLD.plot_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If the plot_id was changed (transferred)
    IF NEW.plot_id IS DISTINCT FROM OLD.plot_id THEN
      PERFORM public.recalculate_plot_status(OLD.plot_id);
    END IF;
    PERFORM public.recalculate_plot_status(NEW.plot_id);
    RETURN NEW;
  ELSE
    PERFORM public.recalculate_plot_status(NEW.plot_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace the old trigger with the new robust one
DROP TRIGGER IF EXISTS trg_update_plot_status ON public.bookings;

CREATE TRIGGER trg_update_plot_status
AFTER INSERT OR DELETE OR UPDATE OF amount_paid, status, total_amount, discount_amount, plot_id ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.trg_plot_status_calc();
