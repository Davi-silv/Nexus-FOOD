-- Nexus Food — Helpers RLS multiempresa

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid()),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.company_id = p_company_id
        AND cu.user_id = auth.uid()
        AND cu.active = TRUE
    );
$$;

REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_company_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.company_id = p_company_id
        AND cu.user_id = auth.uid()
        AND cu.active = TRUE
        AND cu.role = 'company_admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_company_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.company_has_permission(
  p_company_id UUID,
  p_module TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_company_admin(p_company_id)
    OR EXISTS (
      SELECT 1
      FROM public.company_users cu
      WHERE cu.company_id = p_company_id
        AND cu.user_id = auth.uid()
        AND cu.active = TRUE
        AND COALESCE((cu.permissions ->> p_module)::boolean, FALSE) = TRUE
    );
$$;

REVOKE ALL ON FUNCTION public.company_has_permission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_has_permission(UUID, TEXT) TO authenticated;
