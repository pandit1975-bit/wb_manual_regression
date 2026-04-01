from django.db import models


# =========================
# SERVICES MASTER
# =========================
class Service(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


# =========================
# REQUEST GROUP
# =========================
class RequestGroup(models.Model):
    name = models.CharField(max_length=100)

    # default services for group
    services = models.ManyToManyField(
        Service,
        blank=True,
        related_name="groups"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# =========================
# GROUP ITEM
# =========================
class RequestGroupItem(models.Model):
    group = models.ForeignKey(
        RequestGroup,
        on_delete=models.CASCADE,
        related_name="items"
    )

    environment = models.CharField(max_length=10)
    request_id = models.CharField(max_length=50)

    services = models.ManyToManyField(
        Service,
        blank=True,
        related_name="group_items"
    )

    created_at = models.DateTimeField(auto_now_add=True)  # ADD THIS

    def __str__(self):
        return f"{self.group.name} - {self.request_id}"


# =========================
# WORKBENCH REQUEST
# =========================
class WorkbenchRequest(models.Model):

    ENV_CHOICES = [
        ('stage', 'Stage'),
        ('prod', 'Production'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    environment = models.CharField(max_length=10, choices=ENV_CHOICES)
    request_id = models.CharField(max_length=50)

    # group link
    group = models.ForeignKey(
        RequestGroup,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="requests"
    )

    # request-level services (override)
    services = models.ManyToManyField(
        Service,
        blank=True,
        related_name="requests"
    )

    job_url = models.URLField(null=True, blank=True)
    url = models.TextField()

    overall_status = models.CharField(max_length=50, null=True, blank=True)
    current_status = models.CharField(max_length=50, null=True, blank=True)

    submit_date = models.DateTimeField(null=True, blank=True)
    submitter = models.CharField(max_length=100, null=True, blank=True)

    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    cookies = models.JSONField(null=True, blank=True)
    sub_jobs = models.JSONField(null=True, blank=True)

    queue = models.IntegerField(default=0, db_index=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    job_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    error_message = models.TextField(
        blank=True,
        null=True
    )

    def __str__(self):
        return f"{self.request_id} ({self.environment})"