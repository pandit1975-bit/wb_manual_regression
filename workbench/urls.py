from django.urls import path
from . import views

urlpatterns = [
    path("", views.workbench_home, name="workbench_home"),
    path("delete/<int:pk>/", views.delete_request, name="delete_request"),
    path("delete/<int:pk>/", views.delete_request),

    # ✅ API
    path("status/<int:pk>/", views.get_status, name="workbench_status"),

    # ✅ Actions
    path("run/<int:pk>/", views.run_request, name="run_request"),
    path("recheck/<int:pk>/", views.recheck_job, name="recheck_job"),
     # ✅ Groups
    path("groups/", views.group_master, name="group_master"),
    path("groups/add/<int:id>/", views.group_add),
    path("groups/delete/<int:id>/", views.group_delete),
    path("groups/delete-item/<int:id>/", views.group_delete_item),
    path("groups/load/<int:id>/", views.load_group),   # THIS ONE
    path("groups/<int:id>/add-service/", views.add_group_service),
    path("services/catalog/", views.service_catalog),
    path("groups/<int:id>/remove-service/", views.remove_group_service),
    path("items/<int:id>/add-service/", views.add_item_service),
    path("items/<int:id>/remove-service/", views.remove_item_service),
    path("workbench/groups/json/", views.groups_json)

]