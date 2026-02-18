-- DataClone AI Database Schema

CREATE DATABASE IF NOT EXISTS dataclone_ai;
USE dataclone_ai;

-- Users table for system access
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'forensic_analyst', 'system') DEFAULT 'forensic_analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Identities table for cross-document correlation
CREATE TABLE IF NOT EXISTS identities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    date_of_birth DATE,
    id_number VARCHAR(100) UNIQUE,
    face_embedding JSON, -- Store face embeddings for similarity search
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identity_id INT,
    document_type VARCHAR(50), -- Passport, National ID, etc.
    file_path VARCHAR(255),
    doc_metadata JSON, -- EXIF data, capture device info
    ocr_data JSON, -- Extracted text fields
    authenticity_score FLOAT DEFAULT 0.0,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE SET NULL
);

-- Forensic Analysis Results
CREATE TABLE IF NOT EXISTS forensic_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT,
    module_name VARCHAR(100), -- Visual Forgery, Text Consistency, etc.
    result_data JSON, -- Heatmaps, specific findings
    risk_level ENUM('low', 'medium', 'high', 'critical'),
    confidence_score FLOAT,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Audit Logs for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Initial Admin (Password: admin123 - should be hashed in production)
INSERT INTO users (username, password_hash, role) VALUES ('admin', 'pbkdf2:sha256:260000$admin123', 'admin') ON DUPLICATE KEY UPDATE id=id;
