-- Fix AeroTown Residency: Delete inactive plots and update active plot areas to ceil values

DO $$
DECLARE
    v_project_id UUID;
BEGIN
    -- 1. Find the project ID for AeroTown Residency
    SELECT id INTO v_project_id FROM projects WHERE name ILIKE '%aerotown residency%' LIMIT 1;

    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'Project AeroTown Residency not found';
    END IF;

    -- 2. (Skipped deletion of inactive plots as requested)

    -- 3. Update area sizes to exact decimal values
    UPDATE plots SET area_sqyd = 108.50 WHERE project_id = v_project_id AND plot_number = '8';
    UPDATE plots SET area_sqyd = 115.27 WHERE project_id = v_project_id AND plot_number = '11';
    UPDATE plots SET area_sqyd = 162.88 WHERE project_id = v_project_id AND plot_number IN ('79', '80', '81', '82', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '97', '98', '99', '100', '101', '102', '103', '106', '107', '108', '109', '110');
    UPDATE plots SET area_sqyd = 162.99 WHERE project_id = v_project_id AND plot_number = '123';
    UPDATE plots SET area_sqyd = 147.96 WHERE project_id = v_project_id AND plot_number IN ('83', '84', '104', '105');
    UPDATE plots SET area_sqyd = 361.59 WHERE project_id = v_project_id AND plot_number = '96';
    UPDATE plots SET area_sqyd = 216.00 WHERE project_id = v_project_id AND plot_number = '119';
    UPDATE plots SET area_sqyd = 202.72 WHERE project_id = v_project_id AND plot_number = '120';
    UPDATE plots SET area_sqyd = 189.44 WHERE project_id = v_project_id AND plot_number = '121';
    UPDATE plots SET area_sqyd = 176.22 WHERE project_id = v_project_id AND plot_number = '122';
    UPDATE plots SET area_sqyd = 134.79 WHERE project_id = v_project_id AND plot_number = '124';
    UPDATE plots SET area_sqyd = 96.96 WHERE project_id = v_project_id AND plot_number = '125';
    UPDATE plots SET area_sqyd = 98.67 WHERE project_id = v_project_id AND plot_number = '126';
    UPDATE plots SET area_sqyd = 85.45 WHERE project_id = v_project_id AND plot_number = '127';

    -- 4. Recalculate plot prices based on new area_sqyd
    UPDATE plots SET price = area_sqyd * price_per_unit WHERE project_id = v_project_id;

    -- 5. Recalculate bookings associated with these plots
    UPDATE bookings b
    SET 
        total_amount = p.price,
        commission_amount = CASE 
            WHEN b.commission_percent IS NOT NULL 
            THEN p.price * (b.commission_percent / 100.0) 
            ELSE 0 
        END,
        tds_amount = CASE 
            WHEN b.commission_percent IS NOT NULL 
            THEN (p.price * (b.commission_percent / 100.0)) * 0.02 
            ELSE 0 
        END
    FROM plots p
    WHERE b.plot_id = p.id
    AND p.project_id = v_project_id;

END $$;
