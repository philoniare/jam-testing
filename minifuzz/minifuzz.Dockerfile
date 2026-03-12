FROM python:3.11-slim

# Install git for cloning the jam-types repository
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

ENV JAM_TYPES_SHA=beb6706
# Clone and install jam-types from the specified repository
RUN git clone https://github.com/davxy/jam-types-py.git /tmp/jam-types-py && \
    cd /tmp/jam-types-py && \
    git checkout $JAM_TYPES_SHA && \
    pip install . && \
    rm -rf /tmp/jam-types-py

# Create app directory
WORKDIR /app

# Copy the minifuzz script
COPY picofuzz-conformance-data/jam-conformance/fuzz-proto/minifuzz/minifuzz.py /app/

# Make the script executable
RUN chmod +x minifuzz.py

# Set the entrypoint to the Python script
ENTRYPOINT ["python", "minifuzz.py"]
