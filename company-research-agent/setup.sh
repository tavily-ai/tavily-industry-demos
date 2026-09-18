#!/bin/bash

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BOLD}Welcome to Company Research Agent setup${NC}\n"

if ! command -v uv >/dev/null 2>&1; then
    echo "uv is required. Install it from https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi
echo -e "${GREEN}✓ uv $(uv --version | cut -d' ' -f2) is available${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js 18 or higher is required."
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) is installed${NC}"

echo -e "\n${BLUE}Installing Python dependencies with uv...${NC}"
uv sync
echo -e "${GREEN}✓ Python dependencies installed${NC}"

echo -e "\n${BLUE}Installing Node.js dependencies...${NC}"
cd ui
npm ci
if [ ! -f .env.development.local ]; then
    cp .env.development.example .env.development.local
fi
cd ..
echo -e "${GREEN}✓ Node.js dependencies installed${NC}"

if [ ! -f ".env" ]; then
    echo -e "\nPlease enter your API keys:"
    echo -n "Tavily API Key: "
    read -r tavily_key
    echo -n "OpenAI API Key: "
    read -r openai_key
    cat > .env << EOL
TAVILY_API_KEY=$tavily_key
OPENAI_API_KEY=$openai_key
EOL
    echo -e "${GREEN}✓ Environment variables saved to .env${NC}"
else
    echo "Keeping existing .env file"
fi

echo -e "\n${BOLD}Setup complete${NC}"
echo -e "\n${BLUE}Would you like to start the application servers now? [Y/n]${NC}"
read -r start_servers
start_servers=${start_servers:-Y}

if [[ $start_servers =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}Starting backend server...${NC}"
    uv run uvicorn application:app --reload --port 8000 &
    backend_pid=$!
    sleep 2
    echo -e "\n${GREEN}Starting frontend server...${NC}"
    cd ui
    npm run dev &
    frontend_pid=$!
    cd ..
    echo -e "\n${GREEN}The application will be available at:${NC}"
    echo -e "${BOLD}http://localhost:5174${NC}"
    trap 'kill $backend_pid $frontend_pid 2>/dev/null' EXIT
    echo -e "\n${BLUE}Press Ctrl+C to stop the servers${NC}"
    wait
else
    echo -e "\n${BOLD}To start the application manually:${NC}"
    echo "   uv run uvicorn application:app --reload --port 8000"
    echo "   cd ui && npm run dev"
    echo -e "\nAccess the application at ${BOLD}http://localhost:5174${NC}"
fi
