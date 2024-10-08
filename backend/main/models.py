from sqlalchemy import Column, Integer, String, Boolean, ForeignKey,JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password = Column(String(255))
    # is_admin = Column(Boolean, default=False)
    org_id=Column(Integer, ForeignKey('organizations.id'))

    organizations = relationship("Organizations", back_populates="users")
    normal_users = relationship("NormalUser", back_populates="admin")
    sessions = relationship("Sessions", back_populates="user")

class NormalUser(Base):
    __tablename__ = "normal_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password = Column(String(255))
    admin_id = Column(Integer, ForeignKey('users.id'))
    org_id=Column(Integer, ForeignKey('organizations.id'))
    email = Column(String(255), unique=True, index=True)
    position = Column(String(100))
    
    organizations = relationship("Organizations", back_populates="normal_users")
    admin = relationship("User", back_populates="normal_users")
    sessions = relationship("Sessions", back_populates="normal_user")

class Sessions(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    normal_user_id = Column(Integer, ForeignKey('normal_users.id'), nullable=True)
    prompts = Column(JSON)

    user = relationship("User", back_populates="sessions")
    normal_user = relationship("NormalUser", back_populates="sessions")

class Organizations(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    file_info = Column(JSON, default=[])

    users = relationship("User", back_populates="organizations")
    normal_users = relationship("NormalUser", back_populates="organizations")