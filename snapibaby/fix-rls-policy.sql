-- ============================================================
-- FIX RLS: Adicionar SELECT para anon (leitura do polling)
-- Execute no Supabase SQL Editor:
-- supabase.com → Snapibaby → SQL Editor → New query
-- ============================================================

-- Permite que o anon key leia pedidos por ID (para polling da success.html)
DROP POLICY IF EXISTS "anon can select own order" ON orders;
CREATE POLICY "anon can select own order" ON orders
  FOR SELECT TO anon
  USING (true);

-- Verifica as políticas ativas:
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'orders';
