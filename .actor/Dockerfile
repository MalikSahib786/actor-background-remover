# We use the official Node.js 20 (Bookworm/Debian) image.
# This guarantees 'apt-get' exists and Python wheels (binaries) work correctly.
FROM node:20-bookworm

# Check current user (Standard Node image defaults to root, but let's be safe)
USER root

# 1. Install Python 3, Pip, and system dependencies for AI (OpenMP/libgomp)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Create and activate a Virtual Environment for Python
# This prevents conflicts with system-level python packages
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 3. Copy Python requirements first (caching layer)
COPY requirements.txt ./

# 4. Install Python dependencies
# --no-cache-dir keeps the image smaller
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Pre-download the U2NET model to embed it in the Docker image
# This ensures users don't wait 10s for the download on the first run.
RUN python3 -c "from rembg import new_session; new_session('u2net')"

# 6. Copy the rest of the application code
COPY . ./

# 7. Install Node.js dependencies
RUN npm install

# 8. Define the start command
CMD [ "npm", "start" ]
