


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_status_enum" AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."booking_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."entity_type_enum" AS ENUM (
    'client',
    'investor',
    'consultant',
    'other'
);


ALTER TYPE "public"."entity_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."gender_enum" AS ENUM (
    'Male',
    'Female',
    'Other'
);


ALTER TYPE "public"."gender_enum" OWNER TO "postgres";


CREATE TYPE "public"."investment_status_enum" AS ENUM (
    'pending',
    'settled'
);


ALTER TYPE "public"."investment_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."plot_status_enum" AS ENUM (
    'available',
    'token_paid',
    'sold',
    'fully_paid',
    'allotted'
);


ALTER TYPE "public"."plot_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."role_enum" AS ENUM (
    'admin',
    'employee',
    'client',
    'master_admin'
);


ALTER TYPE "public"."role_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type_enum" AS ENUM (
    'credit',
    'debit'
);


ALTER TYPE "public"."transaction_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_company_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT id FROM public.companies WHERE slug = 'didpl' LIMIT 1;
$$;


ALTER FUNCTION "public"."default_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_changes_count"() RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::INTEGER FROM public.pending_changes WHERE status = 'pending';
$$;


ALTER FUNCTION "public"."get_pending_changes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'), 
    'admin'::role_enum -- Making your first user an Admin!
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_employee"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employee');
$$;


ALTER FUNCTION "public"."is_employee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_pending_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM pg_notify(
    'pending_change',
    json_build_object(
      'id',          NEW.id,
      'entity_type', NEW.entity_type,
      'operation',   NEW.operation,
      'description', NEW.description
    )::text
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_pending_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_plot_status"("p_plot_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_has_confirmed BOOLEAN;
  v_confirmed_fully_paid BOOLEAN;
  v_has_pending BOOLEAN;
  v_pending_fully_paid BOOLEAN;
  v_new_status public.plot_status_enum;
  v_primary_client_id UUID;
BEGIN
  -- Determine states based on all active bookings
  SELECT 
    EXISTS(SELECT 1 FROM public.bookings WHERE plot_id = p_plot_id AND status = 'confirmed'),
    EXISTS(SELECT 1 FROM public.bookings 
           WHERE plot_id = p_plot_id 
             AND status = 'confirmed' 
             AND (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0)) > 0 
             AND COALESCE(amount_paid, 0) >= (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0))),
    EXISTS(SELECT 1 FROM public.bookings WHERE plot_id = p_plot_id AND status = 'pending'),
    EXISTS(SELECT 1 FROM public.bookings 
           WHERE plot_id = p_plot_id 
             AND status = 'pending' 
             AND (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0)) > 0 
             AND COALESCE(amount_paid, 0) >= (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0)))
  INTO v_has_confirmed, v_confirmed_fully_paid, v_has_pending, v_pending_fully_paid;

  -- Evaluate new status
  IF v_confirmed_fully_paid THEN
    v_new_status := 'sold'::public.plot_status_enum;
  ELSIF v_has_confirmed THEN
    v_new_status := 'allotted'::public.plot_status_enum;
  ELSIF v_pending_fully_paid THEN
    v_new_status := 'fully_paid'::public.plot_status_enum;
  ELSIF v_has_pending THEN
    v_new_status := 'token_paid'::public.plot_status_enum;
  ELSE
    v_new_status := 'available'::public.plot_status_enum;
  END IF;

  -- Determine the "primary client" to sync with plot.client_id
  SELECT client_id INTO v_primary_client_id
  FROM public.bookings
  WHERE plot_id = p_plot_id AND status IN ('pending', 'confirmed')
  ORDER BY 
    (status = 'confirmed') DESC, 
    (COALESCE(amount_paid, 0) >= (COALESCE(total_amount, 0) - COALESCE(discount_amount, 0))) DESC,
    booking_date ASC
  LIMIT 1;

  -- Execute the update
  UPDATE public.plots
  SET 
    status = v_new_status,
    client_id = v_primary_client_id
  WHERE id = p_plot_id 
    AND (status IS DISTINCT FROM v_new_status OR client_id IS DISTINCT FROM v_primary_client_id);

END;
$$;


