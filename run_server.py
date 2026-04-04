from waitress import serve
from django.core.wsgi import get_wsgi_application
from django.conf import settings
from django.contrib.staticfiles.handlers import StaticFilesHandler
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wb_manual_regression.settings')

application = get_wsgi_application()

# serve static files
application = StaticFilesHandler(application)

serve(
    application,
    host="0.0.0.0",
    port=8000,
    threads=8
)