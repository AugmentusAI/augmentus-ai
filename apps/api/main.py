from fastapi import FastAPI, HTTPException, Depends, status, Form
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma
from passlib.context import CryptContext
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta
from typing import Union
import bcrypt  # add this import at the top of your file, near the others

from fastapi.security import OAuth2PasswordBearer
from fastapi import Security, Request

from openai import OpenAI
import os

from dotenv import load_dotenv
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Decode + verify JWT token
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(token: str = Security(oauth2_scheme)):
    email = verify_token(token)
    user = await db.user.find_unique(where={"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
db = Prisma()

SECRET_KEY = "augmentus-secret-key"  # in production, load from env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

@app.on_event("startup")
async def startup():
    await db.connect()


@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()


# Helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

MAX_BCRYPT_LENGTH = 72

def normalize_password(pw: Union[str, bytes]) -> str:
    """Ensure password is a UTF-8 string and truncate to bcrypt-safe length."""
    if isinstance(pw, bytes):
        pw = pw.decode("utf-8", errors="ignore")
    return pw[:MAX_BCRYPT_LENGTH]

def get_password_hash(password: str) -> str:
    password = normalize_password(password)
    # bcrypt needs bytes
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_password = normalize_password(plain_password)
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except ValueError:
        # Handle bad hashes gracefully
        return False


# Models
class UserIn(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.post("/register", response_model=Token)
async def register(user: UserIn):
    existing = await db.user.find_unique(where={"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = await db.user.create(
        data={"email": user.email, "password": hashed_password}
    )
    token = create_access_token({"sub": new_user.email})
    return {"access_token": token}


@app.post("/login", response_model=Token)
async def login(email: str = Form(...), password: str = Form(...)):
    user = await db.user.find_unique(where={"email": email})
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {"access_token": token}

@app.get("/me")
async def read_current_user(current_user=Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}

from fastapi import Body

@app.post("/prompts")
async def create_prompt(
    data: dict = Body(...),
    current_user=Depends(get_current_user)
):
    """Create a new prompt for the current user."""
    raw_prompt = data.get("rawPrompt") or data.get("content")

    if not raw_prompt:
        raise HTTPException(status_code=400, detail="Missing rawPrompt")

    prompt = await db.prompt.create(
        data={
            "rawPrompt": raw_prompt,
            "optimized": None,
            "userId": current_user.id,
        }
    )
    return prompt


@app.get("/prompts")
async def list_prompts(current_user=Depends(get_current_user)):
    """List all prompts for the current user."""
    prompts = await db.prompt.find_many(
        where={"userId": current_user.id},
        order={"createdAt": "desc"}
    )
    return prompts


@app.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int, current_user=Depends(get_current_user)):
    """Delete a prompt belonging to the current user."""
    prompt = await db.prompt.find_unique(where={"id": prompt_id})
    if not prompt or prompt.userId != current_user.id:
        raise HTTPException(status_code=404, detail="Prompt not found")

    await db.prompt.delete(where={"id": prompt_id})
    return {"message": "Deleted"}


@app.post("/optimize/{prompt_id}")
async def optimize_prompt(prompt_id: int, current_user=Depends(get_current_user)):
    """Take a saved raw prompt, send to LLM for optimization, and update DB."""
    prompt = await db.prompt.find_unique(where={"id": prompt_id})
    if not prompt or prompt.userId != current_user.id:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Build LLM prompt
    system_prompt = (
        "You are an expert prompt engineer. Improve the following human prompt "
        "for clarity, specificity, and optimal LLM performance, but keep its intent unchanged."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt.rawPrompt},
            ],
            temperature=0.7,
        )

        optimized = response.choices[0].message.content.strip()

        updated = await db.prompt.update(
            where={"id": prompt_id},
            data={"optimized": optimized},
        )

        return {"optimized": optimized, "id": updated.id}

    except Exception as e:
        print("Error optimizing prompt:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ping")
async def ping():
    return {"message": "pong"}