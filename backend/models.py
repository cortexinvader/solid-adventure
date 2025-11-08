from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from flask_login import UserMixin
import json

Base = declarative_base()

class User(Base, UserMixin):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    reg_number = Column(String(50), nullable=True)
    role = Column(String(20), nullable=False)
    department_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tutorial_seen = Column(Boolean, default=False)
    
    messages = relationship('Message', back_populates='sender', foreign_keys='Message.sender_id')
    documents = relationship('Document', back_populates='owner')
    push_subscriptions = relationship('PushSubscription', back_populates='user', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'phone': self.phone,
            'reg_number': self.reg_number,
            'role': self.role,
            'department_name': self.department_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'tutorial_seen': self.tutorial_seen
        }


class Department(Base):
    __tablename__ = 'departments'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }


class Room(Base):
    __tablename__ = 'rooms'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    department_name = Column(String(100), nullable=True)
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship('Message', back_populates='room', cascade='all, delete-orphan')
    created_by = relationship('User', foreign_keys=[created_by_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'department_name': self.department_name,
            'created_by_id': self.created_by_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=False, index=True)
    text = Column(Text, nullable=False)
    formatting = Column(Text, default='{}')
    image_filename = Column(String(255), nullable=True)
    image_expires_at = Column(DateTime, nullable=True)
    reply_to = Column(Integer, ForeignKey('messages.id'), nullable=True)
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    reactions = Column(Text, default='{}')
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    sender = relationship('User', back_populates='messages', foreign_keys=[sender_id])
    room = relationship('Room', back_populates='messages')
    parent_message = relationship('Message', remote_side=[id], foreign_keys=[reply_to])
    
    __table_args__ = (
        Index('idx_room_timestamp', 'room_id', 'timestamp'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_username': self.sender.username if self.sender else 'AI',
            'room_id': self.room_id,
            'text': self.text,
            'formatting': json.loads(self.formatting) if self.formatting else {},
            'image_filename': self.image_filename,
            'image_expires_at': self.image_expires_at.isoformat() if self.image_expires_at else None,
            'reply_to': self.reply_to,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'reactions': json.loads(self.reactions) if self.reactions else {},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }


class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True)
    type = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    posted_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    target_department_name = Column(String(100), nullable=True, index=True)
    reactions = Column(Text, default='{}')
    read_by = Column(Text, default='[]')
    
    posted_by = relationship('User', foreign_keys=[posted_by_id])
    
    __table_args__ = (
        Index('idx_dept_timestamp', 'target_department_name', 'timestamp'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'posted_by_id': self.posted_by_id,
            'posted_by_username': self.posted_by.username if self.posted_by else None,
            'target_department_name': self.target_department_name,
            'reactions': json.loads(self.reactions) if self.reactions else {},
            'read_by': json.loads(self.read_by) if self.read_by else []
        }


class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    mime = Column(String(100), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    watermark = Column(Boolean, default=False)
    
    owner = relationship('User', back_populates='documents')
    
    def to_dict(self):
        return {
            'id': self.id,
            'owner_id': self.owner_id,
            'owner_username': self.owner.username if self.owner else None,
            'filename': self.filename,
            'mime': self.mime,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'watermark': self.watermark
        }


class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=True)
    target_id = Column(Integer, nullable=True)
    meta = Column(Text, default='{}')
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    actor = relationship('User', foreign_keys=[actor_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'meta': json.loads(self.meta) if self.meta else {},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }


class PushSubscription(Base):
    __tablename__ = 'push_subscriptions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    subscription_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('User', back_populates='push_subscriptions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'subscription': json.loads(self.subscription_json) if self.subscription_json else {},
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
