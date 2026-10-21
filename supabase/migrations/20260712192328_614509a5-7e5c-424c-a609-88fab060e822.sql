
-- Admin-only helper that returns full schema DDL as SQL text
CREATE OR REPLACE FUNCTION public.export_schema_ddl()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  result text := '';
  rec record;
  col_defs text;
  constraint_defs text;
BEGIN
  -- Only admins may call
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  result := E'-- ============================================================\n';
  result := result || E'-- UMS Full Schema Export (public schema)\n';
  result := result || E'-- Generated: ' || now()::text || E'\n';
  result := result || E'-- ============================================================\n\n';
  result := result || E'CREATE SCHEMA IF NOT EXISTS public;\n\n';

  -- ENUM TYPES
  result := result || E'-- ----- ENUM TYPES -----\n';
  FOR rec IN
    SELECT n.nspname AS schema, t.typname AS name,
           string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY n.nspname, t.typname
    ORDER BY t.typname
  LOOP
    result := result || format('DO $$ BEGIN CREATE TYPE public.%I AS ENUM (%s); EXCEPTION WHEN duplicate_object THEN NULL; END $$;', rec.name, rec.labels) || E'\n';
  END LOOP;
  result := result || E'\n';

  -- SEQUENCES
  result := result || E'-- ----- SEQUENCES -----\n';
  FOR rec IN
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name
  LOOP
    result := result || format('CREATE SEQUENCE IF NOT EXISTS public.%I;', rec.sequence_name) || E'\n';
  END LOOP;
  result := result || E'\n';

  -- TABLES
  result := result || E'-- ----- TABLES -----\n';
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    -- Column definitions
    SELECT string_agg(
      format('  %I %s%s%s',
        column_name,
        CASE
          WHEN data_type = 'USER-DEFINED' THEN quote_ident(udt_schema)||'.'||quote_ident(udt_name)
          WHEN data_type = 'ARRAY' THEN
            (SELECT quote_ident(e.udt_schema)||'.'||quote_ident(e.udt_name)||'[]'
             FROM information_schema.element_types e
             WHERE e.object_schema='public' AND e.object_name=rec.table_name
               AND e.object_type='TABLE' AND e.collection_type_identifier=c.dtd_identifier)
          WHEN data_type IN ('character varying','varchar') AND character_maximum_length IS NOT NULL
            THEN 'varchar('||character_maximum_length||')'
          WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL
            THEN 'numeric('||numeric_precision||','||coalesce(numeric_scale,0)||')'
          ELSE data_type
        END,
        CASE WHEN is_nullable='NO' THEN ' NOT NULL' ELSE '' END,
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT '||column_default ELSE '' END
      ), E',\n' ORDER BY ordinal_position
    ) INTO col_defs
    FROM information_schema.columns c
    WHERE table_schema='public' AND table_name = rec.table_name;

    result := result || format(E'\nCREATE TABLE IF NOT EXISTS public.%I (\n%s\n);\n', rec.table_name, col_defs);
  END LOOP;
  result := result || E'\n';

  -- PRIMARY KEYS, UNIQUE, CHECK, FOREIGN KEYS
  result := result || E'-- ----- CONSTRAINTS (PK / UNIQUE / CHECK / FK) -----\n';
  FOR rec IN
    SELECT conrelid::regclass::text AS tbl,
           conname,
           pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY CASE contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'c' THEN 3 WHEN 'f' THEN 4 ELSE 5 END,
             conrelid::regclass::text, conname
  LOOP
    result := result || format('ALTER TABLE %s ADD CONSTRAINT %I %s;', rec.tbl, rec.conname, rec.def) || E'\n';
  END LOOP;
  result := result || E'\n';

  -- INDEXES (excluding PK/unique auto-indexes)
  result := result || E'-- ----- INDEXES -----\n';
  FOR rec IN
    SELECT indexdef FROM pg_indexes
    WHERE schemaname='public'
      AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype IN ('p','u'))
    ORDER BY tablename, indexname
  LOOP
    result := result || rec.indexdef || E';\n';
  END LOOP;
  result := result || E'\n';

  -- FUNCTIONS
  result := result || E'-- ----- FUNCTIONS -----\n';
  FOR rec IN
    SELECT pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  LOOP
    result := result || rec.def || E';\n\n';
  END LOOP;

  -- TRIGGERS
  result := result || E'-- ----- TRIGGERS -----\n';
  FOR rec IN
    SELECT pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  LOOP
    result := result || rec.def || E';\n';
  END LOOP;
  result := result || E'\n';

  -- GRANTS
  result := result || E'-- ----- GRANTS -----\n';
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname
  LOOP
    result := result || format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', rec.table_name) || E'\n';
    result := result || format('GRANT ALL ON public.%I TO service_role;', rec.table_name) || E'\n';
  END LOOP;
  result := result || E'\n';

  -- ENABLE RLS + POLICIES
  result := result || E'-- ----- RLS + POLICIES -----\n';
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
    ORDER BY c.relname
  LOOP
    result := result || format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', rec.table_name) || E'\n';
  END LOOP;
  result := result || E'\n';

  FOR rec IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public'
    ORDER BY tablename, policyname
  LOOP
    result := result || format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
      rec.policyname, rec.tablename, rec.permissive, rec.cmd,
      array_to_string(rec.roles, ', '),
      CASE WHEN rec.qual IS NOT NULL THEN ' USING ('||rec.qual||')' ELSE '' END,
      CASE WHEN rec.with_check IS NOT NULL THEN ' WITH CHECK ('||rec.with_check||')' ELSE '' END
    ) || E'\n';
  END LOOP;

  RETURN result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.export_schema_ddl() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_schema_ddl() TO authenticated;
