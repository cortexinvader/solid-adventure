import os
import json
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_file, session
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
from flask_login import LoginManager, login_user, logout_user, current_user, login_required
from flask_session import Session
from flask_cors import CORS
from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker, scoped_session
from werkzeug.utils import secure_filename
import bcrypt
from apscheduler.schedulers.background import BackgroundScheduler
from pywebpush import webpush, WebPushException
import requests

from models import Base, User, Department, Room, Message, Notification, Document, ActivityLog, PushSubscription

app = Flask(__name__)

with open('config.json', 'r') as f:
    config = json.load(f)

app.config['SECRET_KEY'] = os.environ.get('SESSION_SECRET', secrets.token_hex(32))
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=config['app']['session_timeout_minutes'])
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024
app.config['WTF_CSRF_ENABLED'] = False

# Serve frontend static files
FRONTEND_BUILD_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')

ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')
if ALLOWED_ORIGINS == '*':
    cors_origins = '*'
else:
    cors_origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(',')]

Session(app)
CORS(app, supports_credentials=True, origins=cors_origins, allow_headers=['Content-Type', 'X-CSRF-Token'])
socketio = SocketIO(app, cors_allowed_origins=cors_origins, async_mode='eventlet', manage_session=False)

import sys

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'portal.db')
engine = create_engine(f'sqlite:///{DB_PATH}', echo=False)
Base.metadata.create_all(engine)
session_factory = sessionmaker(bind=engine)
db_session = scoped_session(session_factory)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.session_protection = 'strong'

@login_manager.user_loader
def load_user(user_id):
    return db_session.query(User).get(int(user_id))

def requires_role(*roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_csrf():
    if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
        csrf_token = request.headers.get('X-CSRF-Token')
        session_token = session.get('csrf_token')
        if not csrf_token or csrf_token != session_token:
            return jsonify({'error': 'Invalid CSRF token'}), 403
    return None

@app.before_request
def csrf_protect():
    if request.endpoint and request.endpoint != 'get_csrf_token' and not request.path.startswith('/socket.io'):
        result = validate_csrf()
        if result:
            return result

@app.route('/api/csrf-token', methods=['GET'])
def get_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(32)
    return jsonify({'csrf_token': session['csrf_token']})

def log_activity(action, target_type=None, target_id=None, meta=None):
    try:
        log_entry = ActivityLog(
            actor_id=current_user.id if current_user.is_authenticated else None,
            action=action,
            target_type=target_type,
            target_id=target_id,
            meta=json.dumps(meta or {})
        )
        db_session.add(log_entry)
        db_session.commit()
    except Exception as e:
        print(f"Activity log error: {e}")

def send_push_notification(user_id, title, body, data=None):
    try:
        subscriptions = db_session.query(PushSubscription).filter_by(user_id=user_id).all()
        vapid_public = config['push'].get('vapid_public_key', '')
        vapid_private = config['push'].get('vapid_private_key', '')
        contact_email = config['push'].get('contact_email', '')
        
        if not vapid_public or not vapid_private:
            return
        
        for sub in subscriptions:
            try:
                subscription_info = json.loads(sub.subscription_json)
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps({
                        'title': title,
                        'body': body,
                        'data': data or {}
                    }),
                    vapid_private_key=vapid_private,
                    vapid_claims={
                        "sub": f"mailto:{contact_email}"
                    }
                )
            except WebPushException as e:
                if e.response and e.response.status_code == 410:
                    db_session.delete(sub)
                print(f"Push notification error: {e}")
        
        db_session.commit()
    except Exception as e:
        print(f"Send push notification error: {e}")

