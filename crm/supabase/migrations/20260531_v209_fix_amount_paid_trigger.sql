-- Backfill amount_paid to ONLY include plot payments
UPDATE public.bookings b
SET amount_paid = COALESCE((
  SELECT SUM(amount)
  FROM public.payments p
  WHERE p.booking_id = b.id 
  AND (p.payment_type IS NULL OR p.payment_type = '' OR p.payment_type = 'Plot payment')
), 0);

-- Update trigger function to ONLY sum plot payments
CREATE OR REPLACE FUNCTION public.update_booking_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_is_plot_payment_new BOOLEAN;
  v_is_plot_payment_old BOOLEAN;
BEGIN
  v_is_plot_payment_new := NEW.payment_type IS NULL OR NEW.payment_type = '' OR NEW.payment_type = 'Plot payment';
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    v_is_plot_payment_old := OLD.payment_type IS NULL OR OLD.payment_type = '' OR OLD.payment_type = 'Plot payment';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_id IS NOT NULL AND v_is_plot_payment_new THEN
      UPDATE public.bookings
      SET amount_paid = COALESCE(amount_paid, 0) + NEW.amount
      WHERE id = NEW.booking_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.booking_id IS DISTINCT FROM NEW.booking_id THEN
      IF OLD.booking_id IS NOT NULL AND v_is_plot_payment_old THEN
        UPDATE public.bookings
        SET amount_paid = amount_paid - OLD.amount
        WHERE id = OLD.booking_id;
      END IF;
      IF NEW.booking_id IS NOT NULL AND v_is_plot_payment_new THEN
        UPDATE public.bookings
        SET amount_paid = COALESCE(amount_paid, 0) + NEW.amount
        WHERE id = NEW.booking_id;
      END IF;
    ELSE
      -- Same booking, check if amount or payment_type changed
      IF (OLD.amount IS DISTINCT FROM NEW.amount) OR (OLD.payment_type IS DISTINCT FROM NEW.payment_type) THEN
        IF NEW.booking_id IS NOT NULL THEN
          UPDATE public.bookings
          SET amount_paid = amount_paid 
                            - CASE WHEN v_is_plot_payment_old THEN OLD.amount ELSE 0 END
                            + CASE WHEN v_is_plot_payment_new THEN NEW.amount ELSE 0 END
          WHERE id = NEW.booking_id;
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.booking_id IS NOT NULL AND v_is_plot_payment_old THEN
      UPDATE public.bookings
      SET amount_paid = amount_paid - OLD.amount
      WHERE id = OLD.booking_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
