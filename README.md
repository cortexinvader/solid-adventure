# CIESA Faculty Portal

A full-stack Progressive Web Application (PWA) for faculty communication and document management with realtime chat, notifications, and role-based access control.

## Features

- **Authentication & Authorization**: Role-based access control (student, department-governor, faculty-governor, admin) with secure bcrypt password hashing
- **Realtime Chat**: Socket.IO powered chat with multiple rooms, message formatting, reactions, threading, and AI integration
- **AI Integration**: Mention @ai in chat to get AI responses (configurable endpoint)
- **Notifications System**: Three types (urgent/regular/cruise) with reactions, read tracking, and push notifications
- **Document Management**: Upload PDF/DOC/DOCX with optional watermarking and expiry tracking
- **Push Notifications**: Web push notifications for new messages and announcements
- **PWA Support**: Offline caching, installable, and service worker for background sync
- **Admin Backup System**: Automated backups with optional Telegram delivery
- **Monochrome Theme**: Dark/light mode toggle with smooth transitions
- **Responsive Design**: Mobile-friendly Telegram-style interface

## Tech Stack

### Backend
- Flask (Python web framework)
- Flask-SocketIO (realtime communication)
- Flask-Login (authentication)
- SQLAlchemy (ORM)
- SQLite (database)
- bcrypt (password hashing)
- PyWebPush (push notifications)
- APScheduler (scheduled tasks)
- python-telegram-bot (backup delivery)

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- TanStack Query (server state)
- wouter (routing)
- socket.io-client (realtime)
- Service Worker (PWA)

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies (already installed via uv):
```bash
pip install -r requirements.txt
```

3. Configure the application by editing `config.json`:
   - Update default passwords (IMPORTANT for production!)
   - Configure departments
   - Set AI endpoint (optional)
   - Add Telegram bot credentials (optional)
   - Generate VAPID keys for push notifications (optional)

4. Run the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (already done):
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5000`

## Default Credentials

**IMPORTANT**: Change these credentials in `config.json` before deploying to production!

- Admin: `admin` / `ChangeMe123!`
- Faculty Governor: `faculty_gov` / `ChangeMe123!`
- Department Governors:
  - Computer Engineering: `ceng_gov` / `ChangeMe123!`
  - Information Systems: `isys_gov` / `ChangeMe123!`
  - Software Engineering: `seng_gov` / `ChangeMe123!`
  - Network Engineering: `neng_gov` / `ChangeMe123!`

Students can sign up with their own credentials.

## Configuration

### config.json Structure

```json
{
  "app": {
    "name": "CIESA Faculty Portal",
    "developer_contact": "Your Name <email@example.com>",
    "image_expire_hours": 3,
    "document_expire_hours": 24,
    "session_timeout_minutes": 480
  },
  "departments": ["List of department names"],
  "admin": {"username": "admin", "password": "YourSecurePassword"},
  "faculty_governor": {"username": "faculty_gov", "password": "YourSecurePassword"},
  "department_governors": [
    {"username": "gov_username", "password": "password", "department": "Department Name"}
  ],
  "ai": {"endpoint": "https://your-ai-api.com/v1/ai"},
  "telegram": {"bot_token": "YOUR_BOT_TOKEN", "chat_id": "YOUR_CHAT_ID"},
  "push": {
    "vapid_public_key": "YOUR_PUBLIC_KEY",
    "vapid_private_key": "YOUR_PRIVATE_KEY",
    "contact_email": "your@email.com"
  },
  "system": {
    "backup_interval_hours": 24,
    "telegram_send_interval_hours": 24
  }
}
```

### Generating VAPID Keys for Push Notifications

```python
from pywebpush import webpush, WebPushException
import json

