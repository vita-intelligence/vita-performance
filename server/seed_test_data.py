"""Seed test data for maxchergik@gmail.com. Run via: python manage.py shell < seed_test_data.py"""
import random
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from workers.models import Worker, WorkerGroup, WorkerReputationEvent
from workstations.models import Workstation
from items.models import Item
from work_sessions.models import WorkSession
from dashboard.signals.session_signals import _auto_event_for_perf

User = get_user_model()
user = User.objects.get(email="maxchergik@gmail.com")
print(f"Seeding for: {user}")

random.seed(42)

# --- Worker Groups ---
GROUP_NAMES = [
    ("Production Line A", "Primary assembly team"),
    ("Production Line B", "Secondary assembly team"),
    ("Quality Control", "QC inspectors and verifiers"),
    ("Packaging", "Packaging and shipping crew"),
    ("Maintenance", "Equipment maintenance team"),
]
groups = []
for name, desc in GROUP_NAMES:
    g, _ = WorkerGroup.objects.get_or_create(user=user, name=name, defaults={"description": desc})
    groups.append(g)
print(f"Groups: {len(groups)}")

# --- Workers ---
FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
               "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
               "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
               "Matthew", "Betty", "Anthony", "Helen", "Mark", "Sandra"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
              "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
              "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White"]

workers = list(Worker.objects.filter(user=user))
existing_names = {w.full_name for w in workers}
target_workers = 30
to_create = max(0, target_workers - len(workers))

for i in range(to_create):
    while True:
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        if name not in existing_names:
            existing_names.add(name)
            break
    w = Worker(
        user=user,
        group=random.choice(groups),
        full_name=name,
        hourly_rate=Decimal(random.choice(["15.00", "18.50", "22.00", "25.00", "28.50", "32.00", "35.00"])),
        is_active=random.random() > 0.05,
        is_qa=random.random() < 0.15,
    )
    w.set_pin(f"{random.randint(1000, 9999)}")
    w.save()
    workers.append(w)
print(f"Workers: {Worker.objects.filter(user=user).count()}")

# --- Workstations ---
WS_DEFS = [
    ("Assembly Line 1", "Main assembly line for product A", 1200, 8.0, False),
    ("Assembly Line 2", "Secondary assembly line for product B", 800, 8.0, False),
    ("CNC Mill #1", "Precision milling station", 50, 8.0, False),
    ("CNC Mill #2", "Backup precision milling station", 50, 8.0, False),
    ("Welding Bay", "MIG/TIG welding station", 30, 8.0, False),
    ("Paint Booth", "Spray painting and curing", 100, 8.0, False),
    ("Packing Station", "Final product packaging", 400, 8.0, False),
    ("Quality Lab", "QC inspection lab", 200, 8.0, True),
    ("Maintenance Bay", "General maintenance shop", None, None, True),
]
workstations = list(Workstation.objects.filter(user=user))
existing_ws_names = {w.name for w in workstations}
for name, desc, qty, dur, general in WS_DEFS:
    if name in existing_ws_names:
        continue
    ws = Workstation.objects.create(
        user=user,
        name=name,
        description=desc,
        target_quantity=Decimal(qty) if qty else None,
        target_duration=Decimal(str(dur)) if dur else None,
        is_general=general,
        is_active=True,
    )
    workstations.append(ws)
print(f"Workstations: {Workstation.objects.filter(user=user).count()}")

# --- Items ---
ITEM_NAMES = [
    "M6 Bolt 20mm", "M8 Bolt 25mm", "M10 Bolt 30mm", "Hex Nut M6", "Hex Nut M8", "Hex Nut M10",
    "Washer 6mm", "Washer 8mm", "Washer 10mm", "Spring Steel 2mm", "Spring Steel 3mm",
    "Aluminum Bracket A1", "Aluminum Bracket B2", "Steel Plate 100x100", "Steel Plate 200x200",
    "Copper Wire 1.5mm", "Copper Wire 2.5mm", "PVC Tube 20mm", "PVC Tube 32mm", "Rubber Gasket Small",
    "Rubber Gasket Large", "Bearing 6201", "Bearing 6202", "Bearing 6203", "Hydraulic Hose 10m",
    "Pneumatic Fitting 1/4", "Pneumatic Fitting 3/8", "Electric Motor 1HP", "Electric Motor 2HP",
    "Gearbox Type A", "Pulley 50mm", "Pulley 80mm", "V-Belt A38", "V-Belt B42",
    "Control Panel V1", "Control Panel V2", "Sensor Probe XL", "LED Strip Cool", "LED Strip Warm",
    "Cooling Fan 120mm",
]
existing_items = set(Item.objects.filter(user=user).values_list("name", flat=True))
items = list(Item.objects.filter(user=user))
for name in ITEM_NAMES:
    if name in existing_items:
        continue
    items.append(Item.objects.create(user=user, name=name))
print(f"Items: {Item.objects.filter(user=user).count()}")

# --- Work Sessions ---
# Generate ~250 sessions across the past 90 days, mostly completed/verified
non_general_ws = [w for w in workstations if not w.is_general and w.target_quantity and w.target_duration]
active_workers = [w for w in workers if w.is_active]

