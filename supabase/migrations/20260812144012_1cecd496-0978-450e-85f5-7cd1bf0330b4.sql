
REVOKE ALL ON FUNCTION public.claim_daily_checkin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;

REVOKE ALL ON FUNCTION public.claim_investment_profit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_investment_profit(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_investment_order(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_investment_order(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.create_deposit_request(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_deposit_request(numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_withdrawal_request(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(numeric, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_review_deposit(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_deposit(uuid, boolean, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) TO authenticated;
