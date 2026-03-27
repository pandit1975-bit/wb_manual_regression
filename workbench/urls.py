from django.urls import path
from . import views

urlpatterns = [
    path("", views.workbench_home, name="workbench_home"),

    # ✅ API
    path("status/<int:pk>/", views.get_status, name="workbench_status"),

    # ✅ Actions
    path("run/<int:pk>/", views.run_request, name="run_request"),
    path("delete/<int:pk>/", views.delete_request, name="delete_request"),
    path("recheck/<int:pk>/", views.recheck_job, name="recheck_job"),
]