
-- 1. Add earnings pool
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS earnings_balance numeric NOT NULL DEFAULT 0;

-- 2. Withdrawal status enum
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own withdrawals"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_withdrawal_touch_updated
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 4. Route daily check-in reward to earnings pool
CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  last_row public.daily_checkins%ROWTYPE;
  next_day int;
  reward numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO last_row FROM public.daily_checkins
    WHERE user_id = uid ORDER BY checkin_date DESC LIMIT 1;

  IF last_row.checkin_date = today THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'day', last_row.day_in_streak);
  END IF;

  IF last_row.checkin_date = today - 1 AND last_row.day_in_streak < 7 THEN
    next_day := last_row.day_in_streak + 1;
  ELSE
    next_day := 1;
  END IF;

  reward := CASE WHEN next_day = 7 THEN 500 ELSE 100 END;

  INSERT INTO public.daily_checkins (user_id, checkin_date, day_in_streak, amount)
    VALUES (uid, today, next_day, reward);

  UPDATE public.profiles
    SET earnings_balance = earnings_balance + reward,
        total_earnings = total_earnings + reward
    WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'earning', reward, 'completed',
            'Daily check-in day ' || next_day);

  RETURN jsonb_build_object('ok', true, 'day', next_day, 'amount', reward);
END $$;

-- 5. Route investment profit claim to earnings pool
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

  next_claim := COALESCE(inv.last_claim_at, inv.approved_at) + INTERVAL '24 hours';
  IF now() < next_claim THEN
    RETURN jsonb_build_object('ok', false, 'reason','too_soon','next_claim_at', next_claim);
  END IF;

  UPDATE public.user_investments
    SET last_claim_at = now(),
        total_claimed = total_claimed + inv.daily_profit
    WHERE id = inv.id;

  UPDATE public.profiles
    SET earnings_balance = earnings_balance + inv.daily_profit,
        total_earnings = total_earnings + inv.daily_profit
    WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'earning', inv.daily_profit, 'completed', 'VIP ' || inv.product_id || ' daily profit');

  RETURN jsonb_build_object('ok', true, 'amount', inv.daily_profit, 'next_claim_at', now() + INTERVAL '24 hours');
END $$;

-- 6. Create withdrawal (deducts from earnings pool, requires active investment)
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
  has_active boolean;
  earn numeric;
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
  ) INTO has_active;

  IF NOT has_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_investment');
  END IF;

  SELECT earnings_balance INTO earn FROM public.profiles WHERE id = uid FOR UPDATE;
  IF earn IS NULL OR earn < _amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_earnings',
                              'earnings_balance', coalesce(earn, 0));
  END IF;

  UPDATE public.profiles SET earnings_balance = earnings_balance - _amount WHERE id = uid;

  INSERT INTO public.withdrawal_requests (user_id, amount, bank_name, account_number, account_name)
    VALUES (uid, _amount, trim(_bank_name), trim(_account_number), trim(_account_name))
    RETURNING id INTO new_id;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'withdraw', _amount, 'pending',
            'Withdrawal to ' || trim(_bank_name) || ' ' || trim(_account_number));

  RETURN jsonb_build_object('ok', true, 'withdrawal_id', new_id);
END $$;

-- 7. Admin review withdrawal
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid := auth.uid();
  wr public.withdrawal_requests%ROWTYPE;
BEGIN
  IF admin_id IS NULL OR NOT public.has_role(admin_id, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO wr FROM public.withdrawal_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF wr.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed', 'status', wr.status);
  END IF;

  IF _approve THEN
    UPDATE public.withdrawal_requests
      SET status = 'approved',
          admin_note = NULLIF(trim(_note), ''),
          reviewed_by = admin_id,
          reviewed_at = now()
      WHERE id = _id;

    UPDATE public.transactions
      SET status = 'completed',
          note = COALESCE(note,'') || ' [approved]'
      WHERE user_id = wr.user_id
        AND type = 'withdraw'
        AND status = 'pending'
        AND amount = wr.amount
        AND created_at <= wr.created_at + INTERVAL '5 seconds'
        AND created_at >= wr.created_at - INTERVAL '5 seconds';

    RETURN jsonb_build_object('ok', true, 'status', 'approved', 'amount', wr.amount);
  ELSE
    UPDATE public.withdrawal_requests
      SET status = 'rejected',
          admin_note = NULLIF(trim(_note), ''),
          reviewed_by = admin_id,
          reviewed_at = now()
      WHERE id = _id;

    -- Refund the exact amount to earnings pool
    UPDATE public.profiles
      SET earnings_balance = earnings_balance + wr.amount
      WHERE id = wr.user_id;

    UPDATE public.transactions
      SET status = 'failed',
          note = COALESCE(note,'') || ' [rejected, refunded]'
      WHERE user_id = wr.user_id
        AND type = 'withdraw'
        AND status = 'pending'
        AND amount = wr.amount
        AND created_at <= wr.created_at + INTERVAL '5 seconds'
        AND created_at >= wr.created_at - INTERVAL '5 seconds';

    RETURN jsonb_build_object('ok', true, 'status', 'rejected', 'refunded', wr.amount);
  END IF;
END $$;
