FROM node:20-bookworm

USER root

# Install Python and system libraries
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# PRE-DOWNLOAD THE HIGH-QUALITY MODEL (isnet-general-use)
# This prevents downloading it during the run
RUN python3 -c "from rembg import new_session; new_session('isnet-general-use')"

COPY . ./

RUN npm install

CMD [ "npm", "start" ]
