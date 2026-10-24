-- rls_auto_enable() is the event-trigger function behind the project's "automatic RLS" setting.
-- It lives in public, so PostgREST exposed it as an RPC to anon and authenticated (security advisor
-- 0028/0029). Event triggers fire without checking EXECUTE, so revoking it changes nothing else.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
