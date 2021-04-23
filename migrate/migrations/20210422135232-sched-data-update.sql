-- +migrate Up
ALTER TABLE schedule_data ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

-- +migrate StatementBegin
CREATE OR REPLACE FUNCTION fn_schedule_data_update_ts() RETURNS TRIGGER AS
    $$
        BEGIN
            NEW.updated_at = clock_timestamp();
            RETURN NEW;
        END;
    $$ LANGUAGE 'plpgsql';
-- +migrate StatementEnd

CREATE TRIGGER trg_schedule_data_update_ts BEFORE UPDATE ON schedule_data
FOR EACH ROW
EXECUTE PROCEDURE fn_schedule_data_update_ts();

-- +migrate Down

ALTER TABLE schedule_data DROP COLUMN updated_at;

