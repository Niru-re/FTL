from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, Token, UserOut
from ..auth import (
    verify_password, create_access_token, get_current_user,
    require_admin, require_doctor, require_nurse
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    email_raw = login_req.email.strip().lower()
    
    # Map common aliases if typed without @healthnet.demo
    email_map = {
        "admin": "admin@healthnet.demo",
        "doctor": "doctor@healthnet.demo",
        "nurse": "nurse@healthnet.demo",
        "admin@healthnet.com": "admin@healthnet.demo",
        "doctor@healthnet.com": "doctor@healthnet.demo",
        "nurse@healthnet.com": "nurse@healthnet.demo",
        "admin@demo.com": "admin@healthnet.demo",
        "doctor@demo.com": "doctor@healthnet.demo",
        "nurse@demo.com": "nurse@healthnet.demo"
    }
    email_clean = email_map.get(email_raw, email_raw)

    user = db.query(User).filter(User.email == email_clean).first()
    if not user and not any(c in email_clean for c in ["'", '"', ';', ' ', '--', '=']):
        # Fallback partial match
        if "nurse" in email_clean:
            user = db.query(User).filter(User.email == "nurse@healthnet.demo").first()
        elif "doc" in email_clean:
            user = db.query(User).filter(User.email == "doctor@healthnet.demo").first()
        elif "admin" in email_clean:
            user = db.query(User).filter(User.email == "admin@healthnet.demo").first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please use nurse@healthnet.demo, doctor@healthnet.demo, or admin@healthnet.demo"
        )

    if not verify_password(login_req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Passwords are: nurse123, doctor123, or admin123"
        )

    hosp_name = user.hospital.name if user.hospital else "Central Command"
    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "hospital_id": user.hospital_id,
        "hospital_name": hosp_name,
        "user_id": user.id
    }

@router.post("/demo-login/{role}", response_model=Token)
def demo_login(role: str, db: Session = Depends(get_db)):
    role_upper = role.upper()
    role_map = {
        "NURSE": "nurse@healthnet.demo",
        "DOCTOR": "doctor@healthnet.demo",
        "ADMIN": "admin@healthnet.demo"
    }
    target_email = role_map.get(role_upper)
    if not target_email:
        raise HTTPException(status_code=400, detail=f"Invalid demo role: {role}. Choose NURSE, DOCTOR, or ADMIN")

    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found. Please re-seed database.")

    hosp_name = user.hospital.name if user.hospital else "Central Command"
    token_data = {"sub": user.email, "role": user.role, "id": user.id}
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "hospital_id": user.hospital_id,
        "hospital_name": hosp_name,
        "user_id": user.id
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
