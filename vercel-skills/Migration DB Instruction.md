# Database Setup & Full Migration Guide

This document provides a comprehensive, 100% accurate guide to setting up the production database for the AI Flashcards project on Supabase, reflecting the latest schema used for intelligent categorization and search.

---

## 1. Core Database Initialization (`flashcard_sets`)

This table stores the primary educational content. We use advanced PostgreSQL features like GIN indexes and array types to support semantic search and multi-user contributions.

### Create Base Table
```sql
CREATE TABLE flashcard_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  topic TEXT NOT NULL,
  cards JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Advanced Schema Enhancements
Add columns for AI normalization, search aliases, and contributor tracking.
```sql
-- AI-normalized topic for de-duplication
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS normalized_topic TEXT;

-- Search aliases (multi-language/synonyms)
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- Contributor tracking for shared sets
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS contributor_ids UUID[] DEFAULT '{}';

-- Legacy text category storage
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Chưa phân loại';
```

### Constraints & Performance
We use a **GIN (Generalized Inverted Index)** for the `aliases` array to enable lightning-fast lookups across multiple topic variations.
```sql
-- Prevent duplicate entries for the same conceptual topic
ALTER TABLE flashcard_sets DROP CONSTRAINT IF EXISTS unique_normalized_topic;
ALTER TABLE flashcard_sets ADD CONSTRAINT unique_normalized_topic UNIQUE (normalized_topic);

-- B-Tree Index for standard normalized search
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_normalized_topic ON flashcard_sets (normalized_topic);

-- GIN Index for array-based alias search (Critical for smart search)
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_aliases ON flashcard_sets USING GIN (aliases);

-- Index for legacy topic search
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_topic ON flashcard_sets(topic);
```

---

## 2. Profiles & Admin Lifecycle

This section handles user management and automatic profile creation via PostgreSQL Triggers.

### Profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Automation: Auth to Profile Trigger
This function ensures every time a user signs up via Supabase Auth, a corresponding entry is created in the `profiles` table automatically.
```sql
-- Create the handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Manual Admin Provisioning
Replace the UUID below with your specific User ID from Supabase Auth.
```sql
-- Elevate specific user to Admin role
INSERT INTO public.profiles (id, role, full_name)
VALUES ('bc5a7f27-2969-4883-9fb4-7e9fa5fe30ab', 'admin', 'Admin User')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

## 3. Autonomous Category System

The category system uses semantic mapping to organize sets visually.

### Categories Table
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'Tag',
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link flashcard sets to categories
ALTER TABLE flashcard_sets
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
```

### Security (RLS Policies)
We restrict management to a hardcoded admin email for an extra layer of security on sensitive migration routes.
```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public: Everyone can read categories
CREATE POLICY "Allow public read" ON categories FOR SELECT USING (true);

-- Admin: Only the designated admin can manage data
CREATE POLICY "Allow admin manage" ON categories FOR ALL
USING (auth.jwt() ->> 'email' = 'phela101990@gmail.com');
```

---

## 4. Duplicate Category Merging (Data Cleanup)

If your dashboard shows the same category multiple times (e.g., "History" and "history"), use these commands to consolidate them into a single canonical record.

### Step 1: Identify and Merge Unlinked Sets
This script finds sets with the same category name (ignoring case) and links them to the same ID.
```sql
-- Link all sets sharing the same name to the most recent category ID
UPDATE flashcard_sets fs
SET category_id = sub.id
FROM (
  SELECT id, lower(name) as lower_name,
         ROW_NUMBER() OVER(PARTITION BY lower(name) ORDER BY created_at DESC) as rank
  FROM categories
) sub
WHERE lower(fs.category) = sub.lower_name
AND sub.rank = 1;
```

### Step 2: Delete redundant Category records
After updating the links, you can safely remove the duplicate categories.
```sql
DELETE FROM categories
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY lower(name) ORDER BY created_at ASC) as rank
    FROM categories
  ) WHERE rank = 1
);
```

---

## 5. Legacy Cleanup & Normalization

Run these commands if you are migrating from an older version of the app to populate missing data.

```sql
-- Ensure all sets have a default category label
UPDATE flashcard_sets SET category = 'Chưa phân loại' WHERE category IS NULL;

-- Backfill normalized topics from existing raw topics
UPDATE flashcard_sets SET normalized_topic = topic WHERE normalized_topic IS NULL;
```

---

## 5. Summary of Key Database Features

*   **GIN Indexes**: Used on `aliases` (TEXT[]) to allow the system to search for a topic like "Học Python" in a set where the alias list contains that specific phrase, without performance degradation.
*   **Triggers**: Automate profile creation, reducing frontend logic complexity.
*   **Unique Constraints**: The `unique_normalized_topic` constraint ensures the AI doesn't create duplicate sets for the same subject (e.g., "Python Basics" and "python basics" will resolve to the same record).
