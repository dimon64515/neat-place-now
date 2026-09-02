ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE POLICY "Order participants read photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-photos'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND (o.client_id = auth.uid() OR o.cleaner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Assigned cleaner uploads photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-photos'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND o.cleaner_id = auth.uid()
  )
);

CREATE POLICY "Assigned cleaner deletes photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'order-photos'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = (storage.foldername(name))[1]
      AND o.cleaner_id = auth.uid()
  )
);