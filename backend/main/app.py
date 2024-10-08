from openai import OpenAI
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm.attributes import flag_modified
from fastapi.responses import JSONResponse,FileResponse,StreamingResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from .database import SessionLocal, engine, Base
from .models import User, NormalUser, Sessions,Organizations
from .schemas import UserCreate, UserResponse, NormalUserCreate, NormalUserResponse, SessionCreate, SessionResponse,Prompt,TalkRequest,SessionData,UserLogin
from fastapi_jwt_auth import AuthJWT
import secrets
from fastapi_jwt_auth.exceptions import AuthJWTException
from .MyEncoder import MyEncoder
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from collections import Counter
from urllib.parse import quote
import json
import uuid
import PyPDF2
import io
import re
import os
from datetime import datetime,timezone
from typing import List, Dict,Any
history = []
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"],
    allow_headers=["*"],
    max_age=86400
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)

# Using a fixed secret key for consistent JWT generation
secret_key = secrets.token_hex(32)

class Settings(BaseModel):
    authjwt_secret_key: str = secret_key

@AuthJWT.load_config
def get_config():
    return Settings()

@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_current_user_id(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    db_user = db.query(User).filter(User.username == current_user).first()
    if db_user:
        return current_user,db_user, True
    db_normal_user = db.query(NormalUser).filter(NormalUser.username == current_user).first()
    if db_normal_user:
        return current_user,db_normal_user, False
    raise HTTPException(status_code=404, detail="User not found")
# class Prompt(BaseModel):
#     role: str
#     content: str
# class TalkRequest(BaseModel):
#     model:str
#     message: List[Prompt] 
#     session_id: str
#     promptFilelist: List[Dict]
# class SessionData(BaseModel):
#     session_model: str
#     prompts: List[Prompt]
#     promptFilelist: List[Dict] = []

chat_sessions: Dict[str, SessionData] = {}

def check_duplicate_file(file_info_list, filename):
    for file_info in file_info_list:
        if file_info['filename'] == filename:
            return True
    return False

def check_text_length(text: str, max_length: int = 4096):
    """Check if the text exceeds the maximum length allowed and raise an HTTP exception."""
    if len(text) > max_length:
        raise HTTPException(status_code=400, detail=f"File size exceeds the limit of {max_length} bytes.")
    
@app.post("/api/generate")
async def chatbot_talk(user_input: TalkRequest,db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    user_id=user_info.id
    role = "user_id" if is_admin else "normal_user_id"
    old_session = db.query(Sessions).filter(getattr(Sessions, role) == user_id).first()

    if old_session:
        old_session_data = json.loads(old_session.prompts)
        session_dict = old_session_data.get(user_input.session_id, None)
        if session_dict:
            session_data = SessionData(**session_dict)
        else:
            session_data = SessionData(session_model=user_input.model, prompts=[], promptFilelist={})
    else:
        raise HTTPException(status_code=404, detail="Session not found")

    print(session_data, "session_data")
    session_data.prompts = user_input.message
    
    response = client.chat.completions.create(
        model=user_input.model,
        messages=session_data.prompts,
        temperature=0.5,
        top_p=1,
        max_tokens=2048,
        stream=False
    )
    bot_response = response.choices[0].message.content

    session_data.prompts.append({"role": "assistant", "content": bot_response})
    session_data.session_model = user_input.model
    session_data.promptFilelist = user_input.promptFilelist

    new_chat_session = {user_input.session_id: session_data.dict()}
    session_data_json = json.dumps(new_chat_session, cls=MyEncoder, indent=4)

    old_session_data.update(new_chat_session)
    merged_session_data_json = json.dumps(old_session_data, cls=MyEncoder, indent=4)
    old_session.prompts = merged_session_data_json
    db.commit()
    db.refresh(old_session)

    # chat_sessions[user_input.session_id] = session_data
    return {"content": bot_response}

# Model list options
class ModelKeyPair(BaseModel):
    model: str
model_key_pairs: List[ModelKeyPair] = [
    {"model": "google/gemma-7b"},
    {"model": "meta/llama3-70b-instruct"},
    {"model": "microsoft/phi-3-mini-128k-instruct"},
]

# model list
@app.get("/api/models-keys", response_model=List[ModelKeyPair])
async def get_model_key_pairs():
    global history
    history = []
    return model_key_pairs

# clear chat history
@app.post("/api/clear-history/{session_id}")
async def clear_chat_history(session_id: str,db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    user_id=user_info.id
    role = "user_id" if is_admin else "normal_user_id"
    sessions = db.query(Sessions).filter(getattr(Sessions, role) == user_id).first()
    if not sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    res_sessions_data = json.loads(sessions.prompts)
    if session_id in res_sessions_data:
        # Reset the session prompts to an empty list
        res_sessions_data[session_id]["prompts"]= []
        sessions.prompts=json.dumps(res_sessions_data, cls=MyEncoder, indent=4)
        db.commit()
        db.refresh(sessions)
        return {"message": f"Chat history for session {session_id} cleared successfully."}
    else:
        # If the session ID does not exist, an error is returned.
        raise HTTPException(status_code=404, detail="Session not found.")
    
# Query session by Id
@app.get("/api/history/{session_id}", response_model=SessionData)
async def get_chat_history(session_id: str,db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    user_id=user_info.id
    role = "user_id" if is_admin else "normal_user_id"
    sessions = db.query(Sessions).filter(getattr(Sessions, role) == user_id).first()
    res_sessions_data=json.loads(sessions.prompts) 
    if session_id in res_sessions_data:
        return res_sessions_data[session_id]
    else:
        raise HTTPException(status_code=404, detail="Chat history not found.")

@app.post("/api/create-session")
async def create_session(request: Request ,db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    user_id=user_info.id
    print('current-user:'+current_user)
    body = await request.json()
    model = body.get("model")
    # user_id=body.get("userId")
    if not model:
        raise HTTPException(status_code=400, detail="Model is required")
    # Generate a unique session_id, for example by using UUID
    import uuid
    prompt_id = str(uuid.uuid4())
    default_session_prompts = [
        {"role": "system", "content": "Hello there, this is X bot!"}
    ]
        # Initialize variables
    role = "user_id" if is_admin else "normal_user_id"
    # Create session data
    session_data = SessionData(session_model=model, prompts=default_session_prompts)
    new_chat_session = {prompt_id: session_data.dict()}
    session_data_json = json.dumps(new_chat_session, cls=MyEncoder, indent=4)

    # Check for existing session and update or create a new one
    old_session = db.query(Sessions).filter(getattr(Sessions, role) == user_id).first()
    if old_session:
        old_session_data = json.loads(old_session.prompts)
        # Merge new session data with existing data
        old_session_data.update(new_chat_session)
        merged_session_data_json = json.dumps(old_session_data, cls=MyEncoder, indent=4)
        old_session.prompts = merged_session_data_json
        db.commit()
        db.refresh(old_session)
    else:
        new_session = Sessions(prompts=session_data_json)
        setattr(new_session, role, user_id)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
    return {"session_id": prompt_id}

@app.delete("/api/delete-session/{session_id}")
async def delete_session(session_id: str):
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return JSONResponse(content={"message": "Session deleted successfully."}, status_code=200)
    else:
        return JSONResponse(content={"detail": "Session not found."}, status_code=404)

@app.get("/api/sessions", response_model=Dict[str, SessionData])
async def get_all_sessions(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    user_id=user_info.id
    role = "user_id" if is_admin else "normal_user_id"
    all_sessions = {}
    sessions = db.query(Sessions).filter(getattr(Sessions, role) == user_id).first()
    if not sessions:
        default_session_data = SessionData(
            session_model="google/gemma-7b",
            prompts=[
                {"role": "system", "content": "Hello there, this is X bot!"}
            ]
        )
        all_sessions['default_session_id'] = default_session_data.dict()
        all_sessions_json=json.dumps(all_sessions, cls=MyEncoder, indent=4)
        new_session = Sessions(prompts=all_sessions_json)
        setattr(new_session, role, user_id)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        sessions = new_session # Ensure sessions points to the newly created session object
    res_sessions_data=json.loads(sessions.prompts) 
    return res_sessions_data

#File 
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...),db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    org_id = user_info.org_id

    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file format. Only PDF files are allowed.")
    try:
        content = await file.read()
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ''
        for page in reader.pages:
            text += page.extract_text() + "\n"
        check_text_length(text)  # Check the length after obtaining all the text

        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        # Update the organization's file_list in the database
        org = db.query(Organizations).filter(Organizations.id == org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found.")

        if check_duplicate_file(org.file_info, file.filename):
            raise HTTPException(status_code=400, detail="Duplicate file. This file already exists.")
        
        with open(file_path, "wb") as f:
            f.write(content)

        file_info = {
            "id": str(uuid.uuid4()),  # Generate a unique identifier
            "filename": file.filename,
            "content": text,
            "path": file_path,
            "updatetime": datetime.now(timezone.utc).isoformat()
        }
        if not org.file_info:
            org.file_info = []
        org.file_info.append(file_info)
        
        # Mark file_info fields as changed
        flag_modified(org, "file_info")
        db.commit()
        db.refresh(org)

        return file_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-txt")
async def upload_txt(file: UploadFile = File(...), db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    org_id = user_info.org_id

    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Invalid file format. Only TXT files are allowed.")
    try:
        content = await file.read()
        text = content.decode('utf-8')
        check_text_length(text)  # Check the length after obtaining all the text

        file_path = os.path.join(UPLOAD_DIR, file.filename)

        # Update the organization's file_list in the database
        org = db.query(Organizations).filter(Organizations.id == org_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found.")

        if check_duplicate_file(org.file_info, file.filename):
            raise HTTPException(status_code=400, detail="Duplicate file. This file already exists.")
        
        with open(file_path, "wb") as f:
            f.write(content)

        file_info = {
            "id": str(uuid.uuid4()),  # Generate a unique identifier
            "filename": file.filename,
            "path": file_path,
            "content": text,
            "updatetime": datetime.now(timezone.utc).isoformat()
        }
        if not org.file_info:
            org.file_info = []
        org.file_info.append(file_info)
        
        # Mark file_info fields as changed
        flag_modified(org, "file_info")
        db.commit()
        db.refresh(org)

        return file_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Download file interface
@app.get("/api/download-file/{org_id}/{file_id}", response_class=FileResponse)
async def download_file(org_id: int, file_id: str, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    
    org = db.query(Organizations).filter(Organizations.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    file_info = next((file for file in org.file_info if file['id'] == file_id), None)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found.")
    
    file_path = file_info['path']
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server.")
    
    response = FileResponse(file_path, media_type='application/octet-stream', filename=file_info["filename"])
    return response

@app.delete("/api/delete-file/{org_id}/{file_id}")
async def delete_file(org_id: int, file_id: str, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    
    org = db.query(Organizations).filter(Organizations.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    file_info = next((file for file in org.file_info if file['id'] == file_id), None)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found.")
    
    file_path = file_info['path']
    
    # Remove files from the organized file information list
    org.file_info = [file for file in org.file_info if file['id'] != file_id]
    
    # Mark file_info fields as changed
    flag_modified(org, "file_info")
    db.commit()
    db.refresh(org)
    
    # Deleting files on the server
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return {"detail": "File deleted successfully."}

@app.get("/api/filelist", response_model=Dict[str, Any])
async def get_file_list(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    org_id = user_info.org_id

    org = db.query(Organizations).filter(Organizations.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    return {
        "org_name": org.name,
        "file_info": org.file_info
    }

@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new organization
    org_name = user.org_name
    new_org = Organizations(name=org_name)
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, password=hashed_password, org_id=new_org.id)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/register-normal-user", response_model=NormalUserResponse)
async def register_normal_user(normal_user: NormalUserCreate, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    db_user = db.query(User).filter(User.username == current_user).first()
    admin_user = db.query(User).filter(User.id == normal_user.admin_id).first()
    if not admin_user:
            db_normal_user = db.query(NormalUser).filter(NormalUser.username == current_user).first()
            if db_normal_user:
                raise HTTPException(status_code=403, detail="Only admins can create normal users!")
            raise HTTPException(status_code=400, detail="Admin ID is invalid!")
    hashed_password = get_password_hash(normal_user.password)
    new_normal_user = NormalUser(username=normal_user.username, password=hashed_password, admin_id=normal_user.admin_id,org_id=db_user.org_id,email=normal_user.email,position=normal_user.position)
    db.add(new_normal_user)
    db.commit()
    db.refresh(new_normal_user)
    return new_normal_user

@app.put("/api/admin/edit-normal-user/{normal_user_id}", response_model=NormalUserResponse)
async def edit_normal_user(normal_user_id: int, normal_user: NormalUserCreate, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can edit normal users")

    db_normal_user = db.query(NormalUser).filter(NormalUser.id == normal_user_id).first()
    if not db_normal_user:
        raise HTTPException(status_code=404, detail="Normal user not found")

    db_normal_user.username = normal_user.username
    db_normal_user.email = normal_user.email
    db_normal_user.position = normal_user.position

    if normal_user.password:
        db_normal_user.password = get_password_hash(normal_user.password)

    db.commit()
    db.refresh(db_normal_user)
    return db_normal_user

@app.delete("/api/admin/delete-normal-user/{normal_user_id}")
async def delete_normal_user(normal_user_id: int, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete normal users")

    normal_user = db.query(NormalUser).filter(NormalUser.id == normal_user_id).first()
    if not normal_user:
        raise HTTPException(status_code=404, detail="Normal user not found")

    db.delete(normal_user)
    db.commit()
    return {"detail": "Normal user deleted successfully"}


@app.post("/login")
async def login(user: UserLogin, db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    db_user = db.query(User).filter(User.username == user.username).first()
    db_normal_user = db.query(NormalUser).filter(NormalUser.username == user.username).first()
    
    if db_user and verify_password(user.password, db_user.password):
        access_token = Authorize.create_access_token(subject=db_user.username)
        return {"access_token": access_token, "id": db_user.id, "is_admin": True,"org_id":db_user.org_id}
    elif db_normal_user and verify_password(user.password, db_normal_user.password):
        access_token = Authorize.create_access_token(subject=db_normal_user.username)
        return {"access_token": access_token, "id": db_normal_user.id, "is_admin": False,"org_id":db_normal_user.id}
    else:
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
@app.get("/api/admin/normal-users", response_model=List[NormalUserResponse])
async def get_normal_users_for_admin(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    user_id=user_info.id
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")
    
    normal_users = db.query(NormalUser).filter(NormalUser.admin_id == user_id).all()
    print(normal_users,"normal_users")
    return normal_users

@app.get("/api/usage-statistics", response_model=List[Dict[str, Any]])
async def get_usage_statistics(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    org_id = user_info.org_id
    
    normal_users = db.query(NormalUser).filter(NormalUser.org_id == org_id).all()
    usage_stats = []
    
    for user in normal_users:
        user_sessions = db.query(Sessions).filter(Sessions.normal_user_id == user.id).all()
        total_user_messages = 0
        
        for session in user_sessions:
            session_data = json.loads(session.prompts)
            for session_id, session_info in session_data.items():
                prompts = session_info.get('prompts', [])
                user_message_count = sum(1 for prompt in prompts if prompt['role'] == 'user')
                total_user_messages += user_message_count
        
        usage_stats.append({
            "username": user.username,
            "usage_count": total_user_messages
        })
    
    return usage_stats

@app.get("/api/wordcloud-data", response_model=Dict[str, int])
async def get_wordcloud_data(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    current_user, user_info, is_admin = get_current_user_id(Authorize, db)
    org_id = user_info.org_id

    # Initialize the list of user IDs to include the current admin's user ID
    user_ids = [user_info.id]

    # Get all normal users in the same organization
    normal_users = db.query(NormalUser).filter(NormalUser.org_id == org_id).all()
    normal_user_ids = [user.id for user in normal_users]

    # Get all sessions for normal users
    normal_user_sessions = db.query(Sessions).filter(Sessions.normal_user_id.in_(normal_user_ids)).all()
    # Get all sessions for the admin
    admin_sessions = db.query(Sessions).filter(Sessions.user_id == user_info.id).all()

    # Combine both sets of sessions
    sessions = normal_user_sessions + admin_sessions

    text_data = ""
    for session in sessions:
        session_data = json.loads(session.prompts)
        for key in session_data.keys():
            for prompt in session_data[key]['prompts']:
                if prompt['role'] == 'user':
                    text_data += " " + prompt['content']
    
    # Remove stopwords and non-alphabetic characters
    words = re.findall(r'\b\w+\b', text_data.lower())
    words = [word for word in words if word not in ENGLISH_STOP_WORDS]

    word_count = Counter(words)
    return dict(word_count)