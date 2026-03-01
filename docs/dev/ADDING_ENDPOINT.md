# Adding a New Endpoint

Step-by-step guide for adding a new endpoint across the Django + Next.js stack.

---

## 1. Django — Model (if needed)

If your endpoint requires a new model, add it to the relevant app's `models.py`. Use one line per field:

```python
from django.db import models
from django.conf import settings

class Workout(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workouts')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workouts'
```

Then run migrations:

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 2. Django — Serializer

Create or add to the relevant serializer file inside the app's `serializers/` folder:

```python
# workout/serializers/workout.py
from rest_framework import serializers
from ..models import Workout

class WorkoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workout
        fields = ('id', 'name', 'created_at')
        read_only_fields = ('id', 'created_at')
```

Export it from `serializers/__init__.py`:

```python
from .workout import WorkoutSerializer
```

---

## 3. Django — View

Create or add to the relevant view file inside the app's `views/` folder:

```python
# workout/views/workout.py
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import Workout
from ..serializers import WorkoutSerializer

class WorkoutListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workouts = Workout.objects.filter(user=request.user)
        serializer = WorkoutSerializer(workouts, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WorkoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

Export it from `views/__init__.py`:

```python
from .workout import WorkoutListView
```

---

## 4. Django — URL

Register the view in the app's `urls.py`:

```python
from django.urls import path
from .views import WorkoutListView

urlpatterns = [
    path('workouts/', WorkoutListView.as_view(), name='workout-list'),
]
```

Register the app in core `urls.py` under `api_patterns`:

```python
api_patterns = [
    path('accounts/', include('accounts.urls')),
    path('settings/', include('settings.urls')),
    path('workouts/', include('workout.urls')),  # add here
]
```

---

## 5. Next.js — Type

Add the response type to `src/types/`:

```ts
// src/types/workout.ts
export interface Workout {
  id: number;
  name: string;
  created_at: string;
}

export interface CreateWorkoutPayload {
  name: string;
}
```

---

## 6. Next.js — Config

Add the new endpoint to `src/config/api.ts`:

```ts
endpoints: {
  auth: { ... },
  settings: { ... },
  workout: {
    list: "/api/workouts/",
  },
},
```

---

## 7. Next.js — Service

Create `src/services/workout.service.ts`:

```ts
import api from "@/lib/api";
import { API_CONFIG } from "@/config/api";
import { Workout, CreateWorkoutPayload } from "@/types/workout";

const { workout } = API_CONFIG.endpoints;

export const workoutService = {
  getAll: async (): Promise<Workout[]> => {
    const { data } = await api.get<Workout[]>(workout.list);
    return data;
  },

  create: async (payload: CreateWorkoutPayload): Promise<Workout> => {
    const { data } = await api.post<Workout>(workout.list, payload);
    return data;
  },
};
```

---

## 8. Next.js — Store (if needed)

Only create a store if the data needs to persist across page refreshes (like user or settings). For regular data like lists, Tanstack Query cache is enough.

```ts
// src/lib/stores/workout.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Workout } from "@/types/workout";

interface WorkoutStore {
  workouts: Workout[];
  setWorkouts: (workouts: Workout[]) => void;
  clearWorkouts: () => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      workouts: [],
      setWorkouts: (workouts) => set({ workouts }),
      clearWorkouts: () => set({ workouts: [] }),
    }),
    { name: "workout-storage" },
  ),
);
```

Export from `src/lib/stores/index.ts`:

```ts
export { useWorkoutStore } from "./workout.store";
```

---

## 9. Next.js — Hook

Create `src/hooks/useWorkout.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToast } from "@heroui/react";
import { workoutService } from "@/services/workout.service";
import { CreateWorkoutPayload } from "@/types/workout";
import { getErrorMessage } from "@/lib/utils";

const WORKOUT_KEY = ["workouts"];

export const useWorkout = () => {
  const queryClient = useQueryClient();

  const { data: workouts, isLoading } = useQuery({
    queryKey: WORKOUT_KEY,
    queryFn: workoutService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkoutPayload) =>
      workoutService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_KEY });
      addToast({ title: "Workout created", color: "success", timeout: 3000 });
    },
    onError: (error) => {
      addToast({
        title: "Failed to create workout",
        description: getErrorMessage(error),
        color: "danger",
        timeout: 4000,
      });
    },
  });

  return {
    workouts,
    isLoading,
    createWorkout: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
```

---

## 10. Next.js — Component

Use the hook in your page or component:

```tsx
"use client";

import { useWorkout } from "@/hooks/useWorkout";

export default function WorkoutsPage() {
  const { workouts, isLoading } = useWorkout();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      {workouts?.map((workout) => (
        <p key={workout.id}>{workout.name}</p>
      ))}
    </div>
  );
}
```

---

## Summary Checklist

| Step | Django            | Next.js           |
| ---- | ----------------- | ----------------- |
| 1    | Model + migration | —                 |
| 2    | Serializer        | —                 |
| 3    | View (CBV)        | —                 |
| 4    | URL               | —                 |
| 5    | —                 | Type              |
| 6    | —                 | Config endpoint   |
| 7    | —                 | Service           |
| 8    | —                 | Store (if needed) |
| 9    | —                 | Hook              |
| 10   | —                 | Component         |

## When to create a Zustand store

| Data                      | Store needed?                           |
| ------------------------- | --------------------------------------- |
| User profile              | ✅ Yes — needed instantly on every page |
| User settings             | ✅ Yes — needed instantly on every page |
| Lists (workouts, workers) | ❌ No — Tanstack Query cache is enough  |
| Dashboard stats           | ❌ No — Tanstack Query cache is enough  |
