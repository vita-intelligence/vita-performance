# ============================================================
# Vita Performance — Django API
# Python 3.12 slim with Daphne ASGI server
# ============================================================

FROM python:3.12-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# Dependencies stage
# ============================================================
FROM base AS dependencies

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============================================================
# Runtime stage
# ============================================================
FROM dependencies AS runtime

WORKDIR /app

# Copy project files
COPY . .

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Migrate, collect static, then start
CMD ["sh", "-c", "python manage.py migrate --no-input && python manage.py collectstatic --no-input && daphne -b 0.0.0.0 -p 8000 core.asgi:application"]