def initialize_database():
    try:
        admin_user = db_session.query(User).filter_by(username=config['admin']['username']).first()
        if not admin_user:
            admin_user = User(
                username=config['admin']['username'],
                password_hash=bcrypt.hashpw(config['admin']['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                phone='',
                role='admin',
                department_name=None
            )
            db_session.add(admin_user)
        
        faculty_gov = db_session.query(User).filter_by(username=config['faculty_governor']['username']).first()
        if not faculty_gov:
            faculty_gov = User(
                username=config['faculty_governor']['username'],
                password_hash=bcrypt.hashpw(config['faculty_governor']['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                phone='',
                role='faculty-governor',
                department_name='All Departments'
            )
            db_session.add(faculty_gov)
        
        for dept_name in config['departments']:
            dept = db_session.query(Department).filter_by(name=dept_name).first()
            if not dept:
                dept = Department(name=dept_name)
                db_session.add(dept)
        
        for dept_gov in config['department_governors']:
            gov_user = db_session.query(User).filter_by(username=dept_gov['username']).first()
            if not gov_user:
                gov_user = User(
                    username=dept_gov['username'],
                    password_hash=bcrypt.hashpw(dept_gov['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                    phone='',
                    role='department-governor',
                    department_name=dept_gov['department']
                )
                db_session.add(gov_user)
        
        general_room = db_session.query(Room).filter_by(name='General', type='General').first()
        if not general_room:
            general_room = Room(name='General', type='General', department_name=None)
            db_session.add(general_room)
        
        for dept_name in config['departments']:
            dept_room = db_session.query(Room).filter_by(name=dept_name, type='Department').first()
            if not dept_room:
                dept_room = Room(name=dept_name, type='Department', department_name=dept_name)
                db_session.add(dept_room)
        
        db_session.commit()
        print("Database initialized successfully")
    except Exception as e:
        db_session.rollback()
        print(f"Database initialization error: {e}")

def restore_from_backup():
    backup_path = os.path.join('..', 'data', 'admin_backup.json')
    if os.path.exists(backup_path):
        try:
            with open(backup_path, 'r') as f:
                backup_data = json.load(f)
            
            if 'users' in backup_data:
                for user_data in backup_data['users']:
                    existing_user = db_session.query(User).filter_by(username=user_data['username']).first()
                    if not existing_user:
                        user = User(
                            username=user_data['username'],
                            password_hash=user_data['password'],
                            phone=user_data.get('phone', ''),
                            reg_number=user_data.get('regNumber'),
                            role=user_data['role'],
                            department_name=user_data.get('departmentName')
                        )
                        db_session.add(user)
            
            if 'notifications' in backup_data:
                for notif_data in backup_data['notifications']:
                    existing_notif = db_session.query(Notification).filter_by(id=notif_data['id']).first()
                    if not existing_notif:
                        user = db_session.query(User).filter_by(id=notif_data['posted_by_id']).first()
                        if user:
                            notif = Notification(
                                id=notif_data['id'],
                                type=notif_data['type'],
                                content=notif_data['content'],
                                posted_by_id=notif_data['posted_by_id'],
                                target_department_name=notif_data.get('target_department_name'),
                                timestamp=datetime.fromisoformat(notif_data['timestamp']) if notif_data.get('timestamp') else datetime.utcnow()
                            )
                            db_session.add(notif)
            
            db_session.commit()
            print("Backup restored successfully")
        except Exception as e:
            db_session.rollback()
            print(f"Backup restore error: {e}")

def generate_backup():
    try:
        users = db_session.query(User).all()
        notifications = db_session.query(Notification).all()
        
        backup_data = {
            'backupCreated': True,
            'timestamp': datetime.utcnow().isoformat(),
            'users': [],
            'notifications': []
        }
        
        for user in users:
            backup_data['users'].append({
                'username': user.username,
                'password': user.password_hash,
                'phone': user.phone,
                'regNumber': user.reg_number,
                'role': user.role,
                'departmentName': user.department_name
            })
        
        for notif in notifications:
            backup_data['notifications'].append({
                'id': notif.id,
                'type': notif.type,
                'content': notif.content,
                'posted_by_id': notif.posted_by_id,
                'target_department_name': notif.target_department_name,
                'timestamp': notif.timestamp.isoformat() if notif.timestamp else None
            })
        
        backup_path = os.path.join('..', 'data', 'admin_backup.json')
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        with open(backup_path, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        print(f"Backup generated: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"Backup generation error: {e}")
        return None

def send_backup_to_telegram():
    try:
        bot_token = config['telegram'].get('bot_token', '')
        chat_id = config['telegram'].get('chat_id', '')
        
        if not bot_token or not chat_id:
            return
        
        backup_path = generate_backup()
        if not backup_path:
            return
        
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        caption = f"🔒 CIESA Portal Backup - {timestamp}"
        
        url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
        with open(backup_path, 'rb') as f:
            files = {'document': f}
            data = {'chat_id': chat_id, 'caption': caption}
            response = requests.post(url, files=files, data=data)
            if response.status_code == 200:
                print("Backup sent to Telegram successfully")
            else:
                print(f"Telegram send failed: {response.text}")
    except Exception as e:
        print(f"Send to Telegram error: {e}")

def cleanup_expired_files():
    try:
        now = datetime.utcnow()
        
        expired_messages = db_session.query(Message).filter(
            Message.image_filename.isnot(None),
            Message.image_expires_at <= now
        ).all()
        
        for msg in expired_messages:
            img_path = os.path.join('..', 'uploads', 'images', msg.image_filename)
            if os.path.exists(img_path):
                os.remove(img_path)
                print(f"Deleted expired image: {msg.image_filename}")
            msg.image_filename = None
            msg.image_expires_at = None
        
        expired_docs = db_session.query(Document).filter(
            Document.expires_at.isnot(None),
            Document.expires_at <= now
        ).all()
        
        for doc in expired_docs:
            doc_path = os.path.join('..', 'uploads', 'docs', doc.filename)
            if os.path.exists(doc_path):
                os.remove(doc_path)
                print(f"Deleted expired document: {doc.filename}")
            db_session.delete(doc)
        
        db_session.commit()
        print("Cleanup completed")
    except Exception as e:
        db_session.rollback()
        print(f"Cleanup error: {e}")

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        phone = data.get('phone', '').strip()
        reg_number = data.get('reg_number', '').strip()
        department_name = data.get('department_name', '')
        
        if not all([username, password, phone, department_name]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if department_name not in config['departments']:
            return jsonify({'error': 'Invalid department'}), 400
        
        existing_user = db_session.query(User).filter_by(username=username).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 409
        
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user = User(
            username=username,
            password_hash=password_hash,
            phone=phone,
            reg_number=reg_number,
            role='student',
            department_name=department_name,
            tutorial_seen=False
        )
        
        db_session.add(user)
        db_session.commit()
        
        generate_backup()
        log_activity('user_signup', 'user', user.id)
        
        return jsonify({
            'message': 'Signup successful',
            'user': user.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Missing credentials'}), 400
        
        user = db_session.query(User).filter_by(username=username).first()
        
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        login_user(user, remember=True)
        log_activity('user_login', 'user', user.id)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    log_activity('user_logout', 'user', current_user.id)
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({'user': current_user.to_dict()}), 200

@app.route('/api/auth/tutorial-seen', methods=['POST'])
@login_required
def mark_tutorial_seen():
    try:
        current_user.tutorial_seen = True
        db_session.commit()
        return jsonify({'message': 'Tutorial marked as seen'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/departments', methods=['GET'])
def get_departments():
    departments = db_session.query(Department).all()
    return jsonify({'departments': [d.to_dict() for d in departments]}), 200

@app.route('/api/users/<username>', methods=['GET'])
@login_required
def get_user_profile(username):
    try:
        user = db_session.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if current_user.role == 'student' and user.role != 'student':
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({'user': user.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rooms', methods=['GET'])
@login_required
def get_rooms():
    try:
        if current_user.role == 'admin':
            rooms_list = db_session.query(Room).all()
        elif current_user.role in ['faculty-governor', 'department-governor']:
            rooms_list = db_session.query(Room).filter(
                or_(
                    Room.type == 'General',
                    Room.department_name == current_user.department_name,
                    Room.department_name.is_(None)
                )
            ).all()
        else:
            rooms_list = db_session.query(Room).filter(
                or_(
                    Room.type == 'General',
                    Room.department_name == current_user.department_name
                )
            ).all()
        
        return jsonify({'rooms': [r.to_dict() for r in rooms_list]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rooms', methods=['POST'])
@requires_role('admin')
def create_room():
    try:
        data = request.json
        name = data.get('name', '').strip()
        room_type = data.get('type', 'Custom')
        department_name = data.get('department_name')
        
        if not name:
            return jsonify({'error': 'Room name required'}), 400
        
        existing_room = db_session.query(Room).filter_by(name=name, type=room_type).first()
        if existing_room:
            return jsonify({'error': 'Room already exists'}), 409
        
        room = Room(
            name=name,
            type=room_type,
            department_name=department_name,
            created_by_id=current_user.id
        )
        
        db_session.add(room)
        db_session.commit()
        
        log_activity('room_created', 'room', room.id)
        
        return jsonify({
            'message': 'Room created',
            'room': room.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
@requires_role('admin')
def delete_room(room_id):
    try:
        room = db_session.query(Room).get(room_id)
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        if room.type in ['General', 'Department']:
            return jsonify({'error': 'Cannot delete system rooms'}), 400
        
        db_session.delete(room)
        db_session.commit()
        
        log_activity('room_deleted', 'room', room_id)
        
        return jsonify({'message': 'Room deleted'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/<int:room_id>', methods=['GET'])
@login_required
def get_messages(room_id):
    try:
        room = db_session.query(Room).get(room_id)
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        messages = db_session.query(Message).filter_by(
            room_id=room_id,
            deleted_at=None
        ).order_by(Message.timestamp.desc()).limit(limit).offset(offset).all()
        
        messages.reverse()
        
        return jsonify({'messages': [m.to_dict() for m in messages]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages/upload-image', methods=['POST'])
@login_required
def upload_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        if file.content_length > 10 * 1024 * 1024:
            return jsonify({'error': 'Image too large (max 10MB)'}), 400
        
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Invalid image type'}), 400
        
        filename = f"{secrets.token_hex(16)}{file_ext}"
        filepath = os.path.join('..', 'uploads', 'images', filename)
        file.save(filepath)
        
        expiry = datetime.utcnow() + timedelta(hours=config['app']['image_expire_hours'])
        
        return jsonify({
            'filename': filename,
            'expires_at': expiry.isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/images/<filename>', methods=['GET'])
def get_image(filename):
    try:
        filepath = os.path.join('..', 'uploads', 'images', filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'Image not found'}), 404
        return send_file(filepath)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    try:
        notifications = db_session.query(Notification).filter(
            or_(
                Notification.target_department_name == current_user.department_name,
                Notification.target_department_name.is_(None)
            )
        ).order_by(Notification.timestamp.desc()).all()
        
        return jsonify({'notifications': [n.to_dict() for n in notifications]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/post', methods=['POST'])
@requires_role('department-governor', 'faculty-governor', 'admin')
def post_notification():
    try:
        data = request.json
        notif_type = data.get('type', 'regular')
        content = data.get('content', '').strip()
        post_generally = data.get('post_generally', False)
        
        if not content:
            return jsonify({'error': 'Content required'}), 400
        
        if notif_type not in ['urgent', 'regular', 'cruise']:
            return jsonify({'error': 'Invalid notification type'}), 400
        
        target_dept = None
        if not post_generally:
            if current_user.role == 'department-governor':
                target_dept = current_user.department_name
            elif current_user.role == 'faculty-governor':
                target_dept = None
        
        notification = Notification(
            type=notif_type,
            content=content,
            posted_by_id=current_user.id,
            target_department_name=target_dept
        )
        
        db_session.add(notification)
        db_session.commit()
        
        generate_backup()
        log_activity('notification_posted', 'notification', notification.id)
        
        users_to_notify = db_session.query(User).filter(
            or_(
                User.department_name == target_dept,
                target_dept == None
            )
        ).all()
        
        for user in users_to_notify:
            if user.id != current_user.id:
                send_push_notification(
                    user.id,
                    f"New {notif_type} notification",
                    content[:100]
                )
        
        socketio.emit('new_notification', notification.to_dict(), broadcast=True)
        
        return jsonify({
            'message': 'Notification posted',
            'notification': notification.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notif_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notif_id):
    try:
        notification = db_session.query(Notification).get(notif_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        read_by = json.loads(notification.read_by) if notification.read_by else []
        if current_user.id not in read_by:
            read_by.append(current_user.id)
            notification.read_by = json.dumps(read_by)
            db_session.commit()
        
        return jsonify({'message': 'Marked as read'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notif_id>/react', methods=['POST'])
@login_required
def react_to_notification(notif_id):
    try:
        data = request.json
        emoji = data.get('emoji', '')
        
        notification = db_session.query(Notification).get(notif_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        reactions = json.loads(notification.reactions) if notification.reactions else {}
        
        if emoji not in reactions:
            reactions[emoji] = []
        
        if current_user.id in reactions[emoji]:
            reactions[emoji].remove(current_user.id)
            if not reactions[emoji]:
                del reactions[emoji]
        else:
            reactions[emoji].append(current_user.id)
        
        notification.reactions = json.dumps(reactions)
        db_session.commit()
        
        socketio.emit('notification_updated', notification.to_dict(), broadcast=True)
        
        return jsonify({'message': 'Reaction updated', 'reactions': reactions}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notif_id>', methods=['DELETE'])
@requires_role('department-governor', 'faculty-governor', 'admin')
def delete_notification(notif_id):
    try:
        notification = db_session.query(Notification).get(notif_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        if current_user.role == 'department-governor' and notification.posted_by_id != current_user.id:
            return jsonify({'error': 'Cannot delete others notifications'}), 403
        
        db_session.delete(notification)
        db_session.commit()
        
        generate_backup()
        log_activity('notification_deleted', 'notification', notif_id)
        
        socketio.emit('notification_deleted', {'id': notif_id}, broadcast=True)
        
        return jsonify({'message': 'Notification deleted'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents', methods=['GET'])
@login_required
def get_documents():
    try:
        if current_user.role == 'admin':
            documents = db_session.query(Document).all()
        else:
            documents = db_session.query(Document).join(User).filter(
                or_(
                    User.department_name == current_user.department_name,
                    Document.owner_id == current_user.id
                )
            ).all()
        
        return jsonify({'documents': [d.to_dict() for d in documents]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/upload', methods=['POST'])
@login_required
def upload_document():
    try:
        if 'document' not in request.files:
            return jsonify({'error': 'No document file'}), 400
        
        file = request.files['document']
        watermark = request.form.get('watermark', 'false').lower() == 'true'
        
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        allowed_mimes = {
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
        }
        
        mime_type = file.content_type
        if mime_type not in allowed_mimes:
            return jsonify({'error': 'Invalid document type (PDF, DOC, DOCX only)'}), 400
        
        original_filename = secure_filename(file.filename)
        filename = f"{secrets.token_hex(16)}_{original_filename}"
        filepath = os.path.join('..', 'uploads', 'docs', filename)
        file.save(filepath)
        
        document = Document(
            owner_id=current_user.id,
            filename=filename,
            mime=mime_type,
            watermark=watermark
        )
        
        db_session.add(document)
        db_session.commit()
        
        log_activity('document_uploaded', 'document', document.id)
        
        return jsonify({
            'message': 'Document uploaded',
            'document': document.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents/download/<int:doc_id>', methods=['GET'])
@login_required
def download_document(doc_id):
    try:
        document = db_session.query(Document).get(doc_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        filepath = os.path.join('..', 'uploads', 'docs', document.filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(filepath, as_attachment=True, download_name=document.filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/push/subscribe', methods=['POST'])
@login_required
def subscribe_push():
    try:
        subscription_data = request.json
        
        existing = db_session.query(PushSubscription).filter_by(
            user_id=current_user.id,
            subscription_json=json.dumps(subscription_data)
        ).first()
        
        if existing:
            return jsonify({'message': 'Already subscribed'}), 200
        
        subscription = PushSubscription(
            user_id=current_user.id,
            subscription_json=json.dumps(subscription_data)
        )
        
        db_session.add(subscription)
        db_session.commit()
        
        return jsonify({'message': 'Subscribed to push notifications'}), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/push/unsubscribe', methods=['POST'])
@login_required
def unsubscribe_push():
    try:
        subscription_data = request.json
        
        subscription = db_session.query(PushSubscription).filter_by(
            user_id=current_user.id,
            subscription_json=json.dumps(subscription_data)
        ).first()
        
        if subscription:
            db_session.delete(subscription)
            db_session.commit()
        
        return jsonify({'message': 'Unsubscribed from push notifications'}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/backup', methods=['POST'])
@requires_role('admin')
def manual_backup():
    try:
        send_to_telegram = request.json.get('send_to_telegram', False)
        
        backup_path = generate_backup()
        if not backup_path:
            return jsonify({'error': 'Backup generation failed'}), 500
        
        if send_to_telegram:
            send_backup_to_telegram()
        
        log_activity('manual_backup', 'system', None)
        
        return jsonify({'message': 'Backup completed', 'path': backup_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(FRONTEND_BUILD_PATH, path)):
        return send_file(os.path.join(FRONTEND_BUILD_PATH, path))
    else:
        return send_file(os.path.join(FRONTEND_BUILD_PATH, 'index.html'))

@socketio.on('connect')
def handle_connect():
    if not current_user.is_authenticated:
        return False
    print(f'User {current_user.username} connected')

@socketio.on('disconnect')
def handle_disconnect():
    if current_user.is_authenticated:
        print(f'User {current_user.username} disconnected')

@socketio.on('join_room')
def handle_join_room(data):
    if not current_user.is_authenticated:
        return
    
    room_id = data.get('room_id')
    room = db_session.query(Room).get(room_id)
    
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    if room.type == 'Department' and room.department_name != current_user.department_name and current_user.role not in ['admin', 'faculty-governor']:
        emit('error', {'message': 'Access denied'})
        return
    
    join_room(str(room_id))
    emit('joined_room', {'room_id': room_id, 'room_name': room.name})
    print(f'User {current_user.username} joined room {room.name}')

@socketio.on('leave_room')
def handle_leave_room(data):
    if not current_user.is_authenticated:
        return
    
    room_id = data.get('room_id')
    leave_room(str(room_id))
    emit('left_room', {'room_id': room_id})

@socketio.on('send_message')
def handle_send_message(data):
    if not current_user.is_authenticated:
        return
    
    try:
        room_id = data.get('room_id')
        text = data.get('text', '').strip()
        formatting = data.get('formatting', {})
        image_filename = data.get('image_filename')
        image_expires_at = data.get('image_expires_at')
        reply_to = data.get('reply_to')
        
        if not text and not image_filename:
            emit('error', {'message': 'Message text or image required'})
            return
        
        room = db_session.query(Room).get(room_id)
        if not room:
            emit('error', {'message': 'Room not found'})
            return
        
        if '@ai' in text.lower():
            text_clean = text.replace('@ai', '').replace('@AI', '').strip()
            
            ai_endpoint = config['ai'].get('endpoint', '')
            if ai_endpoint:
                try:
                    context_messages = db_session.query(Message).filter_by(
                        room_id=room_id,
                        deleted_at=None
                    ).order_by(Message.timestamp.desc()).limit(10).all()
                    
                    context = f"Room: {room.name}\nUser: {current_user.username} ({current_user.department_name})\n"
                    context += "Recent messages:\n"
                    for msg in reversed(context_messages):
                        sender_name = msg.sender.username if msg.sender else 'AI'
                        context += f"{sender_name}: {msg.text}\n"
                    context += f"\nNew message: {text_clean}"
                    
                    ai_response = requests.post(
                        ai_endpoint,
                        json={'message': text_clean, 'context': context},
                        timeout=10
                    )
                    
                    ai_text = ai_response.json().get('response', 'AI response received')
                except Exception as e:
                    ai_text = f"AI service temporarily unavailable. Error: {str(e)}"
            else:
                ai_text = "AI endpoint not configured. Please update config.json with a valid AI API endpoint."
            
            ai_message = Message(
                sender_id=None,
                room_id=room_id,
                text=ai_text,
                formatting=json.dumps({})
            )
            db_session.add(ai_message)
            db_session.commit()
            
            socketio.emit('new_message', ai_message.to_dict(), room=str(room_id))
        
        message = Message(
            sender_id=current_user.id,
            room_id=room_id,
            text=text,
            formatting=json.dumps(formatting),
            image_filename=image_filename,
            image_expires_at=datetime.fromisoformat(image_expires_at) if image_expires_at else None,
            reply_to=reply_to
        )
        
        db_session.add(message)
        db_session.commit()
        
        log_activity('message_sent', 'message', message.id)
        
        socketio.emit('new_message', message.to_dict(), room=str(room_id))
        
        if '@' in text:
            import re
            mentions = re.findall(r'@(\w+)', text)
            for mentioned_username in mentions:
                mentioned_user = db_session.query(User).filter_by(username=mentioned_username).first()
                if mentioned_user:
                    send_push_notification(
                        mentioned_user.id,
                        f"{current_user.username} mentioned you",
                        text[:100]
                    )
        
    except Exception as e:
        db_session.rollback()
        emit('error', {'message': str(e)})

@socketio.on('edit_message')
def handle_edit_message(data):
    if not current_user.is_authenticated:
        return
    
    try:
        message_id = data.get('message_id')
        new_text = data.get('text', '').strip()
        
        message = db_session.query(Message).get(message_id)
        if not message:
            emit('error', {'message': 'Message not found'})
            return
        
        if message.sender_id != current_user.id and current_user.role != 'admin':
            emit('error', {'message': 'Cannot edit this message'})
            return
        
        message.text = new_text
        message.edited_at = datetime.utcnow()
        db_session.commit()
        
        socketio.emit('message_edited', message.to_dict(), room=str(message.room_id))
        
    except Exception as e:
        db_session.rollback()
        emit('error', {'message': str(e)})

@socketio.on('delete_message')
def handle_delete_message(data):
    if not current_user.is_authenticated:
        return
    
    try:
        message_id = data.get('message_id')
        
        message = db_session.query(Message).get(message_id)
        if not message:
            emit('error', {'message': 'Message not found'})
            return
        
        if message.sender_id != current_user.id and current_user.role != 'admin':
            emit('error', {'message': 'Cannot delete this message'})
            return
        
        message.deleted_at = datetime.utcnow()
        db_session.commit()
        
        socketio.emit('message_deleted', {'message_id': message_id}, room=str(message.room_id))
        
    except Exception as e:
        db_session.rollback()
        emit('error', {'message': str(e)})

@socketio.on('react_to_message')
def handle_react_to_message(data):
    if not current_user.is_authenticated:
        return
    
    try:
        message_id = data.get('message_id')
        emoji = data.get('emoji', '')
        
        message = db_session.query(Message).get(message_id)
        if not message:
            emit('error', {'message': 'Message not found'})
            return
        
        reactions = json.loads(message.reactions) if message.reactions else {}
        
        if emoji not in reactions:
            reactions[emoji] = []
        
        if current_user.id in reactions[emoji]:
            reactions[emoji].remove(current_user.id)
            if not reactions[emoji]:
                del reactions[emoji]
        else:
            reactions[emoji].append(current_user.id)
        
        message.reactions = json.dumps(reactions)
        db_session.commit()
        
        socketio.emit('message_reaction_updated', {
            'message_id': message_id,
            'reactions': reactions
        }, room=str(message.room_id))
        
    except Exception as e:
        db_session.rollback()
        emit('error', {'message': str(e)})

@socketio.on('typing')
def handle_typing(data):
    if not current_user.is_authenticated:
        return
    
    room_id = data.get('room_id')
    socketio.emit('user_typing', {
        'username': current_user.username,
        'room_id': room_id
    }, room=str(room_id), skip_sid=request.sid)

if __name__ == '__main__':
    with app.app_context():
        initialize_database()
        restore_from_backup()
        
        scheduler = BackgroundScheduler()
        scheduler.add_job(cleanup_expired_files, 'interval', hours=1)
        scheduler.add_job(generate_backup, 'interval', hours=config['system']['backup_interval_hours'])
        
        telegram_interval = config['system'].get('telegram_send_interval_hours', 24)
        if telegram_interval > 0:
            scheduler.add_job(send_backup_to_telegram, 'interval', hours=telegram_interval)
        
        scheduler.start()
        
        port = int(os.environ.get('PORT', 8000))
        print(f"Starting {config['app']['name']}...")
        print(f"Backend server listening on 0.0.0.0:{port}")
        sys.stdout.flush()
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
