/*
  # Add seen_at column to messages table

  1. Changes
    - Add `seen_at` column to `messages` table
      - `seen_at` (timestamptz, nullable) - tracks when a message was seen by the recipient

  2. Security
    - No changes to existing RLS policies needed
    - Column allows null values by default (unseen messages)
*/

-- Add seen_at column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'seen_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN seen_at timestamptz DEFAULT NULL;
  END IF;
END $$;