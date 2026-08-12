
-- Repair active investments missing an approval timestamp (blocked claims)
UPDATE public.user_investments
  SET approved_at = created_at
  WHERE status = 'active' AND approved_at IS NULL;

-- Claim: robust next-claim baseline
CREATE OR REPLACE FUNCTION public.claim_investment_profit(_investment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  inv public.user_investments%ROWTYPE;
  next_claim TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO inv FROM public.user_investments WHERE id = _investment_id AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason','not_found'); END IF;
  IF inv.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'reason','not_active'); END IF;

  next_claim := COALESCE(inv.last_claim_at, inv.approved_at, inv.created_at) + INTERVAL '24 hours';
  IF now() < next_claim THEN
    RETURN jsonb_build_object('ok', false, 'reason','too_soon','next_claim_at', next_claim);
  END IF;

  UPDATE public.user_investments
    SET last_claim_at = now(),
        total_claimed = total_claimed + inv.daily_profit,
        approved_at = COALESCE(approved_at, created_at)
    WHERE id = inv.id;

  UPDATE public.profiles
    SET earnings_balance = earnings_balance + inv.daily_profit,
        total_earnings = total_earnings + inv.daily_profit
    WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'earning', inv.daily_profit, 'completed', 'VIP ' || inv.product_id || ' daily profit');

  RETURN jsonb_build_object('ok', true, 'amount', inv.daily_profit, 'next_claim_at', now() + INTERVAL '24 hours');
END $$;

-- Withdrawal: whole wallet withdrawable, only gate is owning a product
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  _amount numeric,
  _bank_name text,
  _account_number text,
  _account_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  has_product boolean;
  prof public.profiles%ROWTYPE;
  wallet numeric;
  from_earnings numeric;
  from_balance numeric;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF coalesce(trim(_bank_name), '') = '' OR
     coalesce(trim(_account_number), '') = '' OR
     coalesce(trim(_account_name), '') = '' THEN
    RAISE EXCEPTION 'Bank details required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_investments
    WHERE user_id = uid AND status = 'active'
  ) INTO has_product;

  IF NOT has_product THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_investment');
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = uid FOR UPDATE;
  wallet := coalesce(prof.balance, 0) + coalesce(prof.earnings_balance, 0);

  IF wallet < _amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance',
                              'wallet_balance', wallet);
  END IF;

  -- Spend earnings first, then the deposit balance
  from_earnings := least(coalesce(prof.earnings_balance, 0), _amount);
  from_balance := _amount - from_earnings;

  UPDATE public.profiles
    SET earnings_balance = earnings_balance - from_earnings,
        balance = balance - from_balance
    WHERE id = uid;

  INSERT INTO public.withdrawal_requests (user_id, amount, bank_name, account_number, account_name)
    VALUES (uid, _amount, trim(_bank_name), trim(_account_number), trim(_account_name))
    RETURNING id INTO new_id;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'withdraw', _amount, 'pending',
            'Withdrawal to ' || trim(_bank_name) || ' ' || trim(_account_number));

  RETURN jsonb_build_object('ok', true, 'withdrawal_id', new_id);
END $$;
