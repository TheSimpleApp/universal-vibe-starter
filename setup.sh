#!/bin/bash

# Universal Vibe Starter - Setup Wrapper
# This script handles Node.js version management and runs the setup wizard

echo "🌊 Universal Vibe Starter - Setup"
echo "=================================="
echo ""

# Try to load nvm if available
NVM_LOADED=false
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "📦 Loading nvm..."
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    if command -v nvm >/dev/null 2>&1; then
      NVM_LOADED=true
      echo "✅ nvm loaded successfully"
    else
      echo "⚠️  nvm.sh found but nvm command not available"
    fi
  fi
else
  echo "ℹ️  nvm not found (this is ok)"
fi
echo ""

# Check if .nvmrc exists and handle Node version
if [ -f ".nvmrc" ]; then
  REQUIRED_VERSION=$(cat .nvmrc)
  CURRENT_VERSION=$(node --version 2>/dev/null || echo "none")
  
  echo "📋 Required Node.js version: v$REQUIRED_VERSION"
  echo "📋 Current Node.js version: $CURRENT_VERSION"
  echo ""
  
  # Extract major version numbers for comparison
  REQUIRED_MAJOR=$(echo "$REQUIRED_VERSION" | cut -d '.' -f 1)
  CURRENT_MAJOR=$(echo "$CURRENT_VERSION" | sed 's/v//' | cut -d '.' -f 1)
  
  # Check if nvm is available and loaded
  if [ "$NVM_LOADED" = true ]; then
    # nvm is available - auto-fix!
    echo "🔧 Using nvm to switch to correct Node.js version..."
    
    # Check if required version is installed
    if ! nvm list 2>/dev/null | grep -q "v$REQUIRED_VERSION"; then
      echo "📥 Installing Node.js v$REQUIRED_VERSION..."
      if nvm install "$REQUIRED_VERSION"; then
        echo "✅ Node.js v$REQUIRED_VERSION installed"
      else
        echo "⚠️  Installation failed - continuing with current version"
      fi
    else
      echo "✅ Node.js v$REQUIRED_VERSION already installed"
    fi
    
    # Use the required version
    echo "🔄 Switching to Node.js v$REQUIRED_VERSION..."
    if nvm use "$REQUIRED_VERSION" 2>/dev/null; then
      echo "✅ Switched to Node.js $(node --version)"
    else
      echo "⚠️  Could not switch - using current version"
    fi
    echo ""
  elif [[ "$CURRENT_MAJOR" -ne "$REQUIRED_MAJOR" ]]; then
    # Version mismatch and no nvm
    echo "⚠️  WARNING: Node.js v$REQUIRED_VERSION recommended, but you have $CURRENT_VERSION"
    echo "   nvm not available - cannot auto-switch"
    echo ""
    echo "   Quick fix options:"
    echo "   1. Install nvm (recommended): curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash"
    echo "   2. Download Node.js $REQUIRED_VERSION from https://nodejs.org/"
    echo ""
    read -p "   Continue with current Node version anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo "Setup cancelled. After fixing Node version, run: ./setup.sh"
      echo ""
      exit 1
    fi
    echo ""
  else
    echo "✅ Node.js version compatible (v$CURRENT_MAJOR)"
    echo ""
  fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Run the setup wizard
echo "🚀 Starting setup wizard..."
echo ""
npm run setup