# Generate VAPID keys
vapid_key = webpush.generate_vapid_keys()
print("Public Key:", vapid_key['public_key'])
print("Private Key:", vapid_key['private_key'])
```

### Setting up Telegram Bot

1. Create a bot with @BotFather on Telegram
2. Get the bot token
3. Get your chat ID by messaging the bot and visiting: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Add both to `config.json`

## Usage

### For Students
1. Sign up with username, password, phone, registration number, and select department
2. Complete the interactive tutorial on first login
3. Access dashboard for notifications
4. Join chat rooms (General and your department)
5. Upload and download documents

### For Department Governors
- All student features
- Post notifications to your department or generally
- Delete your own notifications

### For Faculty Governor
- All student features
- Post general notifications visible to all departments
- Delete own notifications

### For Admin
- Full access to all features
- Create/delete custom chat rooms
- Post notifications to any department or generally
- Delete any notification
- Create manual backups and send to Telegram
- View all documents and users

## Features Guide

### Chat System
- Join different rooms (General, Department-specific, or Custom)
- Send text messages with formatting
- Upload images (expire after 3 hours by default)
- React to messages with emojis
- Reply to messages (threading)
- Edit/delete your own messages
- Mention other users with @username
- Ask AI questions with @ai mention

### Notifications
- Three types: 🚨 Urgent, 📢 Regular, ⛵ Cruise
- React with emojis
- Mark as read/unread
- Department-targeted or general visibility
- Real-time updates via Socket.IO

### Documents
- Upload PDF, DOC, or DOCX files (max 20MB)
- Optional watermarking with developer contact
- Download documents
- Automatic expiry (configurable)

### Admin Panel
- Manual backup generation
- Send backup to Telegram
- Automated backups run every 24 hours (configurable)

## Security

### Password Security
- All passwords hashed with bcrypt before storage
- Never store plaintext passwords
- Session cookies are HttpOnly and SameSite=Lax

### CORS and CSRF Protection
- CORS restricted to trusted origins (localhost and Replit domains)
- CSRF tokens automatically generated and validated on all state-changing requests
- Frontend API client includes CSRF token in request headers
- Socket.IO connections also restricted to allowed origins
- Configure additional origins via `ALLOWED_ORIGINS` environment variable

**Environment Variable Configuration**:
```bash
export ALLOWED_ORIGINS="http://localhost:5000,https://yourdomain.com"
```

### File Security
- File type validation on upload
- Safe filename generation with secrets.token_hex()
- File size limits enforced
- Automatic cleanup of expired files

### Backup Security
**WARNING**: Backup files contain hashed passwords but should still be protected!

- Store backups in a secure location
- Do not commit `data/admin_backup.json` to version control
- Consider encrypting backups for additional security:

```python
from cryptography.fernet import Fernet

# Generate encryption key (store securely!)
key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt backup
with open('admin_backup.json', 'rb') as f:
    encrypted = cipher.encrypt(f.read())

with open('admin_backup.json.encrypted', 'wb') as f:
    f.write(encrypted)
```

## Deployment

### Using Gunicorn (Production)

```bash
cd backend
gunicorn --bind 0.0.0.0:5001 --worker-class eventlet -w 1 app:app
```

### Building Frontend for Production

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/` and can be served by any static file server or integrated with Flask.

### Environment Variables

Set the `SESSION_SECRET` environment variable for production:

```bash
export SESSION_SECRET="your-secure-random-secret-key"
```

## Database Migration

The application uses SQLite by default. To migrate to PostgreSQL or MySQL:

1. Update the database URL in `app.py`:
```python
engine = create_engine('postgresql://user:pass@localhost/dbname')
# or
engine = create_engine('mysql://user:pass@localhost/dbname')
```

2. Install the appropriate database driver:
```bash
pip install psycopg2-binary  # for PostgreSQL
# or
pip install mysqlclient  # for MySQL
```

3. Run the application to create tables automatically

## Scheduled Tasks

The application runs these automated tasks:

- **Image/Document Cleanup**: Runs every hour to delete expired files
- **Backup Generation**: Runs every 24 hours (configurable)
- **Telegram Backup Send**: Runs every 24 hours if configured

## Troubleshooting

### Socket.IO Connection Issues
- Ensure both frontend and backend are running
- Check that CORS is properly configured
- Verify the Socket.IO endpoint in `frontend/src/lib/socket.ts`

### Push Notifications Not Working
- Generate and configure VAPID keys in `config.json`
- Ensure HTTPS in production (required for web push)
- Check browser permissions for notifications

### Backup Not Sending to Telegram
- Verify bot token and chat ID in `config.json`
- Test the bot manually by sending a message
- Check backend logs for errors

## Project Structure

```
.
├── backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # SQLAlchemy database models
│   ├── config.json         # Application configuration
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities (API, socket, theme)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Main App component
│   │   └── main.tsx        # Entry point
│   ├── public/
│   │   ├── sw.js           # Service worker
│   │   └── manifest.json   # PWA manifest
│   └── package.json        # Node dependencies
├── data/                   # Backup storage directory
├── uploads/
│   ├── images/             # Uploaded chat images
│   └── docs/               # Uploaded documents
└── README.md               # This file
```

## Contributing

This is a faculty portal project. Modifications should maintain security standards and follow the existing code structure.

## License

Internal use for CIESA faculty only.

## Support

For issues or questions, contact the developer at the email specified in the watermark (bottom-right of all pages).
