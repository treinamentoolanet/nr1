/*
  # Adicionar coluna para rastrear progresso do Modo Prático

  ## Descrição
  Adiciona uma coluna à tabela user_settings para rastrear se o usuário completou
  o setup prático e qual é o progresso dele.

  ## Mudanças
  - Adiciona coluna `practical_mode_completed` (boolean, padrão: false)
  - Adiciona coluna `practical_mode_step` (integer, padrão: 0)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'practical_mode_completed'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN practical_mode_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'practical_mode_step'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN practical_mode_step INTEGER DEFAULT 0;
  END IF;
END $$;