now = timezone.now()
target_sessions = 250
existing_session_count = WorkSession.objects.filter(user=user).count()
to_create = max(0, target_sessions - existing_session_count)
print(f"Creating {to_create} sessions...")

NOTES_POOL = [
    None, None, None, None,
    "All good", "Ran smoothly", "Some material defects",
    "Trained new operator", "Tool change midway", "Minor pause for adjustment",
]

created = 0
for _ in range(to_create):
    ws = random.choice(non_general_ws)
    days_ago = random.randint(0, 89)
    hour = random.randint(7, 16)
    minute = random.choice([0, 15, 30, 45])
    start = (now - timedelta(days=days_ago)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    duration_h = round(random.uniform(0.5, 7.5), 2)
    end = start + timedelta(hours=duration_h)
    if end > now:
        continue

    target_qty = float(ws.target_quantity)
    target_dur = float(ws.target_duration)
    expected = (duration_h / target_dur) * target_qty
    perf_factor = random.uniform(0.55, 1.35)
    quantity = max(1, round(expected * perf_factor))
    rejected = round(quantity * random.uniform(0.0, 0.04)) if random.random() < 0.4 else None

    status = random.choices(["verified", "completed"], weights=[0.7, 0.3])[0]
    item = random.choice(items) if random.random() < 0.85 else None

    session = WorkSession.objects.create(
        user=user,
        workstation=ws,
        status=status,
        start_time=start,
        end_time=end,
        item=item,
        quantity_produced=Decimal(quantity),
        quantity_rejected=Decimal(rejected) if rejected else None,
        notes=random.choice(NOTES_POOL),
    )
    n_workers = random.choices([1, 1, 1, 2, 2, 3], k=1)[0]
    chosen = random.sample(active_workers, min(n_workers, len(active_workers)))
    session.workers.set(chosen)
    session.save_performance()
    created += 1

print(f"Sessions created: {created}")
print(f"Total sessions: {WorkSession.objects.filter(user=user).count()}")

# --- Reputation Events ---
# Backfill auto events from every verified session (idempotent — wipes previous).
print("Backfilling auto reputation events from verified sessions...")
WorkerReputationEvent.objects.filter(
    worker__user=user,
    event_type__in=WorkerReputationEvent.AUTO_TYPES,
).delete()

verified_sessions = (
    WorkSession.objects
    .filter(user=user, status='verified')
    .select_related('workstation')
    .prefetch_related('workers')
)
auto_created = 0
for session in verified_sessions:
    band = _auto_event_for_perf(session.performance_percentage)
    if not band:
        continue
    event_type, delta = band
    for w in session.workers.all():
        WorkerReputationEvent.objects.create(
            worker=w,
            session=session,
            event_type=event_type,
            score_delta=delta,
            reason=f'{session.performance_percentage}% on {session.workstation.name}',
            created_at=session.end_time or session.start_time,
        )
        auto_created += 1
print(f"Auto reputation events: {auto_created}")

# Random manual feedback events from QC inspectors.
qc_inspectors = [w for w in workers if w.is_qa and w.is_active]
manual_target = 60
WorkerReputationEvent.objects.filter(
    worker__user=user,
    event_type__in=WorkerReputationEvent.MANUAL_TYPES,
).delete()

POSITIVE_REASONS = [
    "Cleaned the line before leaving",
    "Helped a new operator",
    "Spotted a defect early",
    "Stayed late to finish the batch",
    "Excellent quality on every part",
    "Volunteered for the urgent run",
    "Caught a calibration drift",
    "Trained the apprentice this morning",
    "Reorganized the tool area",
    "Reported a near-miss safety issue",
]
NEGATIVE_REASONS = [
    "Late returning from break",
    "Forgot to log the rejected units",
    "Skipped the daily safety check",
    "Loud argument on the floor",
    "Left tools out at end of shift",
    "Missed the morning briefing",
    "Did not follow SOP for the cleaning step",
    "Used phone while machine was running",
    "Argued with QC about the reject count",
    "Walked off station without handover",
]

manual_created = 0
if qc_inspectors:
    candidates = [w for w in workers if w.is_active]
    for _ in range(manual_target):
        worker = random.choice(candidates)
        inspector = random.choice(qc_inspectors)
        positive = random.random() < 0.65
        days_ago = random.randint(0, 89)
        hour = random.randint(8, 17)
        when = (now - timedelta(days=days_ago)).replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)
        WorkerReputationEvent.objects.create(
            worker=worker,
            session=None,
            event_type='manual_positive' if positive else 'manual_negative',
            score_delta=10 if positive else -10,
            reason=random.choice(POSITIVE_REASONS if positive else NEGATIVE_REASONS),
            created_by=inspector,
            created_at=when,
        )
        manual_created += 1
print(f"Manual reputation events: {manual_created}")

# Recompute every worker's score so the stored field matches.
print("Recomputing worker reputation scores...")
for w in Worker.objects.filter(user=user):
    w.recompute_reputation_score()

print("Done.")
