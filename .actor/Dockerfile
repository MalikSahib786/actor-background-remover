# Use the official Apify Node.js image (Debian based for Python compatibility)
FROM apify/actor-node:20

# Switch to root to install system dependencies
USER root

# Install Python 3, Pip, and system dependencies for image processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment for Python to avoid conflict with system packages
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy python requirements
COPY requirements.txt ./

# Install Python dependencies
# --no-cache-dir reduces image size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Trigger a download of the u2net model during build time 
# so the user doesn't wait for it on the first run.
RUN python3 -c "from rembg import new_session; new_session('u2net')"

# Copy source code
COPY . ./

# Switch back to non-root user for security
USER node

# Start the actor
CMD npm start
