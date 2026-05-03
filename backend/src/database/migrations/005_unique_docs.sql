-- Add unique constraint to company_documents to allow replacing documents
ALTER TABLE company_documents ADD UNIQUE KEY unique_company_doc (company_id, doc_type);
