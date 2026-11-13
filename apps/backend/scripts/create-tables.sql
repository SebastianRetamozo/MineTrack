-- Create equipment_types table
CREATE TABLE IF NOT EXISTS "equipment_types" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "maintenance_interval_hours" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS "equipment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(255) NOT NULL UNIQUE,
    "equipment_type_id" UUID NOT NULL REFERENCES "equipment_types"("id"),
    "horometer" INTEGER NOT NULL DEFAULT 0,
    "last_maintenance_horometer" INTEGER NOT NULL DEFAULT 0,
    "applied_interval_hours" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create maintenance table
CREATE TABLE IF NOT EXISTS "maintenance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL REFERENCES "equipment"("id") ON DELETE CASCADE,
    "horometer_at_maintenance" INTEGER NOT NULL,
    "description" TEXT,
    "performed_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "equipment_equipment_type_id_idx" ON "equipment"("equipment_type_id");
CREATE INDEX IF NOT EXISTS "equipment_code_idx" ON "equipment"("code");
CREATE INDEX IF NOT EXISTS "maintenance_equipment_id_idx" ON "maintenance"("equipment_id");
CREATE INDEX IF NOT EXISTS "maintenance_performed_at_idx" ON "maintenance"("performed_at");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_equipment_types_updated_at ON "equipment_types";
CREATE TRIGGER update_equipment_types_updated_at
    BEFORE UPDATE ON "equipment_types"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON "equipment";
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON "equipment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();