ALTER TABLE service_requests
  ADD COLUMN cancel_reason TEXT NULL AFTER assigned_worker_id;