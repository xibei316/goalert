-- +migrate Up notransaction
CREATE TABLE "public"."snooze_alert"
(
    "id" bigint NOT NULL ,
    "alert_id" bigint NOT NULL ,
    "last_ack_time" timestamp with time zone NOT NULL ,
    "service_id" uuid NOT NULL ,
    "delay_minutes" integer NOT NULL DEFAULT 10 ,
    CONSTRAINT "pk_public_snooze_alert" PRIMARY KEY ("id") ,
    CONSTRAINT "alert_snooze_index" UNIQUE ("alert_id") WITH (FILLFACTOR=100)
)
    WITH (
        FILLFACTOR = 100,
        OIDS = FALSE
        )
;

-- +migrate Down
DROP TABLE IF EXISTS snooze_alert;