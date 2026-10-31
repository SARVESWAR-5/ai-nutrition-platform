-- ==============================================================================
-- PERSONAL AI NUTRITION PLATFORM — COMPLETE DATABASE SCHEMA
-- Compatible with PostgreSQL 15+ / Supabase
-- Implements Row Level Security (RLS) on every user table
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER, -- Must be confirmed, never assumed
    sex TEXT CHECK (sex IN ('male', 'female', 'other')),
    height_cm NUMERIC(5, 2) NOT NULL,
    current_weight_kg NUMERIC(5, 2) NOT NULL,
    target_weight_kg NUMERIC(5, 2),
    fitness_goal TEXT CHECK (fitness_goal IN ('fat_loss', 'muscle_gain', 'recomposition', 'maintenance')),
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very_active', 'extra_active')),
    gym_frequency TEXT,
    workout_type TEXT,
    daily_step_target INTEGER DEFAULT 10000,
    dietary_preferences TEXT[] DEFAULT '{}',
    food_allergies TEXT[] DEFAULT '{}',
    foods_avoided TEXT[] DEFAULT ARRAY['whey protein'],
    meal_schedule JSONB DEFAULT '{"breakfast": "08:30", "lunch": "13:00", "dinner": "19:00"}'::jsonb,
    wake_time TIME DEFAULT '06:30',
    sleep_time TIME DEFAULT '23:00',
    preferred_dinner_cutoff TIME DEFAULT '19:00',
    food_budget TEXT,
    cooking_ability TEXT CHECK (cooking_ability IN ('cook', 'pg_food', 'mess', 'restaurants')),
    timezone TEXT DEFAULT 'Asia/Kolkata',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Nutrition Goals
CREATE TABLE IF NOT EXISTS public.nutrition_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calories NUMERIC(7, 2) NOT NULL DEFAULT 2400.00,
    protein_g NUMERIC(6, 2) NOT NULL DEFAULT 150.00,
    carbs_g NUMERIC(6, 2) NOT NULL DEFAULT 290.00,
    fat_g NUMERIC(6, 2) NOT NULL DEFAULT 70.00,
    fibre_g NUMERIC(6, 2) NOT NULL DEFAULT 35.00,
    water_ml NUMERIC(7, 2) NOT NULL DEFAULT 3000.00,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Nutrition Goal History (Audit of target revisions)
CREATE TABLE IF NOT EXISTS public.nutrition_goal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES public.nutrition_goals(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_targets JSONB NOT NULL,
    new_targets JSONB NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Food Database References (Cached lookups from USDA, IFCT, etc.)
CREATE TABLE IF NOT EXISTS public.food_database_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL, -- 'USDA', 'IFCT', 'OPEN_FOOD_FACTS', 'CUSTOM'
    source_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    preparation_state TEXT DEFAULT 'raw', -- 'raw', 'cooked', etc.
    edible_portion_pct NUMERIC(5, 2) DEFAULT 100.00,
    retrieval_timestamp TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, source_id, preparation_state)
);

