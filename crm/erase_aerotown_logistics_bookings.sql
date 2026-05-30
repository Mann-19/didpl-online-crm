-- Script to erase all bookings and reset plots for AEROTOWN Logistics park
-- WARNING: This will permanently delete bookings and their associated payments!

DO $$ 
DECLARE
  v_project_id UUID;
BEGIN
  -- 1. Find the project ID for "AEROTOWN Logistics park"
  -- We use ILIKE to make it case-insensitive
  SELECT id INTO v_project_id 
  FROM public.projects 
  WHERE name ILIKE '%AEROTOWN Logistics park%';
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Project "AEROTOWN Logistics park" not found.';
  END IF;

  -- 2. Delete all payments associated with the bookings of this project
  DELETE FROM public.payments
  WHERE booking_id IN (
    SELECT b.id 
    FROM public.bookings b
    JOIN public.plots p ON p.id = b.plot_id
    WHERE p.project_id = v_project_id
  );

  -- 3. Delete all bookings for this project
  DELETE FROM public.bookings
  WHERE plot_id IN (
    SELECT id 
    FROM public.plots 
    WHERE project_id = v_project_id
  );

  -- 4. Reset all plots to 'available' and remove any direct client linkage
  UPDATE public.plots
  SET 
    status = 'available'::public.plot_status_enum,
    client_id = NULL
  WHERE project_id = v_project_id;
  
  RAISE NOTICE 'Successfully erased all bookings and reset plots for AEROTOWN Logistics park.';
END $$;
