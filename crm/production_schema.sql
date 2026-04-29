


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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
    'sold',
    'token_paid',
    'partially_paid'
);


ALTER TYPE "public"."plot_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."receipt_type_enum" AS ENUM (
    'payment',
    'stamp_duty',
    'legal_fees',
    'maintenance'
);


ALTER TYPE "public"."receipt_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."role_enum" AS ENUM (
    'admin',
    'employee',
    'client'
);


ALTER TYPE "public"."role_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type_enum" AS ENUM (
    'credit',
    'debit'
);


ALTER TYPE "public"."transaction_type_enum" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "booking_code" "text",
    "client_id" "uuid" NOT NULL,
    "plot_id" "uuid" NOT NULL,
    "total_amount" real NOT NULL,
    "discount_amount" real DEFAULT 0,
    "donation_amount" real DEFAULT 0,
    "consultant_id" "uuid",
    "commission_percent" real DEFAULT 0,
    "commission_amount" real DEFAULT 0,
    "tds_amount" real DEFAULT 0,
    "status" "public"."booking_status_enum" DEFAULT 'pending'::"public"."booking_status_enum",
    "booking_date" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


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
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


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
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consultants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "profile_id" "uuid",
    "employee_code" "text",
    "designation" "text",
    "salary" real,
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "receipt_type" "public"."receipt_type_enum" DEFAULT 'payment'::"public"."receipt_type_enum",
    "transaction_id" "text",
    "commission_amount" real DEFAULT 0,
    "tds_amount" real DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
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
    CONSTRAINT "pending_changes_operation_check" CHECK (("operation" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text"]))),
    CONSTRAINT "pending_changes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."pending_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "plot_code" "text",
    "plot_number" "text" NOT NULL,
    "area_sqm" real,
    "area_sqyd" real,
    "length" real,
    "width" real,
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
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_code_key" UNIQUE ("booking_code");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_plot_id_key" UNIQUE ("client_id", "plot_id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_client_code_key" UNIQUE ("client_code");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "consultants_consultant_code_key" UNIQUE ("consultant_code");



ALTER TABLE ONLY "public"."consultants"
    ADD CONSTRAINT "consultants_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_otp_email" ON "public"."otp_codes" USING "btree" ("email");



CREATE INDEX "idx_otp_expires" ON "public"."otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_pending_changes_entity" ON "public"."pending_changes" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_pending_changes_status" ON "public"."pending_changes" USING "btree" ("status");



CREATE INDEX "idx_pending_changes_submitted" ON "public"."pending_changes" USING "btree" ("submitted_by");



CREATE OR REPLACE TRIGGER "on_pending_change_insert" AFTER INSERT ON "public"."pending_changes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_pending_change"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_plot_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_referral_user_id_fkey" FOREIGN KEY ("referral_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "admins_update_changes" ON "public"."pending_changes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."role_enum")))));



ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_admin_emp_all" ON "public"."bookings" USING (("public"."is_admin"() OR "public"."is_employee"()));



CREATE POLICY "bookings_client_read" ON "public"."bookings" FOR SELECT USING (("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_admin_emp_all" ON "public"."clients" USING (("public"."is_admin"() OR "public"."is_employee"()));



CREATE POLICY "clients_self_read" ON "public"."clients" FOR SELECT USING (("auth_user_id" = "auth"."uid"()));



ALTER TABLE "public"."consultants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultants_admin_emp" ON "public"."consultants" USING (("public"."is_admin"() OR "public"."is_employee"()));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_admin" ON "public"."employees" USING ("public"."is_admin"());



CREATE POLICY "employees_emp_read" ON "public"."employees" FOR SELECT USING ("public"."is_employee"());



CREATE POLICY "employees_insert_own_changes" ON "public"."pending_changes" FOR INSERT WITH CHECK (("auth"."uid"() = "submitted_by"));



CREATE POLICY "employees_read_own_changes" ON "public"."pending_changes" FOR SELECT USING ((("auth"."uid"() = "submitted_by") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."role_enum"))))));



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



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_changes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_changes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_changes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_employee"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_employee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_employee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_pending_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_pending_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_pending_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."consultants" TO "anon";
GRANT ALL ON TABLE "public"."consultants" TO "authenticated";
GRANT ALL ON TABLE "public"."consultants" TO "service_role";



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







