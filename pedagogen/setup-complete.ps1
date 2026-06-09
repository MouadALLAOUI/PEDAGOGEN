ANSI_COLOR_RED='\033[0;31m'
ANSI_COLOR_GREEN='\033[0;32m'
ANSI_COLOR_YELLOW='\033[0;33m'
ANSI_COLOR_RESET='\033[0m'

echo -e "${ANSI_COLOR_GREEN}=== PEDAGOGEN Setup Complete ===${ANSI_COLOR_RESET}"
echo ""
echo -e "${ANSI_COLOR_YELLOW}Next steps:${ANSI_COLOR_RESET}"
echo "  1. Copy .env.local.example to .env.local"
echo "  2. Add your ANTHROPIC_API_KEY"
echo "  3. Run: npm run dev"
echo ""
