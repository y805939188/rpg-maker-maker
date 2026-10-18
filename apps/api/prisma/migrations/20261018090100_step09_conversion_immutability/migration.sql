CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON "AiConversion" FOR EACH ROW EXECUTE FUNCTION tileset_immutable();
ALTER TABLE "AiConversion" ADD CONSTRAINT "AiConversion_outputs_array" CHECK (jsonb_typeof("outputs") = 'array');
