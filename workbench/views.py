from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.utils.timezone import localtime, now
from .models import RequestGroup, RequestGroupItem, WorkbenchRequest
from .services.workbench_service import build_workbench_url
from .services.submit_job_api import submit_job
import threading
from .services.tracker_service import track_job
from django.conf import settings
from .models import RequestGroup
from .models import WorkbenchRequest

# ========================
# HOME PAGE
# ========================
from .models import RequestGroup

def workbench_home(request):

    if request.method == "POST":
        env = request.POST.get("environment")
        request_id = request.POST.get("request_id")

        if env and request_id:
            url = build_workbench_url(env, request_id)

            WorkbenchRequest.objects.create(
                environment=env,
                request_id=request_id,
                group_id=id,
                url=url,
                status="pending"
            )

            return redirect("workbench_home")

    records = WorkbenchRequest.objects.order_by("-created_at")

    # ADD THIS
    groups = RequestGroup.objects.order_by("name")

    return render(request, "workbench/index.html", {
        "records": records,
        "groups": groups   # <-- ADD THIS
    })

# ========================
# RUN REQUEST
# ========================
def run_request(request, pk):
    obj = get_object_or_404(WorkbenchRequest, pk=pk)

    obj.status = "running"
    obj.started_at = now().replace(microsecond=0)

    obj.job_id = None
    obj.current_status = None
    obj.overall_status = None
    obj.submitter = None
    obj.completed_at = None
    obj.error_message = None

    obj.save()

    def background_task(obj_id):
        obj = WorkbenchRequest.objects.get(pk=obj_id)

        try:
            submit_job(obj)

            obj.refresh_from_db()

            if obj.job_id:
                threading.Thread(
                    target=track_job,
                    args=(obj.id,),
                    daemon=False
                ).start()

        except Exception as e:

            obj.refresh_from_db()

            if obj.status != "completed":
                obj.status = "failed"
                obj.completed_at = now().replace(microsecond=0)
                obj.error_message = str(e)
                obj.save()

    threading.Thread(
        target=background_task,
        args=(obj.id,),
        daemon=False
    ).start()

    # 🔥 FIX HERE
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        return JsonResponse({"success": True})

    return redirect("workbench_home")

# ========================
# RECHECK JOB
# ========================
def recheck_job(request, pk):

    obj = get_object_or_404(WorkbenchRequest, pk=pk)

    if not obj.job_id:
        return JsonResponse({"error": "No job id"}, status=400)

    obj.status = "running"
    obj.save()

    threading.Thread(
        target=track_job,
        args=(obj.id,),
        daemon=True
    ).start()

    return JsonResponse({"success": True})

# ========================
# HELPERS
# ========================
def format_time(dt):
    try:
        if not dt:
            return "-"
        return localtime(dt).strftime("%b %d, %Y, %I:%M %p")
    except Exception as e:
        print("⚠️ format_time error:", e)
        return "-"


def get_duration(start, end):
    if not start:
        return "-"

    end_time = end or now()  # live duration if still running
    diff = (end_time - start).total_seconds()

    mins = int(diff // 60)
    secs = int(diff % 60)

    if mins > 0:
        return f"{mins}m {secs}s"
    return f"{secs}s"


# ========================
# STATUS API
# ========================
from django.http import JsonResponse
from .models import WorkbenchRequest


def get_status(request, pk):
    try:
        # always fetch fresh
        obj = WorkbenchRequest.objects.get(pk=pk)

        # 🔥 IMPORTANT: refresh from DB (tracker updates in thread)
        obj.refresh_from_db()

        return JsonResponse({
            "status": obj.status or "-",
            "job_id": obj.job_id or "-",
            "overall_status": obj.overall_status or "-",
            "current_status": obj.current_status or "-",
            "submitter": obj.submitter or "-",

            # needed for clickable links
            "environment": obj.environment or "stage",

            # time fields
            "started_at": format_time(obj.started_at),
            "completed_at": format_time(obj.completed_at),

            # duration
            "duration": get_duration(obj.started_at, obj.completed_at),

            # optional
            "updated_at": format_time(obj.updated_at)
        })

    except WorkbenchRequest.DoesNotExist:
        return JsonResponse({}, status=404)


# ========================
# ADD REQUEST TO GROUP
# ========================
import json

def group_add(request, id):

    data = json.loads(request.body)

    RequestGroupItem.objects.create(
        group_id=id,
        environment=data.get("environment"),
        request_id=data.get("request_id")
    )

    return JsonResponse({"ok": True})

# ========================
# DELETE GROUP
# ========================
def group_delete(request, id):

    group = RequestGroup.objects.get(id=id)

    # delete dashboard rows
    WorkbenchRequest.objects.filter(group=group).delete()

    group.delete()

    return JsonResponse({"ok":True})


# ========================
# DELETE ITEM
# ========================
def group_delete_item(request, id):

    item = RequestGroupItem.objects.get(id=id)

    WorkbenchRequest.objects.filter(
        group=item.group,
        environment=item.environment,
        request_id=item.request_id
    ).delete()

    item.delete()

    return JsonResponse({"ok":True})

# ========================
# CREATE MASTER GROUP PAGE
# ========================

def group_master(request):

    if request.method == "POST" and "name" in request.POST:
        name = request.POST.get("name")

        if name:
            RequestGroup.objects.create(name=name)

        return redirect("group_master")

    groups = RequestGroup.objects.prefetch_related("items").all()

    return render(request,"workbench/group_master.html",{
        "groups":groups
    })

# ========================
# LOAD MASTER GROUP PAGE
# ========================
def load_group(request, id):

    group = RequestGroup.objects.get(id=id)

    created = []

    for item in group.items.all():

        # prevent duplicates
        exists = WorkbenchRequest.objects.filter(
            environment=item.environment,
            request_id=item.request_id,
            group=group
        ).exists()

        if not exists:

            url = build_workbench_url(
                item.environment,
                item.request_id
            )

            WorkbenchRequest.objects.create(
                environment=item.environment,
                request_id=item.request_id,
                url=url,
                group=group,
                status="pending"
            )

    return JsonResponse({"ok": True})

# ========================
# DELETE REQUEST
# ========================
def delete_request(request, pk):

    obj = WorkbenchRequest.objects.get(pk=pk)
    obj.delete()

    return JsonResponse({"ok": True})