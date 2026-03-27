from django.db import models

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

    # ADD THIS
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