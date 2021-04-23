-- +migrate Up notransaction
ALTER TYPE enum_outgoing_messages_type ADD VALUE IF NOT EXISTS 'oncall_notification';

BEGIN;
UPDATE engine_processing_versions
SET version = 4
WHERE type_id = 'schedule';

ALTER TABLE outgoing_messages ADD COLUMN schedule_id UUID;
COMMIT;

-- +migrate Down
LOCK TABLE outgoing_messages;

DELETE FROM outgoing_messages
WHERE message_type = 'oncall_notification';

ALTER TABLE outgoing_messages DROP COLUMN schedule_id UUID;

UPDATE engine_processing_versions
SET version = 3
WHERE id = 'schedule';
