
CREATE OR REPLACE FUNCTION public.create_deposit_request(_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  tx_id UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'deposit', _amount, 'pending',
            'Deposit request - awaiting admin confirmation')
    RETURNING id INTO tx_id;

  RETURN jsonb_build_object('ok', true, 'transaction_id', tx_id);
END $$;

CREATE OR REPLACE FUNCTION public.create_investment_order(_product_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  p public.vip_products%ROWTYPE;
  inv_id UUID;
  bal numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.vip_products WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product'; END IF;

  SELECT balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < p.price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance',
                              'balance', COALESCE(bal, 0), 'price', p.price);
  END IF;

  UPDATE public.profiles SET balance = balance - p.price WHERE id = uid;

  INSERT INTO public.user_investments (user_id, product_id, price, daily_profit, status, approved_at)
    VALUES (uid, p.id, p.price, p.daily_profit, 'active', now())
    RETURNING id INTO inv_id;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'deposit', p.price, 'completed',
            'VIP ' || p.id || ' purchase from wallet');

  RETURN jsonb_build_object('ok', true, 'investment_id', inv_id);
END $$;