-- 6. Nutrient Composition Records (Per 100g edible portion)
CREATE TABLE IF NOT EXISTS public.nutrient_composition_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_ref_id UUID NOT NULL REFERENCES public.food_database_references(id) ON DELETE CASCADE,
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fibre_g NUMERIC(6, 2) NOT NULL,
    sugars_g NUMERIC(6, 2),
    added_sugars_g NUMERIC(6, 2),
    saturated_fat_g NUMERIC(6, 2),
    monounsaturated_fat_g NUMERIC(6, 2),
    polyunsaturated_fat_g NUMERIC(6, 2),
    trans_fat_g NUMERIC(6, 2),
    cholesterol_mg NUMERIC(7, 2),
    sodium_mg NUMERIC(7, 2),
    potassium_mg NUMERIC(7, 2),
    calcium_mg NUMERIC(7, 2),
    iron_mg NUMERIC(7, 2),
    magnesium_mg NUMERIC(7, 2),
    zinc_mg NUMERIC(7, 2),
    phosphorus_mg NUMERIC(7, 2),
    vitamin_a_ug NUMERIC(7, 2),
    vitamin_c_mg NUMERIC(7, 2),
    vitamin_d_ug NUMERIC(7, 2),
    vitamin_e_mg NUMERIC(7, 2),
    vitamin_k_ug NUMERIC(7, 2),
    thiamin_mg NUMERIC(6, 3),
    riboflavin_mg NUMERIC(6, 3),
    niacin_mg NUMERIC(6, 3),
    vitamin_b6_mg NUMERIC(6, 3),
    folate_ug NUMERIC(7, 2),
    vitamin_b12_ug NUMERIC(6, 3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Custom Foods (User-created food items)
CREATE TABLE IF NOT EXISTS public.custom_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serving_size_g NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    serving_unit TEXT DEFAULT 'g',
    preparation_state TEXT DEFAULT 'cooked',
    nutrients JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Recipes & Ingredients
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    instructions TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    serving_yield NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    serving_unit TEXT DEFAULT 'serving',
    is_favourite BOOLEAN DEFAULT false,
    calculated_nutrients_per_serving JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC(7, 2) NOT NULL,
    unit TEXT NOT NULL,
    food_ref_id UUID REFERENCES public.food_database_references(id) ON DELETE SET NULL,
    custom_food_id UUID REFERENCES public.custom_foods(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Food Diaries (Daily aggregation container)
CREATE TABLE IF NOT EXISTS public.food_diaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    diary_date DATE NOT NULL, -- In Asia/Kolkata timezone
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, diary_date)
);

-- 10. Food Log Entries (Individual confirmed meal events)
CREATE TABLE IF NOT EXISTS public.food_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diary_id UUID NOT NULL REFERENCES public.food_diaries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meal_category TEXT NOT NULL CHECK (meal_category IN (
        'early_morning', 'breakfast', 'mid_morning_snack', 'lunch',
        'evening_snack', 'pre_workout', 'post_workout', 'dinner', 'other'
    )),
    food_name TEXT NOT NULL,
    quantity NUMERIC(7, 2) NOT NULL,
    unit TEXT NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL,
    preparation_method TEXT,
    is_cooked BOOLEAN DEFAULT true,
    is_estimated BOOLEAN DEFAULT false,
    confidence_label TEXT DEFAULT 'verified',
    data_source TEXT DEFAULT 'USDA',
    data_source_id TEXT,
    -- Confirmed snapshot of nutrients so future db changes do NOT alter past intake
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fibre_g NUMERIC(6, 2) NOT NULL,
    micronutrients JSONB DEFAULT '{}'::jsonb,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Ingredient-Level Entry Details (Dishes broken down into constituents)
