# CIESA Faculty Portal

## Project Overview

A comprehensive full-stack Progressive Web Application (PWA) for faculty communication and document management. Built with Flask (Python) backend and React (TypeScript) frontend, featuring realtime chat, notifications, document management, and role-based access control.

## Recent Changes

**November 8, 2025**: Initial project creation
- Complete backend implementation with Flask, SQLAlchemy, Socket.IO
- Complete frontend implementation with React 18, TypeScript, Vite, Tailwind CSS
- Database models for users, departments, rooms, messages, notifications, documents
- Authentication system with role-based access control (RBAC)
- Realtime chat with Socket.IO including AI integration
- Push notifications system with PyWebPush
- Document management with upload, download, and watermarking
- Admin backup/restore system with Telegram delivery
- PWA support with service worker and offline caching
- Monochrome theme with dark/light mode toggle
- Automated scheduled tasks for cleanup and backups
- **SECURITY FIX**: Implemented CORS origin restrictions (localhost + Replit domains) with configurable `ALLOWED_ORIGINS` environment variable
- **SECURITY FIX**: Added CSRF token generation and validation for all state-changing endpoints (POST/PUT/DELETE/PATCH)
- **SECURITY FIX**: Frontend API client automatically fetches and includes CSRF tokens in request headers
- **SECURITY FIX**: Applied whitespace trimming to ALLOWED_ORIGINS parsing to prevent misconfiguration issues

## Project Architecture

### Backend (Flask + Socket.IO)
- **Port**: 8000 (internal)
- **Framework**: Flask with Flask-SocketIO for realtime features
- **Database**: SQLite (portal.db) with SQLAlchemy ORM
- **Authentication**: Flask-Login with bcrypt password hashing
- **Session Management**: 8-hour sessions, HttpOnly cookies, SameSite=Lax
- **Scheduled Tasks**: APScheduler for hourly cleanup and daily backups
- **File Storage**: uploads/images/ (3hr expiry), uploads/docs/ (24hr expiry)

### Frontend (React + Vite)
- **Port**: 5000 (exposed to web)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **State Management**: TanStack Query for server state
- **Routing**: wouter for lightweight routing
- **Styling**: Tailwind CSS with custom monochrome theme
- **Realtime**: Socket.IO client for chat and notifications
- **PWA**: Service worker (sw.js) with offline support

### Database Schema

1. **User**: id, username, password_hash, phone, reg_number, role, department_name, created_at, tutorial_seen
2. **Department**: id, name
3. **Room**: id, name, type, department_name, created_by_id, created_at
4. **Message**: id, sender_id, room_id, text, formatting, image_filename, image_expires_at, reply_to, edited_at, deleted_at, reactions, timestamp
5. **Notification**: id, type, content, timestamp, posted_by_id, target_department_name, reactions, read_by
6. **Document**: id, owner_id, filename, mime, uploaded_at, expires_at, watermark
7. **ActivityLog**: id, actor_id, action, target_type, target_id, meta, timestamp
8. **PushSubscription**: id, user_id, subscription_json

## User Roles & Permissions

1. **Student**
   - Sign up with username, password, phone, registration number, and department
   - View notifications (department + general)
   - Join chat rooms (General + department room)
   - Upload/download documents
   - React to messages and notifications
   - View other students' profiles

2. **Department Governor**
   - All student features
   - Post notifications to own department or generally (via checkbox)
   - Delete own notifications
   - View all users in department

3. **Faculty Governor**
   - All student features
   - Post general notifications (visible to all)
   - Delete own notifications
   - View all users

4. **Admin**
   - Full system access
   - Create/delete custom chat rooms
   - Post notifications anywhere
   - Delete any notification
   - Manual backup/restore
   - View all documents and users

## Key Features

### Realtime Chat
- Multiple rooms: General, department-specific, and custom
- Message features: text, formatting, images, reactions, replies, edit, delete
- @username mentions with notifications
- @ai integration for AI responses (configurable endpoint)
- Typing indicators
- Telegram-style UI with message bubbles
- Offline queue and IndexedDB storage

### Notifications System
- Three types: 🚨 Urgent, 📢 Regular, ⛵ Cruise
- Department targeting or general broadcast
- Emoji reactions with counts
- Read/unread tracking per user
- Push notifications to subscribed devices
- Real-time updates via Socket.IO

### Document Management
- Upload PDF, DOC, DOCX (max 20MB)
- Optional watermarking with developer contact
- Role-based visibility (department access)
- Download with authentication
- Automatic expiry and cleanup

### Security Features
- Bcrypt password hashing (never plaintext)
- HttpOnly session cookies with SameSite=Lax
- CSRF protection via Flask
- Input sanitization on server and client
- File type and size validation
- Safe filename generation with secrets.token_hex()

### Backup System
- Automated daily backups (configurable interval)
- Manual backup via admin panel
- Optional Telegram delivery
- Stores hashed passwords only
- Backup on significant events (signup, notification post/delete)

## Configuration

All configuration is in `backend/config.json`:

```json
{
  "app": {
    "name": "CIESA Faculty Portal",
    "developer_contact": "Suleiman <dev@example.com>",
    "image_expire_hours": 3,
    "document_expire_hours": 24,
    "session_timeout_minutes": 480
  },
  "departments": ["Computer Engineering", "Information Systems", "Software Engineering", "Network Engineering"],
  "admin": {"username": "admin", "password": "ChangeMe123!"},
  "faculty_governor": {"username": "faculty_gov", "password": "ChangeMe123!"},
  "department_governors": [...],
  "ai": {"endpoint": "https://api.example.com/v1/ai"},
  "telegram": {"bot_token": "", "chat_id": ""},
  "push": {"vapid_public_key": "", "vapid_private_key": "", "contact_email": "dev@example.com"},
  "system": {"backup_interval_hours": 24, "telegram_send_interval_hours": 24}
}
```

