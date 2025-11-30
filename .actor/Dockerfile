FROM node:20-bookworm

USER root

# 1. Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Python Environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 3. Setup Environment Variables
# U2NET_HOME: Where the AI model is stored
# NUMBA_CACHE_DIR: Speeds up startup by allowing caching in /tmp
ENV U2NET_HOME=/opt/u2net
ENV NUMBA_CACHE_DIR=/tmp

# 4. Install Python Requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Download Model (Runs as Root)
# This downloads 'isnet-general-use.onnx' into /opt/u2net
RUN python3 -c "from rembg import new_session; new_session('isnet-general-use')"

# 6. 🚨 CRITICAL FIX: Transfer ownership to the 'node' user
# This ensures the Actor can read the file at runtime
RUN mkdir -p /opt/u2net && \
    chown -R node:node /opt/u2net && \
    chmod -R 755 /opt/u2net

# 7. Copy App & Install Node Dependencies
COPY . ./
RUN npm install

# 8. Switch to secure user
USER node

CMD [ "npm", "start" ]
