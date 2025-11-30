FROM node:20-bookworm

# 1. Install system dependencies
USER root
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Python Virtual Environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 3. Prepare Model Directory with Open Permissions
# We use /opt/u2net so any user (root or node) can read it
RUN mkdir -p /opt/u2net && chmod 777 /opt/u2net
ENV U2NET_HOME=/opt/u2net

# 4. Install Dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. Pre-download Model (ISNET)
# This will now go into /opt/u2net because of the ENV var above
RUN python3 -c "from rembg import new_session; new_session('isnet-general-use')"

# 6. Copy App Code
COPY . ./
RUN npm install

# 7. Security: Switch to non-root user 'node' (Standard Practice)
USER node

CMD [ "npm", "start" ]
