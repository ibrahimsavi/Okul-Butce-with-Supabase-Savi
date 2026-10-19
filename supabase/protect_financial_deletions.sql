-- Preserve financial records even when a child is inserted after an API precheck.
BEGIN;
ALTER TABLE public.student_fees DROP CONSTRAINT student_fees_ogrenci_id_fkey;
ALTER TABLE public.student_fees ADD CONSTRAINT student_fees_ogrenci_id_fkey
  FOREIGN KEY (ogrenci_id) REFERENCES public.students(id) ON DELETE RESTRICT;
ALTER TABLE public.payments DROP CONSTRAINT payments_aidat_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_aidat_id_fkey
  FOREIGN KEY (aidat_id) REFERENCES public.student_fees(id) ON DELETE RESTRICT;
COMMIT;
