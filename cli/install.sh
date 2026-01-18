#!/bin/bash
set -e

CDN_URL="https://cdn.neelr.dev"
INSTALL_DIR="$HOME/.local/bin"
INSTALL_PATH="$INSTALL_DIR/cdn"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Installing cdn CLI...${NC}"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download the CLI script
curl -fsSL "$CDN_URL/KMIAnC" -o "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

echo -e "${GREEN}cdn installed to $INSTALL_PATH${NC}"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo -e "${YELLOW}Add this to your shell config (~/.bashrc, ~/.zshrc, etc.):${NC}"
  echo ""
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

echo ""
echo "Get started:"
echo "  cdn --login <your-token>"
echo "  cdn file.png"
echo "  cdn -l"
