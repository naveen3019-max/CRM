-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id INT  PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  industry VARCHAR(255) DEFAULT 'Other',
  gst_number VARCHAR(15),
  phone VARCHAR(20),
  address TEXT,
  status VARCHAR(255) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

-- Company Documents Table
CREATE TABLE IF NOT EXISTS company_documents (
  id INT  PRIMARY KEY,
  company_id INT NOT NULL,
  doc_type VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
