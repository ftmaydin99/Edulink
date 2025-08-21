/*
  # Add time_slots JSONB column to availabilities table
  
  1. Changes
    - Add time_slots JSONB column to store multiple time ranges per day
    - Update existing data to use new format
    - Add validation function for time slots
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add time_slots column
ALTER TABLE availabilities
ADD COLUMN IF NOT EXISTS time_slots jsonb;

-- Update existing data to new format
UPDATE availabilities
SET time_slots = jsonb_build_array(
  jsonb_build_object(
    'start', start_time::text,
    'end', end_time::text
  )
)
WHERE time_slots IS NULL;

-- Function to validate time slots
CREATE OR REPLACE FUNCTION validate_time_slots(slots jsonb)
RETURNS boolean AS $$
DECLARE
  slot jsonb;
  start_time time;
  end_time time;
  prev_end time;
BEGIN
  -- Check if slots is an array
  IF jsonb_typeof(slots) != 'array' THEN
    RETURN false;
  END IF;

  -- Check each slot
  FOR slot IN SELECT jsonb_array_elements(slots)
  LOOP
    -- Check if slot has required fields
    IF NOT (slot ? 'start' AND slot ? 'end') THEN
      RETURN false;
    END IF;

    -- Validate time format and range
    BEGIN
      start_time := (slot->>'start')::time;
      end_time := (slot->>'end')::time;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN false;
    END;

    -- Check if start < end
    IF start_time >= end_time THEN
      RETURN false;
    END IF;

    -- Check for overlaps with previous slots (assuming sorted)
    IF prev_end IS NOT NULL AND start_time < prev_end THEN
      RETURN false;
    END IF;

    prev_end := end_time;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate time slots
ALTER TABLE availabilities
ADD CONSTRAINT valid_time_slots 
CHECK (time_slots IS NULL OR validate_time_slots(time_slots));

-- Function to check if time slots overlap
CREATE OR REPLACE FUNCTION check_time_slots_overlap(slots jsonb)
RETURNS boolean AS $$
DECLARE
  slot1 jsonb;
  slot2 jsonb;
  start1 time;
  end1 time;
  start2 time;
  end2 time;
  i integer;
  j integer;
  slots_array jsonb[];
BEGIN
  -- Convert to array for easier iteration
  SELECT array_agg(value) INTO slots_array
  FROM jsonb_array_elements(slots);

  -- Check each pair of slots for overlap
  FOR i IN 1..array_length(slots_array, 1)
  LOOP
    FOR j IN i+1..array_length(slots_array, 1)
    LOOP
      slot1 := slots_array[i];
      slot2 := slots_array[j];
      
      start1 := (slot1->>'start')::time;
      end1 := (slot1->>'end')::time;
      start2 := (slot2->>'start')::time;
      end2 := (slot2->>'end')::time;
      
      -- Check for overlap
      IF (start1 < end2 AND end1 > start2) THEN
        RETURN true;
      END IF;
    END LOOP;
  END LOOP;

  RETURN false;
END;
$$ LANGUAGE plpgsql;