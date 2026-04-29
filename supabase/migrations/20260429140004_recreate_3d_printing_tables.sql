/*
  # Recriar tabelas do sistema de precificação 3D FDM

  ## Descrição
  Recria todas as tabelas do sistema de precificação para impressão 3D FDM.
  Esta migration garante que o banco de dados atual tenha todas as tabelas necessárias.

  ## Tabelas
  1. `printers` - Impressoras 3D
  2. `filaments` - Filamentos
  3. `products` - Produtos
  4. `product_parts` - Peças de produtos
  5. `marketplaces` - Plataformas de venda
  6. `competitors` - Concorrentes
  7. `user_settings` - Configurações do usuário

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas restritivas por usuário
*/

-- =====================
-- TABELA: printers
-- =====================
DROP TABLE IF EXISTS printers CASCADE;

CREATE TABLE printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  marca TEXT,
  valor_maquina DECIMAL(10,2) NOT NULL DEFAULT 0,
  tempo_retorno INTEGER NOT NULL DEFAULT 12,
  horas_dia INTEGER NOT NULL DEFAULT 8,
  dias_mes INTEGER NOT NULL DEFAULT 22,
  potencia_kw DECIMAL(6,3) NOT NULL DEFAULT 0.3,
  nivel_uso TEXT NOT NULL DEFAULT 'medio' CHECK (nivel_uso IN ('basico', 'medio', 'profissional')),
  percentual_falhas DECIMAL(5,4) NOT NULL DEFAULT 0.05,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own printers"
  ON printers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own printers"
  ON printers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own printers"
  ON printers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own printers"
  ON printers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================
-- TABELA: filaments
-- =====================
DROP TABLE IF EXISTS filaments CASCADE;

CREATE TABLE filaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  descricao TEXT,
  peso_kg DECIMAL(6,3) NOT NULL DEFAULT 1.0,
  custo DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE filaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own filaments"
  ON filaments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own filaments"
  ON filaments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filaments"
  ON filaments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own filaments"
  ON filaments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================
-- TABELA: products
-- =====================
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
  filament_id UUID REFERENCES filaments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================
-- TABELA: product_parts
-- =====================
DROP TABLE IF EXISTS product_parts CASCADE;

CREATE TABLE product_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tempo_impressao DECIMAL(8,2) NOT NULL DEFAULT 0,
  peso_estimado DECIMAL(8,2) NOT NULL DEFAULT 0,
  percentual_acabamento DECIMAL(5,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product parts"
  ON product_parts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own product parts"
  ON product_parts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own product parts"
  ON product_parts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own product parts"
  ON product_parts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.user_id = auth.uid()
    )
  );

-- =====================
-- TABELA: marketplaces
-- =====================
DROP TABLE IF EXISTS marketplaces CASCADE;

CREATE TABLE marketplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  taxa DECIMAL(6,2) NOT NULL DEFAULT 0,
  tarifa_fixa DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketplaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketplaces"
  ON marketplaces FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marketplaces"
  ON marketplaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marketplaces"
  ON marketplaces FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own marketplaces"
  ON marketplaces FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================
-- TABELA: competitors
-- =====================
DROP TABLE IF EXISTS competitors CASCADE;

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitors"
  ON competitors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = competitors.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own competitors"
  ON competitors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = competitors.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own competitors"
  ON competitors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = competitors.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = competitors.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own competitors"
  ON competitors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = competitors.product_id
      AND products.user_id = auth.uid()
    )
  );

-- =====================
-- TABELA: user_settings
-- =====================
DROP TABLE IF EXISTS user_settings CASCADE;

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tarifa_kwh DECIMAL(8,4) NOT NULL DEFAULT 0.75,
  depreciacao_global INTEGER NOT NULL DEFAULT 60,
  multiplicador_atacado DECIMAL(6,4) NOT NULL DEFAULT 1.5,
  multiplicador_varejo DECIMAL(6,4) NOT NULL DEFAULT 2.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_printers_user_id ON printers(user_id);
CREATE INDEX idx_filaments_user_id ON filaments(user_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_product_parts_product_id ON product_parts(product_id);
CREATE INDEX idx_marketplaces_user_id ON marketplaces(user_id);
CREATE INDEX idx_competitors_product_id ON competitors(product_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
