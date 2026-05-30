-- 1. Add amount_paid column to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount_paid REAL DEFAULT 0;

-- 2. Backfill existing bookings with total sum of their payments
UPDATE public.bookings b
SET amount_paid = COALESCE((
  SELECT SUM(amount)
  FROM public.payments p
  WHERE p.booking_id = b.id
), 0);

-- 3. Create a trigger function to automatically update amount_paid on bookings when payments change
CREATE OR REPLACE FUNCTION public.update_booking_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET amount_paid = COALESCE(amount_paid, 0) + NEW.amount
      WHERE id = NEW.booking_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.booking_id IS DISTINCT FROM NEW.booking_id THEN
      IF OLD.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET amount_paid = amount_paid - OLD.amount
        WHERE id = OLD.booking_id;
      END IF;
      IF NEW.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET amount_paid = COALESCE(amount_paid, 0) + NEW.amount
        WHERE id = NEW.booking_id;
      END IF;
    ELSIF OLD.amount IS DISTINCT FROM NEW.amount AND NEW.booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET amount_paid = amount_paid - OLD.amount + NEW.amount
      WHERE id = NEW.booking_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.booking_id IS NOT NULL THEN
      UPDATE public.bookings
      SET amount_paid = amount_paid - OLD.amount
      WHERE id = OLD.booking_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach amount_paid trigger to payments table
DROP TRIGGER IF EXISTS trg_update_booking_amount_paid ON public.payments;

CREATE TRIGGER trg_update_booking_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_booking_amount_paid();


-- 5. Create a trigger function to automatically update plot status when booking amount_paid or status changes
CREATE OR REPLACE FUNCTION public.update_plot_status_from_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_value REAL;
  v_new_plot_status public.plot_status_enum;
BEGIN
  -- We only care about pending or confirmed bookings determining plot status
  IF NEW.status IN ('pending', 'confirmed') THEN
    v_deal_value := COALESCE(NEW.total_amount, 0) - COALESCE(NEW.discount_amount, 0);
    
    IF v_deal_value > 0 AND COALESCE(NEW.amount_paid, 0) >= v_deal_value THEN
      IF NEW.status = 'confirmed' THEN
        v_new_plot_status := 'sold'::public.plot_status_enum;
      ELSE
        v_new_plot_status := 'fully_paid'::public.plot_status_enum;
      END IF;
    ELSE
      v_new_plot_status := 'token_paid'::public.plot_status_enum;
    END IF;
    
    UPDATE public.plots
    SET status = v_new_plot_status
    WHERE id = NEW.plot_id AND status != v_new_plot_status;
    
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
    -- If booking is cancelled, check if there are other active bookings for the plot
    -- Otherwise, revert plot to 'available'
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE plot_id = NEW.plot_id AND status IN ('pending', 'confirmed') AND id != NEW.id
    ) THEN
      UPDATE public.plots
      SET status = 'available'::public.plot_status_enum
      WHERE id = NEW.plot_id AND status != 'available'::public.plot_status_enum;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach plot status trigger to bookings table
DROP TRIGGER IF EXISTS trg_update_plot_status ON public.bookings;

CREATE TRIGGER trg_update_plot_status
AFTER UPDATE OF amount_paid, status, total_amount, discount_amount ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_plot_status_from_booking();