CREATE TABLE IF NOT EXISTS public.ingredient_level_entry_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_log_entry_id UUID NOT NULL REFERENCES public.food_log_entries(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity NUMERIC(7, 2) NOT NULL,
    unit TEXT NOT NULL,
    is_cooking_fat BOOLEAN DEFAULT false,
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fibre_g NUMERIC(6, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Daily Water Logs
CREATE TABLE IF NOT EXISTS public.daily_water_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    amount_ml NUMERIC(7, 2) NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Exercise Sessions
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    exercise_name TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    estimated_calories_burned NUMERIC(6, 2),
    distance_km NUMERIC(6, 2),
    steps INTEGER,
    sets_reps_data JSONB,
    notes TEXT,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Weight and Body Measurements
CREATE TABLE IF NOT EXISTS public.weight_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ NOT NULL,
    weight_kg NUMERIC(5, 2) NOT NULL,
    waist_circumference_cm NUMERIC(5, 2),
    body_fat_percentage NUMERIC(4, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Meal Plans & Planned Items (Strictly separate from consumed food)
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    plan_type TEXT CHECK (plan_type IN ('daily', 'weekly', 'template', 'custom')),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.planned_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    scheduled_date DATE,
    meal_category TEXT NOT NULL,
    scheduled_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.planned_meal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planned_meal_id UUID NOT NULL REFERENCES public.planned_meals(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    quantity NUMERIC(7, 2) NOT NULL,
    unit TEXT NOT NULL,
    preparation_method TEXT,
    estimated_calories NUMERIC(7, 2) NOT NULL,
    estimated_protein_g NUMERIC(6, 2) NOT NULL,
    estimated_carbs_g NUMERIC(6, 2) NOT NULL,
    estimated_fat_g NUMERIC(6, 2) NOT NULL,
    estimated_fibre_g NUMERIC(6, 2) NOT NULL,
    is_logged_as_eaten BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Recommendation Conversations & Messages
CREATE TABLE IF NOT EXISTS public.recommendation_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recommendation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.recommendation_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    structured_recommendations JSONB,
    tool_calls JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Saved Recommendations & Favourites
CREATE TABLE IF NOT EXISTS public.saved_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Cached AI Insights
CREATE TABLE IF NOT EXISTS public.cached_ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_date DATE NOT NULL,
    summary_text TEXT NOT NULL,
    recommendations_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, insight_date)
);

-- 19. Idempotency Keys (Prevent double-submission on mutations)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    resource_id UUID,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict enforcement: auth.uid() = user_id on all operations
-- ==============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_goal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_level_entry_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Shared public reference tables (Read-only for authenticated users)
ALTER TABLE public.food_database_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrient_composition_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on food_database_references" ON public.food_database_references
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public read on nutrient_composition_records" ON public.nutrient_composition_records
    FOR SELECT TO authenticated USING (true);

-- User Profiles
CREATE POLICY "Users can manage own profile" ON public.user_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Macro helper for standard user_id based tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'nutrition_goals', 'nutrition_goal_history', 'custom_foods', 'recipes',
            'food_diaries', 'food_log_entries', 'daily_water_logs',
            'exercise_sessions', 'weight_measurements', 'meal_plans',
            'recommendation_conversations', 'recommendation_messages',
            'saved_recommendations', 'cached_ai_insights', 'idempotency_keys'
        ])
    LOOP
        EXECUTE format('
            CREATE POLICY "Users can manage own %I" ON public.%I
                FOR ALL TO authenticated
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id);
        ', tbl, tbl);
    END LOOP;
END $$;

-- Recipe Ingredients RLS (Linked through recipe owner)
CREATE POLICY "Users can manage recipe ingredients" ON public.recipe_ingredients
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Ingredient Details RLS (Linked through food log owner)
CREATE POLICY "Users can manage ingredient details" ON public.ingredient_level_entry_details
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.food_log_entries e WHERE e.id = food_log_entry_id AND e.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.food_log_entries e WHERE e.id = food_log_entry_id AND e.user_id = auth.uid()));

-- Planned Meals & Planned Items RLS (Linked through meal plan owner)
CREATE POLICY "Users can manage planned meals" ON public.planned_meals
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND p.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND p.user_id = auth.uid()));

CREATE POLICY "Users can manage planned meal items" ON public.planned_meal_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.planned_meals pm
        JOIN public.meal_plans p ON p.id = pm.meal_plan_id
        WHERE pm.id = planned_meal_id AND p.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.planned_meals pm
        JOIN public.meal_plans p ON p.id = pm.meal_plan_id
        WHERE pm.id = planned_meal_id AND p.user_id = auth.uid()
    ));

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_food_diaries_user_date ON public.food_diaries(user_id, diary_date);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_diary ON public.food_log_entries(diary_id);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_user_date ON public.food_log_entries(user_id, consumed_at);
CREATE INDEX IF NOT EXISTS idx_daily_water_logs_user_date ON public.daily_water_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user_date ON public.exercise_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_weight_measurements_user ON public.weight_measurements(user_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_food_db_source_id ON public.food_database_references(source, source_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_user_key ON public.idempotency_keys(user_id, idempotency_key);
