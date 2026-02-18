from sqlalchemy import Column, Integer, String, Float, Enum, TIMESTAMP, ForeignKey, JSON, Date
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="forensic_analyst")
    full_name = Column(String(100), nullable=True)
    email = Column(String(150), nullable=True)
    avatar_initials = Column(String(4), nullable=True)
    last_login = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Identity(Base):
    __tablename__ = "identities"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255))
    date_of_birth = Column(Date)
    id_number = Column(String(100), unique=True)
    face_embedding = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    identity_id = Column(Integer, ForeignKey("identities.id"))
    document_type = Column(String(50))
    file_path = Column(String(255))
    file_hash = Column(String(64), nullable=True, index=True)  # SHA-256 of file
    doc_metadata = Column(JSON)
    ocr_data = Column(JSON)
    authenticity_score = Column(Float, default=0.0)
    status = Column(Enum('pending', 'processing', 'completed', 'failed'), default='pending')
    upload_date = Column(TIMESTAMP, server_default=func.now())

class ForensicResult(Base):
    __tablename__ = "forensic_results"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    module_name = Column(String(100))
    result_data = Column(JSON)
    risk_level = Column(Enum('low', 'medium', 'high', 'critical'))
    confidence_score = Column(Float)
    analysis_date = Column(TIMESTAMP, server_default=func.now())
