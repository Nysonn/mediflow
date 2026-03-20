-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assessed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Model input fields
    duration_labour_min NUMERIC(10, 2) NOT NULL,
    hiv_status_num NUMERIC(3, 1) NOT NULL CHECK (hiv_status_num IN (0, 1)),
    parity_num INTEGER NOT NULL CHECK (parity_num >= 0),
    booked_unbooked INTEGER NOT NULL CHECK (booked_unbooked IN (0, 1)),
    delivery_method_clean_lscs INTEGER NOT NULL CHECK (delivery_method_clean_lscs IN (0, 1)),

    -- Model output fields
    prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
    probability_no_pph NUMERIC(5, 4) NOT NULL,
    probability_severe_pph NUMERIC(5, 4) NOT NULL,
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('LOW', 'HIGH')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_patient_id ON assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assessments_assessed_by ON assessments(assessed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_risk_level ON assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS assessments;
-- +goose StatementEnd
