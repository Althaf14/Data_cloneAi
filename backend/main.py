from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import uvicorn
import os
import shutil
import uuid
import database, models

# ─── Security Config ────────────────────────────────────────────────────────
SECRET_KEY = "dataclone-ai-super-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ─── App Setup ───────────────────────────────────────────────────────────────
app = FastAPI(title="DataClone AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    models.Base.metadata.create_all(bind=database.engine)
    # Seed default admin if no users exist
    db = database.SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            admin = models.User(
                username="admin",
                password_hash=pwd_context.hash("admin123"),
                role="admin",
                full_name="Forensic Admin",
                email="admin@dataclone.ai",
                avatar_initials="FA",
            )
            db.add(admin)
            db.commit()
            print("[Startup] Default admin created: username=admin, password=admin123")
    finally:
        db.close()


# ─── Load ML Modules ─────────────────────────────────────────────────────────
from preprocessor import DocumentPreprocessor
from forgery_detector import ForgeryDetector
from ocr_verifier import OCRVerifier
from biometrics import BiometricIntegrity
from identity_linker import IdentityLinker
from risk_scorer import RiskScorer
from document_validator import DocumentValidator

preprocessor = DocumentPreprocessor()
forgery_detector = ForgeryDetector()
ocr_verifier = OCRVerifier()
biometrics = BiometricIntegrity()
risk_scorer = RiskScorer()
document_validator = DocumentValidator()


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_initials: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


# ─── Auth Helpers ─────────────────────────────────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_auto_initials(full_name: str) -> str:
    if not full_name:
        return "??"
    parts = full_name.strip().split()
    return "".join(p[0] for p in parts[:2]).upper()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def user_to_dict(user: models.User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name or user.username,
        "email": user.email or "",
        "role": user.role,
        "avatar_initials": user.avatar_initials or get_auto_initials(user.full_name or user.username),
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ─── Auth Routes ─────────────────────────────────────────────────────────────
@app.post("/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    initials = get_auto_initials(req.full_name or req.username)
    user = models.User(
        username=req.username,
        password_hash=pwd_context.hash(req.password),
        full_name=req.full_name or req.username,
        email=req.email or "",
        avatar_initials=initials,
        role="forensic_analyst",
        last_login=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@app.post("/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Allow login with username OR email
    identifier = form_data.username  # OAuth2 form always sends it as 'username' field
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == identifier) | (models.User.email == identifier)
        )
        .first()
    )
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@app.get("/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return user_to_dict(current_user)


@app.put("/auth/me")
def update_me(req: UpdateProfileRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.email is not None:
        current_user.email = req.email
    if req.avatar_initials is not None:
        current_user.avatar_initials = req.avatar_initials
    elif req.full_name is not None:
        current_user.avatar_initials = get_auto_initials(req.full_name)
    db.commit()
    db.refresh(current_user)
    return user_to_dict(current_user)


@app.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = pwd_context.hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@app.get("/auth/user-stats")
def get_user_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    """Per-user stats (uses global stats since docs aren't user-scoped yet)."""
    total_scans = db.query(models.Document).count()
    completed = db.query(models.Document).filter(models.Document.status == "completed").count()
    forgeries = db.query(models.Document).filter(
        models.Document.authenticity_score < 0.5,
        models.Document.status == "completed"
    ).count()
    authentic = completed - forgeries
    success_rate = round((authentic / completed * 100), 1) if completed > 0 else 0.0
    return {
        "total_scans": total_scans,
        "forgeries_found": forgeries,
        "authentic_docs": authentic,
        "success_rate": success_rate,
        "completed": completed,
    }


# ─── Document Routes ──────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    file_id = str(uuid.uuid4())
    upload_dir = "data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{file_id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_record = models.Document(
        file_path=file_path,
        document_type="unknown",
        status="processing",
        authenticity_score=0.0
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # ── Document type validation ──────────────────────────────────────────────
    print(f"[DEBUG] Analyzing file: {file_path}")
    validation = document_validator.validate(file_path)
    print(f"[DEBUG] Validation result: {validation}")
    if not validation["is_valid"]:
        doc_record.status = "failed"
        doc_record.document_type = "rejected"
        db.commit()
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_document",
                "message": validation["reason"],
                "category": validation["document_category"],
                "confidence": validation["confidence"],
                "details": validation["details"],
            }
        )

    try:
        try:
            import cv2
            enhanced_path = f"{file_path}_enhanced.jpg"
            enhanced_img = preprocessor.enhance_image(file_path)
            cv2.imwrite(enhanced_path, enhanced_img)
        except Exception as preprocess_err:
            print(f"[Preprocessor] Skipping enhancement: {preprocess_err}")
            enhanced_path = file_path

        f_results = forgery_detector.detect_tampering(enhanced_path)
        o_results = ocr_verifier.extract_text(enhanced_path)
        o_verification = ocr_verifier.verify_consistency(o_results)
        o_results["is_consistent"] = o_verification["is_consistent"]
        o_results["consistency_findings"] = o_verification["findings"]

        linker = IdentityLinker(db)
        l_results = linker.find_duplicates(
            o_results["fields"],
            file_path=file_path,
            current_doc_id=doc_record.id,
        )
        # Store file hash on document record
        if hasattr(linker, '_current_file_hash') and linker._current_file_hash:
            doc_record.file_hash = linker._current_file_hash

        module_results = {
            "forgery": f_results,
            "ocr": o_verification,
            "ocr_data": o_results,  # Pass full OCR data for risk scoring
            "linkage": {"duplicates": l_results}
        }
        final_risk = risk_scorer.calculate_risk(module_results)

        raw_text = o_results.get("raw_text", "").upper()
        if "PASSPORT" in raw_text:
            doc_record.document_type = "passport"
        elif "NATIONAL" in raw_text or "IDENTITY" in raw_text:
            doc_record.document_type = "national_id"
        else:
            doc_record.document_type = "unknown"

        doc_record.ocr_data = o_results
        doc_record.authenticity_score = final_risk["authenticity_score"]
        doc_record.status = "completed"
        db.commit()

        forensic_record = models.ForensicResult(
            document_id=doc_record.id,
            module_name="full_pipeline",
            result_data={
                "forgery": f_results,
                "ocr": o_verification,
                "linkage": {"duplicates_found": len(l_results)}
            },
            risk_level=final_risk["risk_level"],
            confidence_score=f_results.get("confidence", 0.0)
        )
        db.add(forensic_record)
        db.commit()

        return {
            "id": file_id,
            "document_id": doc_record.id,
            "filename": file.filename,
            "analysis": {
                "risk": final_risk,
                "forensics": f_results,
                "ocr": o_results,
                "identity": {
                    "duplicates_found": len(l_results),
                    "duplicates": l_results,
                }
            }
        }

    except Exception as e:
        try:
            doc_record.status = "failed"
            db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
def get_stats(db: Session = Depends(database.get_db)):
    total_scans = db.query(models.Document).count()
    completed = db.query(models.Document).filter(models.Document.status == "completed").count()
    forgeries = db.query(models.Document).filter(
        models.Document.authenticity_score < 0.5,
        models.Document.status == "completed"
    ).count()
    authentic = completed - forgeries
    authenticity_pct = round((authentic / completed * 100), 1) if completed > 0 else 0.0
    identities = db.query(models.Identity).count()
    return {
        "total_scans": total_scans,
        "authenticity_pct": authenticity_pct,
        "forgeries_detected": forgeries,
        "identities_monitored": identities,
        "completed": completed,
    }


@app.get("/recent-scans")
def get_recent_scans(limit: int = 5, db: Session = Depends(database.get_db)):
    docs = (
        db.query(models.Document)
        .order_by(models.Document.upload_date.desc())
        .limit(limit)
        .all()
    )
    results = []
    for doc in docs:
        forensic = (
            db.query(models.ForensicResult)
            .filter(models.ForensicResult.document_id == doc.id)
            .order_by(models.ForensicResult.analysis_date.desc())
            .first()
        )
        results.append({
            "id": doc.id,
            "filename": os.path.basename(doc.file_path) if doc.file_path else "Unknown",
            "document_type": doc.document_type,
            "status": doc.status,
            "authenticity_score": doc.authenticity_score,
            "risk_level": forensic.risk_level if forensic else "unknown",
            "confidence_score": forensic.confidence_score if forensic else None,
            "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
        })
    return results


@app.get("/linkage/network")
def get_identity_network(db: Session = Depends(database.get_db)):
    linker = IdentityLinker(db)
    return linker.build_network()


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
