
-- Track daily check-ins and streak
CREATE TABLE public.daily_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  day_in_streak integer NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

GRANT SELECT ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Atomic claim function: awards ₦100 days 1-6, ₦500 on day 7, then resets
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
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
    SET balance = balance + reward,
        total_earnings = total_earnings + reward
    WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'earning', reward, 'completed',
            'Daily check-in day ' || next_day);

  RETURN jsonb_build_object('ok', true, 'day', next_day, 'amount', reward);
END $$;

REVOKE ALL ON FUNCTION public.claim_daily_checkin() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;
