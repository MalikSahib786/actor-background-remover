FROM node:20-bookworm

USER root

# 1. Install System Deps
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Python
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 3. Optimizations (Cache & Model Paths)
ENV U2NET_HOME=/opt/u2net
ENV NUMBA_CACHE_DIR=/tmp

# 4. Install Requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 5. ⚡ SPEED BOOST: Pre-compile and Pre-load EVERYTHING ⚡
# We run a dummy background removal on a black square during the build.
# This forces Numba to compile JIT functions and writes them to the disk image.
# It also ensures the model is 100% downloaded.
RUN python3 -c "import numpy; from rembg import remove, new_session; \
    s = new_session('isnet-general-use'); \
    dummy = numpy.zeros((100,100,3), dtype=numpy.uint8); \
    remove(dummy, session=s)"

# 6. Permissions
RUN mkdir -p /opt/u2net && \
    chown -R node:node /opt/u2net && \
    chmod -R 755 /opt/u2net

# 7. App Setup
COPY . ./
RUN npm install

USER node
CMD [ "npm", "start" ]