**SECURITY NOTE**: Change default passwords before production deployment!

## Development Workflow

### Starting the Application
Both workflows are configured and auto-start:
1. **Backend**: `cd backend && python app.py` (port 8000)
2. **Frontend**: `cd frontend && npm run dev` (port 5000)

### Default Credentials
- Admin: `admin` / `ChangeMe123!`
- Faculty Governor: `faculty_gov` / `ChangeMe123!`
- Department Governors: `{dept}_gov` / `ChangeMe123!`

### Common Tasks

**Add a new department**:
1. Edit `backend/config.json`, add to `departments` array
2. Optionally add a department governor in `department_governors`
3. Restart backend workflow

**Change session timeout**:
1. Edit `backend/config.json`, update `app.session_timeout_minutes`
2. Restart backend workflow

**Enable Telegram backups**:
1. Create bot via @BotFather, get token
2. Get chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Update `telegram` section in config.json
4. Restart backend workflow

**Generate VAPID keys for push notifications**:
```python
from pywebpush import webpush
vapid = webpush.generate_vapid_keys()
print(vapid['public_key'], vapid['private_key'])
```
Add to `push` section in config.json

## File Structure

```
.
├── backend/
│   ├── app.py              # Main Flask app with all endpoints and Socket.IO handlers
│   ├── models.py           # SQLAlchemy database models
│   ├── config.json         # Application configuration
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Watermark, Header
│   │   ├── pages/          # Login, Signup, Dashboard, Chat, Documents, Profile, AdminPanel
│   │   ├── lib/            # api.ts, socket.ts, theme.ts
│   │   ├── hooks/          # useAuth.ts
│   │   ├── types/          # TypeScript interfaces
│   │   ├── App.tsx         # Main app with routing
│   │   ├── main.tsx        # Entry point with QueryClient
│   │   └── index.css       # Tailwind + theme CSS variables
│   ├── public/
│   │   ├── sw.js           # Service worker for PWA
│   │   └── manifest.json   # PWA manifest
│   ├── vite.config.ts      # Vite config with proxy to backend:8000
│   ├── tailwind.config.js  # Tailwind with custom colors
│   └── package.json        # Node dependencies
├── data/                   # Backup storage (admin_backup.json)
├── uploads/
│   ├── images/             # Chat images (auto-expire 3 hours)
│   └── docs/               # Uploaded documents (auto-expire 24 hours)
├── README.md               # Comprehensive documentation
└── replit.md               # This file
```

## Scheduled Tasks

1. **Cleanup expired files**: Runs every hour
   - Deletes images older than 3 hours
   - Deletes documents past expiry date
   - Removes DB records for expired items

2. **Generate backup**: Runs every 24 hours (configurable)
   - Creates `data/admin_backup.json` with all users and notifications
   - Stores hashed passwords only

3. **Send to Telegram**: Runs every 24 hours (if configured)
   - Sends current backup file to Telegram bot
   - Includes timestamp in caption

## Known Limitations

1. **SQLite**: Single-file database, not ideal for high concurrency. Migrate to PostgreSQL/MySQL for production.
2. **Local file storage**: Images and documents stored in uploads/ directory. Consider object storage (S3, etc.) for scale.
3. **No encryption**: Backup files contain hashed passwords but are not encrypted. Add encryption layer for sensitive environments.
4. **Single server**: No load balancing or horizontal scaling. Socket.IO requires sticky sessions if scaling.
5. **No email**: Uses Telegram for backups. Could add email notifications.

## Future Enhancements

- Voice messages in chat
- Video/audio calls
- File previews in browser (PDF viewer)
- Advanced search (messages, notifications, documents)
- Analytics dashboard for admin
- Batch document uploads
- Folder organization for documents
- Message threading UI improvements
- Mobile app (React Native)
- End-to-end encryption for messages

## Troubleshooting

**Socket.IO not connecting**:
- Check backend is running on port 8000
- Verify frontend proxy in vite.config.ts
- Check browser console for errors

**Push notifications not working**:
- Generate VAPID keys and add to config.json
- HTTPS required in production
- Check browser notification permissions

**Images not loading**:
- Check uploads/images/ directory exists
- Verify image hasn't expired (3 hour default)
- Check backend logs for errors

**Backup not sending to Telegram**:
- Verify bot_token and chat_id in config.json
- Test bot by messaging it manually
- Check backend logs for API errors

## Dependencies

### Backend
- Flask 3.x: Web framework
- Flask-SocketIO 5.x: Realtime communication
- Flask-Login 0.6.x: Session management
- SQLAlchemy 2.x: ORM
- bcrypt 4.x: Password hashing
- PyWebPush 2.x: Web push notifications
- APScheduler 3.x: Scheduled tasks
- python-telegram-bot 22.x: Telegram integration
- eventlet: Async support for Socket.IO

### Frontend
- React 18: UI framework
- TypeScript 5: Type safety
- Vite 5: Build tool and dev server
- TanStack Query 5: Server state management
- socket.io-client 4: Realtime client
- wouter 3: Lightweight routing
- Tailwind CSS 3: Utility-first CSS
- lucide-react: Icon library
- date-fns: Date formatting

## Developer Notes

- Backend uses scoped sessions for thread safety with SQLAlchemy
- Frontend uses TanStack Query for automatic caching and refetching
- Service worker caches static assets and provides offline support
- IndexedDB planned for offline message queue (not fully implemented)
- Theme stored in localStorage, applied via data-theme attribute
- All API calls include credentials for session cookies
- Socket.IO uses rooms for efficient message broadcasting
- Activity logging tracks all significant user actions