ALTER FUNCTION "public"."recalculate_plot_status"("p_plot_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role          public.role_enum;
  v_granted       BOOLEAN;
BEGIN
  -- Step 1: Get the user's role within this company
  SELECT role INTO v_role
  FROM public.company_members
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND status = 'active';

  -- If user has no active membership in this company, deny
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Step 2: Check user-level override (highest priority)
  SELECT granted INTO v_granted
  FROM public.user_permission_overrides
  WHERE user_id       = p_user_id
    AND company_id    = p_company_id
    AND permission_key = p_permission_key
    AND (expires_at IS NULL OR expires_at > NOW());

  IF FOUND THEN
    RETURN v_granted;
  END IF;

  -- Step 3: Check company-level override for this role
  SELECT granted INTO v_granted
  FROM public.company_permission_overrides
  WHERE company_id    = p_company_id
    AND permission_key = p_permission_key
    AND role           = v_role;

  IF FOUND THEN
    RETURN v_granted;
  END IF;

  -- Step 4: Fall back to the default grant in the permissions catalog
  SELECT
    CASE v_role
      WHEN 'master_admin' THEN master_admin
      WHEN 'admin'        THEN admin
      WHEN 'employee'     THEN employee
      WHEN 'client'       THEN client
      ELSE FALSE
    END
  INTO v_granted
  FROM public.permissions
  WHERE key = p_permission_key;

  -- If the permission key doesn't exist in the catalog, deny
  RETURN COALESCE(v_granted, FALSE);
END;
$$;


ALTER FUNCTION "public"."resolve_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_company_context"("p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.company_id', p_company_id::TEXT, true);
END;
$$;


ALTER FUNCTION "public"."set_company_context"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_booking_type"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.bookings
    SET booking_type = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.booking_partners WHERE booking_id = OLD.booking_id
      ) THEN 'partnership'
      ELSE 'single'
    END
    WHERE id = OLD.booking_id;
    RETURN OLD;
  ELSE
    UPDATE public.bookings
      SET booking_type = 'partnership'
      WHERE id = NEW.booking_id;
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."sync_booking_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_plot_status_calc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trg_plot_status_calc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_booking_amount_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_booking_amount_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_plot_status_from_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_plot_status_from_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."booking_fees" (
    "booking_id" "uuid" NOT NULL,
    "stamp_duty" "text" DEFAULT '0'::"text",
    "legal_fees" "text" DEFAULT '0'::"text",
    "maintenance_fees" "text" DEFAULT '0'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "registration_fees" "text" DEFAULT '0'::"text",
    "gov_fees" "text"
);


ALTER TABLE "public"."booking_fees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_partners" (
    "booking_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_code" "text",
    "client_id" "uuid" NOT NULL,
    "plot_id" "uuid" NOT NULL,
    "total_amount" real NOT NULL,
    "discount_amount" real DEFAULT 0,
    "consultant_id" "uuid",
    "commission_percent" real DEFAULT 0,
    "status" "public"."booking_status_enum" DEFAULT 'pending'::"public"."booking_status_enum",
    "booking_date" timestamp with time zone DEFAULT "now"(),
    "partner_client_id" "uuid",
    "booking_type" "text" DEFAULT 'single'::"text" NOT NULL,
    "amount_paid" real DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bookings_booking_type_check" CHECK (("booking_type" = ANY (ARRAY['single'::"text", 'partnership'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "document_type" "text" NOT NULL,
    "description" "text",
    "uploaded_by" "uuid" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "booking_id" "uuid",
    "reference_id" "text",
    CONSTRAINT "client_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['kyc'::"text", 'aadhaar_pan'::"text", 'property'::"text", 'sale_agreement'::"text", 'rent_agreement'::"text", 'image'::"text", 'miscellaneous'::"text"]))),
    CONSTRAINT "client_documents_file_size_check" CHECK (("file_size" > 0))
);


ALTER TABLE "public"."client_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_documents" IS 'Document metadata for CRM client files stored in Supabase Storage';



COMMENT ON COLUMN "public"."client_documents"."storage_path" IS 'Full path in crm-documents bucket: clients/{client_id}/{uuid}.{ext}';



