
-- VIP products catalog
CREATE TABLE public.vip_products (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  daily_profit NUMERIC NOT NULL,
  image_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_products TO anon, authenticated;
GRANT ALL ON public.vip_products TO service_role;
ALTER TABLE public.vip_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vip products readable" ON public.vip_products FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.vip_products (id, name, price, daily_profit, image_key, description) VALUES
(1,'Heavy Duty Industrial Printer',2000,300,'vip1','Entry-level VIP unit backed by a heavy duty industrial printer asset. Ideal for first-time investors who want a low-risk way to learn how the Kamdan investment cycle works. Once approved, the printer begins generating a fixed daily profit that you can claim every 24 hours straight to your wallet balance.'),
(2,'Mini Solar Power System',4000,600,'vip2','A portable solar power system that produces steady clean-energy income. Perfect for cautious investors ready to scale up from VIP 1. Enjoy predictable 24-hour claim cycles and a healthy daily return on a modest capital outlay.'),
(3,'Laptop Repair Toolkit Set',8000,1200,'vip3','A professional laptop repair toolkit set powering a small tech-service operation. This VIP tier balances affordability with strong daily returns and is a favourite of investors building their first serious portfolio on Kamdan.'),
(4,'Oil Drilling Tool Kit',15000,2250,'vip4','Mid-tier VIP backed by an oil drilling tool kit deployed with partner service firms. Higher capital unlocks higher daily profits, all claimable every 24 hours after admin approval of your purchase.'),
(5,'Professional Mechanic Tool Box',25000,3750,'vip5','A fully stocked mechanic tool box leased out to workshops across the country. VIP 5 is where serious investors typically start compounding: strong daily payout, stable asset, transparent 24-hour claim cycle.'),
(6,'High Capacity Power Bank Station',40000,6000,'vip6','A high capacity power bank charging station placed in high-traffic locations. Every 24 hours the station generates a fixed daily profit that lands in your wallet the moment you tap claim.'),
(7,'CNC Engraving Machine',60000,9000,'vip7','Precision CNC engraving machine leased to small manufacturers. VIP 7 unlocks premium daily returns with the same simple 24-hour claim rhythm you already know from lower tiers.'),
(8,'Diesel Generator Set (5KVA)',90000,13500,'vip8','A 5KVA diesel generator set deployed to businesses that need backup power. This premium tier is designed for investors who want strong, predictable daily income from real industrial equipment.'),
(9,'Industrial Welding Machine',130000,19500,'vip9','An industrial welding machine placed with fabrication partners. VIP 9 is one of the top tiers on Kamdan, delivering elite daily returns to serious, well-capitalized members.'),
(10,'Mini Computer Server Unit',180000,27000,'vip10','Flagship VIP unit — a mini computer server providing hosting capacity to enterprise clients. Reserved for Kamdan''s top investors, VIP 10 offers the highest daily profit in the catalog with the same clean 24-hour claim experience.');

-- Investment status enum
CREATE TYPE investment_status AS ENUM ('pending','active','rejected','cancelled');

-- User investments
CREATE TABLE public.user_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES public.vip_products(id),
  price NUMERIC NOT NULL,
  daily_profit NUMERIC NOT NULL,
  status investment_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  last_claim_at TIMESTAMPTZ,
  total_claimed NUMERIC NOT NULL DEFAULT 0,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_investments TO authenticated;
GRANT ALL ON public.user_investments TO service_role;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own investments" ON public.user_investments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own investments" ON public.user_investments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins update investments" ON public.user_investments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER touch_user_investments BEFORE UPDATE ON public.user_investments FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Claim RPC: only every 24h, only when active
CREATE OR REPLACE FUNCTION public.claim_investment_profit(_investment_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    SET balance = balance + inv.daily_profit,
        total_earnings = total_earnings + inv.daily_profit
    WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'earning', inv.daily_profit, 'completed', 'VIP ' || inv.product_id || ' daily profit');

  RETURN jsonb_build_object('ok', true, 'amount', inv.daily_profit, 'next_claim_at', now() + INTERVAL '24 hours');
END $$;

-- Buy RPC: creates a pending investment + pending deposit transaction
CREATE OR REPLACE FUNCTION public.create_investment_order(_product_id INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  p public.vip_products%ROWTYPE;
  inv_id UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.vip_products WHERE id = _product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product'; END IF;

  INSERT INTO public.user_investments (user_id, product_id, price, daily_profit)
    VALUES (uid, p.id, p.price, p.daily_profit)
    RETURNING id INTO inv_id;

  INSERT INTO public.transactions (user_id, type, amount, status, note)
    VALUES (uid, 'deposit', p.price, 'pending', 'VIP ' || p.id || ' purchase — awaiting confirmation');

  RETURN jsonb_build_object('ok', true, 'investment_id', inv_id);
END $$;
