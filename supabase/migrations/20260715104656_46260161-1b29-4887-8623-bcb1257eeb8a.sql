
-- 1. deposit_requests table
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  sender_reference text,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deposit_requests_status_created_idx ON public.deposit_requests (status, created_at DESC);
CREATE INDEX deposit_requests_user_idx ON public.deposit_requests (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.deposit_requests TO authenticated;
GRANT UPDATE ON public.deposit_requests TO authenticated;
GRANT ALL ON public.deposit_requests TO service_role;

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits" ON public.deposit_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own pending deposits" ON public.deposit_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins update deposits" ON public.deposit_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER deposit_requests_touch
  BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 2. Admin visibility policies on existing tables
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all investments" ON public.user_investments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Replace create_deposit_request to use the queue
DROP FUNCTION IF EXISTS public.create_deposit_request(numeric);

CREATE OR REPLACE FUNCTION public.create_deposit_request(_amount numeric, _sender_reference text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  INSERT INTO public.deposit_requests (user_id, amount, sender_reference)
    VALUES (uid, _amount, NULLIF(trim(_sender_reference), ''))
    RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'deposit_id', new_id);
END $$;

-- 4. Admin review action (approve/reject) — atomic, guards against double-credit
CREATE OR REPLACE FUNCTION public.admin_review_deposit(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid := auth.uid();
  dep public.deposit_requests%ROWTYPE;
BEGIN
  IF admin_id IS NULL OR NOT public.has_role(admin_id, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO dep FROM public.deposit_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF dep.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_reviewed', 'status', dep.status);
  END IF;

  IF _approve THEN
    UPDATE public.deposit_requests
      SET status = 'approved',
          admin_note = NULLIF(trim(_note), ''),
          reviewed_by = admin_id,
          reviewed_at = now()
      WHERE id = _id;

    UPDATE public.profiles
      SET balance = balance + dep.amount
      WHERE id = dep.user_id;

    INSERT INTO public.transactions (user_id, type, amount, status, note)
      VALUES (dep.user_id, 'deposit', dep.amount, 'completed',
              'Deposit approved (ref: ' || COALESCE(dep.sender_reference, dep.id::text) || ')');

    RETURN jsonb_build_object('ok', true, 'status', 'approved', 'amount', dep.amount);
  ELSE
    UPDATE public.deposit_requests
      SET status = 'rejected',
          admin_note = NULLIF(trim(_note), ''),
          reviewed_by = admin_id,
          reviewed_at = now()
      WHERE id = _id;

    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
END $$;

-- 5. Admin manual wallet adjustment (corrections/refunds)
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid := auth.uid();
  new_balance numeric;
  tx_type public.tx_type;
BEGIN
  IF admin_id IS NULL OR NOT public.has_role(admin_id, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'Amount must be non-zero'; END IF;

  UPDATE public.profiles
    SET balance = balance + _amount
    WHERE id = _user_id
    RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF new_balance < 0 THEN RAISE EXCEPTION 'Insufficient balance for debit'; END IF;

  tx_type := CASE WHEN _amount > 0 THEN 'deposit'::public.tx_type ELSE 'withdraw'::public.tx_type END;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (_user_id, tx_type, abs(_amount), 'completed',
            'Admin adjustment: ' || COALESCE(NULLIF(trim(_note), ''), 'no note'));

  RETURN jsonb_build_object('ok', true, 'new_balance', new_balance);
END $$;
