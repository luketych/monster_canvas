FROM node:18

# Install basic development tools
RUN apt-get update && apt-get install -y \
    git \
    procps \
    curl \
    wget \
    xvfb \
    libgtk-3-0 \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user
RUN if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then \
    groupmod --gid $USER_GID $USERNAME \
    && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi

# Set the working directory
WORKDIR /workspace

# Switch to non-root user
USER $USERNAME

# Set the default command
CMD [ "bash" ]
