-- +goose Up
-- +goose StatementBegin
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS delivery_method_clean_forceps INTEGER NOT NULL DEFAULT 0
        CHECK (delivery_method_clean_forceps IN (0, 1));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE assessments DROP COLUMN IF EXISTS delivery_method_clean_forceps;
-- +goose StatementEnd
