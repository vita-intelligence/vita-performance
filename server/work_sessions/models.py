import re
from django.db import models
from django.conf import settings
from workstations.models import Workstation
from workers.models import Worker
from items.models import Item


def _slugify_label(label):
    """Turn a form field label into a snake_case identifier safe for formula use."""
    s = re.sub(r'[^0-9a-zA-Z]+', '_', (label or '').strip().lower()).strip('_')
    return s or 'field'


class WorkSession(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('verified', 'Verified'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='work_sessions')
    workers = models.ManyToManyField(Worker, through='SessionWorker', related_name='work_sessions')
    workstation = models.ForeignKey(Workstation, on_delete=models.CASCADE, related_name='sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    performance_percentage = models.FloatField(null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')
    quantity_produced = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    quantity_rejected = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    override_target_quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    override_target_duration = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    override_task_name = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'work_sessions'
        ordering = ['-start_time']

    def __str__(self):
        worker_names = ", ".join(w.full_name for w in self.workers.all())
        return f'{worker_names} @ {self.workstation.name} ({self.start_time})'

    def _build_formula_context(self, target_qty, target_dur, duration, worker_count, expected_qty):
        """Build the variable namespace for performance_formula evaluation."""
        produced = float(self.quantity_produced or 0)
        rejected = float(self.quantity_rejected or 0)
        accepted = produced - rejected
        default_pct = round((accepted / expected_qty) * 100, 2) if expected_qty > 0 else 0

        ctx = {
            'produced': produced,
            'rejected': rejected,
            'accepted': accepted,
            'duration': duration,
            'workers': worker_count,
            'target_quantity': float(target_qty),
            'target_duration': float(target_dur),
            'expected': expected_qty,
            'default': default_pct,
        }

        # Numeric form-field answers from this session's end/both forms,
        # exposed as form_<snake_label>. Quietly skip non-numeric values.
        try:
            for response in self.form_responses.select_related('form').all():
                form = response.form
                if form.trigger not in ('end', 'both'):
                    continue
                schema = form.schema or []
                for field in schema:
                    if field.get('type') not in ('number', 'rating'):
                        continue
                    label = field.get('label') or field.get('id')
                    raw = (response.answers or {}).get(field.get('id'))
                    try:
                        value = float(raw)
                    except (TypeError, ValueError):
                        continue
                    key = f'form_{_slugify_label(label)}'
                    ctx[key] = value
        except Exception:
            # Form access can fail if the session was just created; ignore
            # rather than break performance computation.
            pass

        return ctx

    def _evaluate_custom_formula(self, formula, context):
        """Safely evaluate a user-provided formula. Returns None on any failure."""
        try:
            from simpleeval import SimpleEval, NameNotDefined, FunctionNotDefined
        except ImportError:
            return None
        try:
            evaluator = SimpleEval(
                names=context,
                functions={
                    'min': min,
                    'max': max,
                    'round': round,
                    'abs': abs,
                },
            )
            result = evaluator.eval(formula)
            return float(result)
        except (NameNotDefined, FunctionNotDefined, SyntaxError, TypeError, ValueError, ZeroDivisionError):
            return None
        except Exception:
            return None

    def compute_performance(self):
        if not self.quantity_produced or not self.workstation:
            return None

        target_qty = self.override_target_quantity or self.workstation.target_quantity
        target_dur = self.override_target_duration or self.workstation.target_duration

        if not target_qty or not target_dur:
            return None

        if not self.end_time or not self.start_time:
            return None

        quantity_accepted = float(self.quantity_produced) - float(self.quantity_rejected or 0)
        # Use raw seconds instead of the rounded duration_hours property so
        # sub-minute sessions still produce a meaningful percentage.
        duration_seconds = (self.end_time - self.start_time).total_seconds()
        if duration_seconds <= 0:
            return None
        duration = duration_seconds / 3600.0

        # Expected output scales with the number of workers on the session:
        # if the workstation target is 1 unit/hour, two people working 1 hour
        # are expected to produce 2 units to hit 100%.
        worker_count = max(1, self.workers.count())

        expected_qty = (duration / float(target_dur)) * float(target_qty) * worker_count
        if expected_qty <= 0:
            return None

        # Custom workstation formula (optional) — falls back to the default
        # calculation if it can't evaluate.
        formula = (self.workstation.performance_formula or '').strip()
        if formula:
            context = self._build_formula_context(
                target_qty, target_dur, duration, worker_count, expected_qty,
            )
            result = self._evaluate_custom_formula(formula, context)
            if result is not None:
                return round(result, 2)

        return round((quantity_accepted / expected_qty) * 100, 2)

    def save_performance(self):
        self.performance_percentage = self.compute_performance()
        WorkSession.objects.filter(pk=self.pk).update(
            performance_percentage=self.performance_percentage
        )

    @property
    def duration_hours(self):
        if not self.end_time:
            return None
        delta = self.end_time - self.start_time
        return round(delta.total_seconds() / 3600, 2)

    @property
    def overtime_hours(self):
        if not self.duration_hours:
            return None
        effective = self.workstation.get_effective_settings()
        threshold = float(effective['overtime_threshold'])
        return max(0, self.duration_hours - threshold)

    @property
    def wage_cost(self):
        if not self.duration_hours:
            return None
        effective = self.workstation.get_effective_settings()
        regular_hours = min(self.duration_hours, float(effective['overtime_threshold']))
        overtime_hours = self.overtime_hours or 0
        multiplier = float(effective['overtime_multiplier'])
        total = 0
        for worker in self.workers.all():
            hourly_rate = float(worker.hourly_rate)
            total += (regular_hours * hourly_rate) + (overtime_hours * hourly_rate * multiplier)
        return round(total, 2)


class SessionWorker(models.Model):
    session = models.ForeignKey(WorkSession, on_delete=models.CASCADE, related_name='session_workers')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='worker_sessions')

    class Meta:
        db_table = 'session_workers'
        unique_together = ('session', 'worker')

    def __str__(self):
        return f'{self.worker.full_name} in session {self.session.id}'