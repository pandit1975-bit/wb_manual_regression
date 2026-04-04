from django.contrib import admin
from django.urls import include, path
from workbench.views import workbench_home

urlpatterns = [
    path('admin/', admin.site.urls),

    # ✅ HOME
    path('', workbench_home),

    # ✅ IMPORTANT: keep trailing slash
    path('workbench/', include('workbench.urls')),
    path('', include('workbench.urls')),
]