-- ============================================================
-- SSR SYSTEM — MIGRATION 014: AUTHENTICATED TABLE GRANTS
-- ============================================================
-- RLS policies only work after the authenticated role has the base
-- table privileges. Without these grants, Supabase returns
-- "permission denied for table ..." before any policy is evaluated.
-- ============================================================

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT SELECT ON public.ticket_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contractors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contractor_bills TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bill_line_items TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.contractor_metrics TO authenticated;
