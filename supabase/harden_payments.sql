-- Apply once after the existing schema; protects concurrent API writes in PostgreSQL.
BEGIN;
CREATE OR REPLACE FUNCTION public.validate_payment_balance() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE fee_total numeric; paid numeric; target_id bigint;
BEGIN
  target_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.aidat_id ELSE NEW.aidat_id END;
  SELECT tutar INTO fee_total FROM public.student_fees WHERE id = target_id FOR UPDATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NEW.aidat_id <> OLD.aidat_id THEN
    RAISE EXCEPTION 'An existing payment cannot be moved to another fee' USING ERRCODE = '23514';
  END IF;
  IF NEW.tutar IS NULL OR NEW.tutar <= 0 OR NEW.tutar::text = 'NaN' THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(SUM(tutar),0) INTO paid FROM public.payments
    WHERE aidat_id = target_id AND id <> COALESCE(NEW.id, -1);
  IF paid + NEW.tutar > fee_total THEN
    RAISE EXCEPTION 'Payment exceeds remaining balance' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.refresh_fee_balance() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE target_id bigint;
BEGIN
  target_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.aidat_id ELSE NEW.aidat_id END;
  UPDATE public.student_fees SET
    durum = CASE WHEN (SELECT COALESCE(SUM(tutar),0) FROM public.payments WHERE aidat_id = target_id) >= tutar THEN 'paid'
      WHEN son_odeme_tarihi < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
    guncelleme_tarihi = NOW()
    WHERE id = target_id;
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.validate_fee_balance() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE paid numeric;
BEGIN
  SELECT COALESCE(SUM(tutar),0) INTO paid FROM public.payments WHERE aidat_id = NEW.id;
  IF NEW.tutar IS NULL OR NEW.tutar <= 0 OR NEW.tutar::text = 'NaN' OR NEW.tutar < paid THEN
    RAISE EXCEPTION 'Fee cannot be less than paid amount or zero' USING ERRCODE = '23514';
  END IF;
  NEW.durum := CASE WHEN paid >= NEW.tutar THEN 'paid' WHEN NEW.son_odeme_tarihi < CURRENT_DATE THEN 'overdue' ELSE 'pending' END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_balance_guard ON public.payments;
CREATE TRIGGER payment_balance_guard BEFORE INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.validate_payment_balance();
DROP TRIGGER IF EXISTS payment_balance_refresh ON public.payments;
CREATE TRIGGER payment_balance_refresh AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.refresh_fee_balance();
DROP TRIGGER IF EXISTS fee_balance_guard ON public.student_fees;
CREATE TRIGGER fee_balance_guard BEFORE INSERT OR UPDATE ON public.student_fees FOR EACH ROW EXECUTE FUNCTION public.validate_fee_balance();
REVOKE ALL ON FUNCTION public.validate_payment_balance(), public.refresh_fee_balance(), public.validate_fee_balance() FROM PUBLIC, anon, authenticated;
COMMIT;
