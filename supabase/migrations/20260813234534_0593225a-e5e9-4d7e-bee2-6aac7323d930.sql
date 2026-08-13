-- Harden profiles: no direct balance tampering from the client
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, phone) ON public.profiles TO authenticated;

-- Harden transactions: ledger is written only by SECURITY DEFINER money functions
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM authenticated;
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;