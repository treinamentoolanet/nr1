/*
  # Add Quotes and Company Settings

  ## Summary
  This migration adds two new features:
  1. Company profile settings (name, CNPJ, contact) stored in user_settings
  2. A `quotes` table to store generated customer quotes with full pricing snapshot

  ## Changes

  ### Modified Tables
  - `user_settings`: Add company info columns
    - `empresa_nome` (text) - Company name
    - `empresa_cnpj` (text, optional) - CNPJ number
    - `empresa_contato` (text, optional) - Contact info (phone/email/website)
    - `empresa_endereco` (text, optional) - Address

  ### New Tables
  - `quotes`: Stores generated quotes per user
    - `id` (uuid, PK)
    - `user_id` (uuid, FK auth.users)
    - `numero` (text) - Quote number (auto-generated)
    - `cliente_nome` (text) - Customer name
    - `produto_nome` (text) - Snapshot of product name
    - `produto_id` (uuid, nullable FK) - Reference to product
    - `printer_nome` (text) - Snapshot of printer name
    - `filament_nome` (text) - Snapshot of filament name
    - `quantidade` (int) - Quantity
    - `preco_unitario` (numeric) - Unit price used
    - `desconto_percentual` (numeric) - Discount applied
    - `imposto_percentual` (numeric) - Tax applied
    - `taxa_marketplace` (numeric) - Marketplace fee %
    - `tarifa_fixa_marketplace` (numeric) - Fixed marketplace fee
    - `marketplace_nome` (text, nullable) - Marketplace name
    - `price_mode` (text) - 'varejo' or 'atacado'
    - `custos_totais` (numeric) - Total production costs
    - `subtotal` (numeric)
    - `impostos` (numeric)
    - `taxa_marketplace_valor` (numeric)
    - `lucro_liquido` (numeric)
    - `margem_liquida` (numeric)
    - `total_final` (numeric)
    - `observacoes` (text, optional) - Quote notes
    - `validade_dias` (int) - Quote validity in days
    - `status` (text) - 'pendente', 'aceito', 'recusado'
    - `created_at`, `updated_at` (timestamps)

  ## Security
  - RLS enabled on `quotes`
  - Policies: authenticated users can only access their own quotes
*/

-- Add company info columns to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'empresa_nome'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN empresa_nome text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'empresa_cnpj'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN empresa_cnpj text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'empresa_contato'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN empresa_contato text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'empresa_endereco'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN empresa_endereco text DEFAULT '';
  END IF;
END $$;

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero text NOT NULL DEFAULT '',
  cliente_nome text NOT NULL DEFAULT '',
  produto_nome text NOT NULL DEFAULT '',
  produto_id uuid REFERENCES products(id) ON DELETE SET NULL,
  printer_nome text NOT NULL DEFAULT '',
  filament_nome text NOT NULL DEFAULT '',
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  desconto_percentual numeric NOT NULL DEFAULT 0,
  imposto_percentual numeric NOT NULL DEFAULT 0,
  taxa_marketplace numeric NOT NULL DEFAULT 0,
  tarifa_fixa_marketplace numeric NOT NULL DEFAULT 0,
  marketplace_nome text DEFAULT '',
  price_mode text NOT NULL DEFAULT 'varejo',
  custos_totais numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  impostos numeric NOT NULL DEFAULT 0,
  taxa_marketplace_valor numeric NOT NULL DEFAULT 0,
  lucro_liquido numeric NOT NULL DEFAULT 0,
  margem_liquida numeric NOT NULL DEFAULT 0,
  total_final numeric NOT NULL DEFAULT 0,
  observacoes text DEFAULT '',
  validade_dias integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policies for quotes
CREATE POLICY "Users can select own quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS quotes_user_id_idx ON quotes(user_id);
CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON quotes(user_id, created_at DESC);
