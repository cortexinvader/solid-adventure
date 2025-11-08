
import os

bind = f"0.0.0.0:{os.environ.get('PORT', 8000)}"
workers = 1
worker_class = 'eventlet'
timeout = 120
keepalive = 5
errorlog = '-'
accesslog = '-'
loglevel = 'info'
