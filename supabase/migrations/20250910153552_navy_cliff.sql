/*
  # Add PIN protection for alliances

  1. New Columns
    - `alliances`
      - `is_pin_protected` (boolean, default false)
      - `access_pin` (text, nullable)
      - `pin_hint` (text, nullable)

  2. Security
    - No additional RLS changes needed (uses existing policies)
    
  3. Changes
    - Add PIN protection columns to alliances table
    - Allow admins to set/remove PINs for specific alliances
*/

-- Add PIN protection columns to alliances table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'is_pin_protected'
  ) THEN
    ALTER TABLE alliances ADD COLUMN is_pin_protected boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'access_pin'
  ) THEN
    ALTER TABLE alliances ADD COLUMN access_pin text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'pin_hint'
  ) THEN
    ALTER TABLE alliances ADD COLUMN pin_hint text;
  END IF;
END $$;