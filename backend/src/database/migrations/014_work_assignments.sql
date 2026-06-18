-- Create work_assignments table for tracking work assignments from admin/sales to workers
CREATE TABLE IF NOT EXISTS work_assignments (
  id INT  PRIMARY KEY,
  worker_id INT NOT NULL,
  assigned_by_id INT NOT NULL,
  customer_id INT,
  service_title VARCHAR(255) NOT NULL,
  service_category VARCHAR(100),
  description TEXT,
  location VARCHAR(500),
  city VARCHAR(100),
  area_pincode VARCHAR(20),
  budget DECIMAL(12, 2),
  priority VARCHAR(255) DEFAULT 'normal',
  preferred_date DATE,
  preferred_time TIME,
  additional_instructions TEXT,
  attachments_json JSON,
  status VARCHAR(255) DEFAULT 'pending',
  worker_response_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ,
  
  CONSTRAINT fk_worker_id FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
  -- index removed
  -- index removed
  -- index removed
  -- index removed
  -- index removed
);
