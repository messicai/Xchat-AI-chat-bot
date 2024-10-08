from pydantic import BaseModel
from typing import List, Optional,Dict

class UserCreate(BaseModel):
    username: str
    password: str
    org_name: str
    is_admin: Optional[bool] = False

class UserLogin(BaseModel):
    username: str
    password: str
    remember:bool
    is_admin: Optional[bool] = False
class UserResponse(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True

class NormalUserCreate(BaseModel):
    username: str
    password: str
    admin_id: int
    email: str
    position: str
    org_id:int
class NormalUserResponse(BaseModel):
    id: int
    username: str
    admin_id: int
    email: str
    position: str
    org_id:int
    class Config:
        orm_mode = True

class Prompt(BaseModel):
    role: str
    content: str

class TalkRequest(BaseModel):
    model: str
    message: List[Prompt]
    session_id: str
    promptFilelist: dict={}

class SessionCreate(BaseModel):
    session_model: str

class SessionResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    normal_user_id: Optional[int] = None
    prompts: List[Dict]

    class Config:
        orm_mode = True

class SessionData(BaseModel):
    session_model: str
    prompts: List[Prompt]
    promptFilelist: dict={}


class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    file_list: List[Dict] = []

class OrganizationResponse(OrganizationBase):
    id: int
    file_list: List[Dict]

    class Config:
        orm_mode = True