COMMENT ON COLUMN "public"."client_documents"."is_deleted" IS 'Soft delete; true = hidden from UI, file retained in storage';



COMMENT ON COLUMN "public"."client_documents"."reference_id" IS 'User-supplied identifier (e.g. Dastavej number, Index II number) for legal document tracking';



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_user_id" "uuid",
    "client_code" "text",
    "name" "text" NOT NULL,
    "gender" "public"."gender_enum",
    "phone" "text",
    "email" "text",
    "birthdate" "date",
    "occupation" "text",
    "pan_number" "text",
    "aadhar_number" "text",
    "residential_address" "text",
    "residential_state" "text",
    "residential_city" "text",
    "residential_pincode" "text",
    "office_address" "text",
    "office_state" "text",
    "office_city" "text",
    "office_pincode" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "display_name" "text",
    "description" "text",
    "logo_url" "text",
    "company_type" "text" DEFAULT 'parent'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "primary_email" "text",
    "primary_phone" "text",
    "address" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "companies_company_type_check" CHECK (("company_type" = ANY (ARRAY['parent'::"text", 'child'::"text"]))),
    CONSTRAINT "companies_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies" IS 'Business entities (companies) within a workspace. E.g. DIDPL and DIDLLP both live inside the DIDP Group workspace.';



COMMENT ON COLUMN "public"."companies"."parent_id" IS 'If set, this company is a child/subsidiary of the referenced company. Only one level of nesting is supported.';



CREATE TABLE IF NOT EXISTS "public"."company_members" (
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."role_enum" DEFAULT 'employee'::"public"."role_enum" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_by" "uuid",
    CONSTRAINT "company_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."company_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_members" IS 'Maps users to a specific company with their role within that company. A user may be a member of multiple companies within the same workspace.';



CREATE TABLE IF NOT EXISTS "public"."company_permission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "role" "public"."role_enum",
    "granted" boolean NOT NULL,
    "reason" "text",
    "set_by" "uuid",
    "set_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_permission_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_permission_overrides" IS 'Overrides the default role-level permission for a specific company. Overrides the permissions table defaults, but is itself overridden by user_permission_overrides.';



CREATE TABLE IF NOT EXISTS "public"."consultants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "consultant_code" "text",
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "address" "text",
    "bank_name" "text",
    "account_number" "text",
    "ifsc_code" "text",
    "pan_number" "text",
    "aadhar_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consultants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "metadata" "jsonb",
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "document_audit_log_action_check" CHECK (("action" = ANY (ARRAY['upload'::"text", 'download'::"text", 'delete'::"text", 'update'::"text"])))
);


ALTER TABLE "public"."document_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "profile_id" "uuid",
    "employee_code" "text",
    "designation" "text",
    "salary" real,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "expense_date" "date" DEFAULT CURRENT_DATE,
    "to_entity" "text" NOT NULL,
    "expense_type" "text" NOT NULL,
    "payment_mode" "text",
    "transaction_id" "text",
    "amount" real NOT NULL,
    "bank_name" "text",
    "branch_name" "text",
    "ifsc_code" "text",
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "investment_code" "text",
    "investor_id" "uuid" NOT NULL,
    "invested_amount" real NOT NULL,
    "interest_rate" real NOT NULL,
    "mature_amount" real NOT NULL,
    "investment_date" "date" DEFAULT CURRENT_DATE,
    "mature_date" "date" NOT NULL,
    "status" "public"."investment_status_enum" DEFAULT 'pending'::"public"."investment_status_enum",
    "exit_date" "date",
    "referral_user_id" "uuid",
    "settlement_history" "jsonb",
    "payment_mode" "text",
    "transaction_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL
);


