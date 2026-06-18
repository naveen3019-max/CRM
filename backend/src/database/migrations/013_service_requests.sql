CREATE TABLE IF NOT EXISTS service_requests (
  id BIGINT  PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  lead_id BIGINT NULL,
  service_category VARCHAR(80) NOT NULL,
  problem_description TEXT NOT NULL,
  expected_solution TEXT NOT NULL,
  requirement_details TEXT NOT NULL,
  budget VARCHAR(120) NULL,
  urgency VARCHAR(255) NOT NULL DEFAULT 'normal',
  address TEXT NOT NULL,
  city VARCHAR(120) NOT NULL,
  area_pincode VARCHAR(20) NOT NULL,
  preferred_date DATE NULL,
  preferred_time VARCHAR(50) NULL,
  location_lat DECIMAL(10, 7) NULL,
  location_lng DECIMAL(10, 7) NULL,
  dynamic_answers_json JSON NULL,
  attachments_json JSON NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'submitted',
  assigned_worker_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT fk_service_requests_customer FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_service_requests_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL,
  CONSTRAINT fk_service_requests_worker FOREIGN KEY (assigned_worker_id) REFERENCES users (id) ON DELETE SET NULL
  -- index removed
  -- index removed
  -- index removed
  -- index removed
) ;