ALTER TABLE "public"."investments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "investor_code" "text",
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "address" "text",
    "referral_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."investors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "receipt_no" "text",
    "entity_id" "uuid" NOT NULL,
    "entity_type" "public"."entity_type_enum" NOT NULL,
    "booking_id" "uuid",
    "transaction_type" "public"."transaction_type_enum" NOT NULL,
    "amount" real NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE,
    "payment_mode" "text",
    "description" "text",
    "transaction_id" "text",
    "commission_amount" real DEFAULT 0,
    "tds_amount" real DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "payment_type" "text" DEFAULT 'Plot payment'::"text",
    "company_id" "uuid"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_changes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "operation" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL,
    CONSTRAINT "pending_changes_operation_check" CHECK (("operation" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text"]))),
    CONSTRAINT "pending_changes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."pending_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "module" "text" NOT NULL,
    "master_admin" boolean DEFAULT true NOT NULL,
    "admin" boolean DEFAULT false NOT NULL,
    "employee" boolean DEFAULT false NOT NULL,
    "client" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."permissions" IS 'Master catalog of all permission keys. Seeded from lib/permissions/catalog.ts defaults. Read-only at runtime.';



CREATE TABLE IF NOT EXISTS "public"."plots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "plot_code" "text",
    "plot_number" "text" NOT NULL,
    "area_sqyd" real,
    "price" real,
    "price_per_unit" real,
    "project_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "status" "public"."plot_status_enum" DEFAULT 'available'::"public"."plot_status_enum",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."role_enum" DEFAULT 'client'::"public"."role_enum",
    "full_name" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "workspace_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_layouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "layout_type" "text" DEFAULT 'grid'::"text",
    "layout_config" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_layouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_code" "text",
    "name" "text" NOT NULL,
    "location" "text",
    "description" "text",
    "total_plots" integer DEFAULT 0,
    "area_size" real,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" DEFAULT "public"."default_company_id"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "granted" boolean NOT NULL,
    "expires_at" timestamp with time zone,
    "reason" "text" NOT NULL,
    "set_by" "uuid",
    "set_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_permission_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_permission_overrides" IS 'Highest-priority permission overrides scoped to a specific user + company pair. Always requires a reason for audit purposes.';



CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invited_by" "uuid",
    CONSTRAINT "workspace_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'invited'::"text"]))),
    CONSTRAINT "workspace_members_workspace_role_check" CHECK (("workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."workspace_members" IS 'Maps users to their workspace. One record per user (a user belongs to exactly one workspace).';



CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "display_name" "text",
    "description" "text",
    "logo_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "plan" "text" DEFAULT 'standard'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspaces_plan_check" CHECK (("plan" = ANY (ARRAY['standard'::"text", 'professional'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "workspaces_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


COMMENT ON TABLE "public"."workspaces" IS 'Top-level tenant container. Each organisation (e.g. DIDP Group) owns one workspace.';



ALTER TABLE ONLY "public"."booking_fees"
    ADD CONSTRAINT "booking_fees_pkey" PRIMARY KEY ("booking_id");



ALTER TABLE ONLY "public"."booking_partners"
    ADD CONSTRAINT "booking_partners_pkey" PRIMARY KEY ("booking_id", "client_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_code_key" UNIQUE ("booking_code");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_plot_id_key" UNIQUE ("client_id", "plot_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_client_code_key" UNIQUE ("client_code");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_workspace_slug_unique" UNIQUE ("workspace_id", "slug");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_pkey" PRIMARY KEY ("company_id", "user_id");



ALTER TABLE ONLY "public"."company_permission_overrides"
    ADD CONSTRAINT "company_perm_override_unique" UNIQUE ("company_id", "permission_key", "role");



ALTER TABLE ONLY "public"."company_permission_overrides"
    ADD CONSTRAINT "company_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "consultants_consultant_code_key" UNIQUE ("consultant_code");



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "consultants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_audit_log"
    ADD CONSTRAINT "document_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_profile_id_key" UNIQUE ("profile_id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_investment_code_key" UNIQUE ("investment_code");



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_investor_code_key" UNIQUE ("investor_code");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_changes"
    ADD CONSTRAINT "pending_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plots"
    ADD CONSTRAINT "plots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plots"
    ADD CONSTRAINT "plots_plot_code_key" UNIQUE ("plot_code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_project_id_key" UNIQUE ("project_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_project_code_key" UNIQUE ("project_code");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_perm_override_unique" UNIQUE ("user_id", "company_id", "permission_key");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");



CREATE INDEX "idx_audit_client_id" ON "public"."document_audit_log" USING "btree" ("client_id");



CREATE INDEX "idx_audit_document_id" ON "public"."document_audit_log" USING "btree" ("document_id");



CREATE INDEX "idx_audit_performed_at" ON "public"."document_audit_log" USING "btree" ("performed_at" DESC);



CREATE INDEX "idx_booking_partners_booking" ON "public"."booking_partners" USING "btree" ("booking_id");



CREATE INDEX "idx_booking_partners_client" ON "public"."booking_partners" USING "btree" ("client_id");



CREATE INDEX "idx_bookings_booking_date" ON "public"."bookings" USING "btree" ("booking_date" DESC);



CREATE INDEX "idx_bookings_client_id" ON "public"."bookings" USING "btree" ("client_id");



CREATE INDEX "idx_bookings_plot_id" ON "public"."bookings" USING "btree" ("plot_id");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_client_documents_active" ON "public"."client_documents" USING "btree" ("client_id", "is_deleted") WHERE ("is_deleted" = false);



CREATE INDEX "idx_client_documents_booking_id" ON "public"."client_documents" USING "btree" ("booking_id");



CREATE INDEX "idx_client_documents_client_id" ON "public"."client_documents" USING "btree" ("client_id");



CREATE INDEX "idx_client_documents_reference_id" ON "public"."client_documents" USING "btree" ("reference_id") WHERE ("reference_id" IS NOT NULL);



CREATE INDEX "idx_client_documents_type" ON "public"."client_documents" USING "btree" ("client_id", "document_type");



CREATE INDEX "idx_clients_company" ON "public"."clients" USING "btree" ("company_id");



CREATE INDEX "idx_clients_created_at" ON "public"."clients" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_companies_parent" ON "public"."companies" USING "btree" ("parent_id");



CREATE INDEX "idx_companies_workspace" ON "public"."companies" USING "btree" ("workspace_id");



CREATE INDEX "idx_company_members_company" ON "public"."company_members" USING "btree" ("company_id");



CREATE INDEX "idx_company_members_user" ON "public"."company_members" USING "btree" ("user_id");



CREATE INDEX "idx_company_perm_overrides_company" ON "public"."company_permission_overrides" USING "btree" ("company_id");



CREATE INDEX "idx_expenses_company" ON "public"."expenses" USING "btree" ("company_id");



CREATE INDEX "idx_investors_company" ON "public"."investors" USING "btree" ("company_id");



CREATE INDEX "idx_otp_email" ON "public"."otp_codes" USING "btree" ("email");



CREATE INDEX "idx_otp_expires" ON "public"."otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_payments_booking_id" ON "public"."payments" USING "btree" ("booking_id");



CREATE INDEX "idx_payments_company" ON "public"."payments" USING "btree" ("company_id");



CREATE INDEX "idx_payments_entity_id" ON "public"."payments" USING "btree" ("entity_id");



CREATE INDEX "idx_payments_payment_date" ON "public"."payments" USING "btree" ("payment_date" DESC);



CREATE INDEX "idx_pending_changes_company" ON "public"."pending_changes" USING "btree" ("company_id");



CREATE INDEX "idx_pending_changes_entity" ON "public"."pending_changes" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_pending_changes_status" ON "public"."pending_changes" USING "btree" ("status");



CREATE INDEX "idx_pending_changes_submitted" ON "public"."pending_changes" USING "btree" ("submitted_by");



CREATE INDEX "idx_plots_project_id" ON "public"."plots" USING "btree" ("project_id");



CREATE INDEX "idx_plots_status" ON "public"."plots" USING "btree" ("status");



CREATE INDEX "idx_projects_company" ON "public"."projects" USING "btree" ("company_id");



CREATE INDEX "idx_user_perm_overrides_user_company" ON "public"."user_permission_overrides" USING "btree" ("user_id", "company_id");



CREATE INDEX "idx_workspace_members_user" ON "public"."workspace_members" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "consultants_updated_at" BEFORE UPDATE ON "public"."consultants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "expenses_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "investors_updated_at" BEFORE UPDATE ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_booking_partner_change" AFTER INSERT OR DELETE ON "public"."booking_partners" FOR EACH ROW EXECUTE FUNCTION "public"."sync_booking_type"();



CREATE OR REPLACE TRIGGER "on_pending_change_insert" AFTER INSERT ON "public"."pending_changes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_pending_change"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_client_documents_updated_at" BEFORE UPDATE ON "public"."client_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_update_booking_amount_paid" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_booking_amount_paid"();



CREATE OR REPLACE TRIGGER "trg_update_plot_status" AFTER INSERT OR DELETE OR UPDATE OF "amount_paid", "status", "total_amount", "discount_amount", "plot_id" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."trg_plot_status_calc"();



CREATE OR REPLACE TRIGGER "workspaces_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."booking_fees"
    ADD CONSTRAINT "booking_fees_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_partners"
    ADD CONSTRAINT "booking_partners_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_partners"
    ADD CONSTRAINT "booking_partners_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_partner_client_id_fkey" FOREIGN KEY ("partner_client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id");



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_permission_overrides"
    ADD CONSTRAINT "company_permission_overrides_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_permission_overrides"
    ADD CONSTRAINT "company_permission_overrides_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_permission_overrides"
    ADD CONSTRAINT "company_permission_overrides_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "consultants_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_audit_log"
    ADD CONSTRAINT "document_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_referral_user_id_fkey" FOREIGN KEY ("referral_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_changes"
    ADD CONSTRAINT "pending_changes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_changes"
    ADD CONSTRAINT "pending_changes_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pending_changes"
    ADD CONSTRAINT "pending_changes_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plots"
    ADD CONSTRAINT "plots_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."plots"
    ADD CONSTRAINT "plots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Authenticated users can insert audit log" ON "public"."document_audit_log" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can insert client_documents" ON "public"."client_documents" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "uploaded_by"));



CREATE POLICY "Authenticated users can read client_documents" ON "public"."client_documents" FOR SELECT TO "authenticated" USING ((("auth"."uid"() IS NOT NULL) AND ("is_deleted" = false)));



CREATE POLICY "Authenticated users can update client_documents" ON "public"."client_documents" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Service role can hard delete client_documents" ON "public"."client_documents" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Service role full access on audit log" ON "public"."document_audit_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "admins_update_changes" ON "public"."pending_changes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."role_enum", 'master_admin'::"public"."role_enum"]))))));



ALTER TABLE "public"."booking_fees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_fees_all" ON "public"."booking_fees" USING (true) WITH CHECK (true);



ALTER TABLE "public"."booking_partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "booking_partners_admin_emp_all" ON "public"."booking_partners" USING (("public"."is_admin"() OR "public"."is_employee"()));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_admin_emp_all" ON "public"."bookings" USING (("public"."is_admin"() OR "public"."is_employee"()));



CREATE POLICY "bookings_client_read" ON "public"."bookings" FOR SELECT USING (("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."client_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_admin_emp_all" ON "public"."clients" USING (("public"."is_admin"() OR "public"."is_employee"()));



CREATE POLICY "clients_self_read" ON "public"."clients" FOR SELECT USING (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_permission_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultants_admin_emp" ON "public"."consultants" USING (("public"."is_admin"() OR "public"."is_employee"()));



ALTER TABLE "public"."document_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_admin" ON "public"."employees" USING ("public"."is_admin"());



CREATE POLICY "employees_emp_read" ON "public"."employees" FOR SELECT USING ("public"."is_employee"());



CREATE POLICY "employees_insert_own_changes" ON "public"."pending_changes" FOR INSERT WITH CHECK (("auth"."uid"() = "submitted_by"));



CREATE POLICY "employees_read_own_changes" ON "public"."pending_changes" FOR SELECT USING ((("auth"."uid"() = "submitted_by") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."role_enum", 'master_admin'::"public"."role_enum"])))))));



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_admin_emp" ON "public"."expenses" USING (("public"."is_admin"() OR "public"."is_employee"()));



ALTER TABLE "public"."investments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investments_admin" ON "public"."investments" USING ("public"."is_admin"());



ALTER TABLE "public"."investors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investors_admin" ON "public"."investors" USING ("public"."is_admin"());



CREATE POLICY "layouts_admin_all" ON "public"."project_layouts" USING ("public"."is_admin"());



CREATE POLICY "layouts_read_all" ON "public"."project_layouts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_admin_emp_all" ON "public"."payments" USING (("public"."is_admin"() OR "public"."is_employee"()));



CREATE POLICY "payments_client_read" ON "public"."payments" FOR SELECT USING (("booking_id" IN ( SELECT "bookings"."id"
   FROM "public"."bookings"
  WHERE ("bookings"."client_id" IN ( SELECT "clients"."id"
           FROM "public"."clients"
          WHERE ("clients"."auth_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."pending_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plots_admin_all" ON "public"."plots" USING ("public"."is_admin"());



CREATE POLICY "plots_employee_update" ON "public"."plots" FOR UPDATE USING ("public"."is_employee"());



CREATE POLICY "plots_read_all" ON "public"."plots" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" USING ("public"."is_admin"());



CREATE POLICY "profiles_read_all" ON "public"."profiles" FOR SELECT USING (("public"."is_admin"() OR "public"."is_employee"() OR ("id" = "auth"."uid"())));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



ALTER TABLE "public"."project_layouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_admin_all" ON "public"."projects" USING ("public"."is_admin"());



CREATE POLICY "projects_read_all" ON "public"."projects" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "temp_companies_authenticated_read" ON "public"."companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_company_members_authenticated_read" ON "public"."company_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_company_perm_overrides_authenticated_read" ON "public"."company_permission_overrides" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_permissions_authenticated_read" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_user_perm_overrides_authenticated_read" ON "public"."user_permission_overrides" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_workspace_members_authenticated_read" ON "public"."workspace_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_workspaces_authenticated_read" ON "public"."workspaces" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_permission_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."default_company_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."default_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."default_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_changes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_changes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_changes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_employee"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_employee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_employee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_pending_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_pending_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_pending_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_plot_status"("p_plot_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_plot_status"("p_plot_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_plot_status"("p_plot_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_permission"("p_user_id" "uuid", "p_company_id" "uuid", "p_permission_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_company_context"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_company_context"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_company_context"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_booking_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_booking_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_booking_type"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_plot_status_calc"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_plot_status_calc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_plot_status_calc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_booking_amount_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_booking_amount_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_booking_amount_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_plot_status_from_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_plot_status_from_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_plot_status_from_booking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."booking_fees" TO "anon";
GRANT ALL ON TABLE "public"."booking_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_fees" TO "service_role";



GRANT ALL ON TABLE "public"."booking_partners" TO "anon";
GRANT ALL ON TABLE "public"."booking_partners" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_partners" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."client_documents" TO "anon";
GRANT ALL ON TABLE "public"."client_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."client_documents" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_members" TO "anon";
GRANT ALL ON TABLE "public"."company_members" TO "authenticated";
GRANT ALL ON TABLE "public"."company_members" TO "service_role";



GRANT ALL ON TABLE "public"."company_permission_overrides" TO "anon";
GRANT ALL ON TABLE "public"."company_permission_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."company_permission_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."consultants" TO "anon";
GRANT ALL ON TABLE "public"."consultants" TO "authenticated";
GRANT ALL ON TABLE "public"."consultants" TO "service_role";



GRANT ALL ON TABLE "public"."document_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."document_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."document_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."investments" TO "anon";
GRANT ALL ON TABLE "public"."investments" TO "authenticated";
GRANT ALL ON TABLE "public"."investments" TO "service_role";



GRANT ALL ON TABLE "public"."investors" TO "anon";
GRANT ALL ON TABLE "public"."investors" TO "authenticated";
GRANT ALL ON TABLE "public"."investors" TO "service_role";



GRANT ALL ON TABLE "public"."otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."pending_changes" TO "anon";
GRANT ALL ON TABLE "public"."pending_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_changes" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."plots" TO "anon";
GRANT ALL ON TABLE "public"."plots" TO "authenticated";
GRANT ALL ON TABLE "public"."plots" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_layouts" TO "anon";
GRANT ALL ON TABLE "public"."project_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."project_layouts" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."user_permission_overrides" TO "anon";
GRANT ALL ON TABLE "public"."user_permission_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permission_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































