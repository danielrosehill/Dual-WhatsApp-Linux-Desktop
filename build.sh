#!/bin/bash

# Dual WhatsApp Linux Desktop Build Script
# This script helps build the application into various formats

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Dual WhatsApp Linux Desktop Build Tool ===${NC}"
echo -e "${YELLOW}This script will help you build the application into an executable${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Check if electron-builder is installed
if ! npm list -g electron-builder &> /dev/null; then
    echo -e "${YELLOW}electron-builder is not installed globally. Using local installation...${NC}"
fi

# Function to clean the dist directory
clean_dist() {
    echo -e "${YELLOW}Cleaning dist directory...${NC}"
    rm -rf dist/*
    echo -e "${GREEN}Dist directory cleaned.${NC}"
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}Dependencies installed.${NC}"
}

# Function to build the application
build_app() {
    local target=$1
    
    echo -e "${YELLOW}Building application for $target...${NC}"
    
    case $target in
        "appimage")
            npm run build:linux -- --linux AppImage
            ;;
        "deb")
            npm run build:linux -- --linux deb
            ;;
        "rpm")
            npm run build:linux -- --linux rpm
            ;;
        "snap")
            npm run build:linux -- --linux snap
            ;;
        "all")
            npm run build:linux -- --linux AppImage deb rpm
            ;;
        *)
            echo -e "${RED}Invalid target: $target${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}Build completed. Check the dist directory for the output.${NC}"
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}No arguments provided. Building default AppImage...${NC}"
    clean_dist
    install_deps
    build_app "appimage"
else
    case $1 in
        "clean")
            clean_dist
            ;;
        "deps")
            install_deps
            ;;
        "build")
            if [ $# -eq 1 ]; then
                echo -e "${YELLOW}No target specified. Building default AppImage...${NC}"
                build_app "appimage"
            else
                build_app $2
            fi
            ;;
        "full")
            clean_dist
            install_deps
            if [ $# -eq 1 ]; then
                build_app "appimage"
            else
                build_app $2
            fi
            ;;
        "help")
            echo -e "${GREEN}Available commands:${NC}"
            echo -e "  ${YELLOW}./build.sh clean${NC} - Clean the dist directory"
            echo -e "  ${YELLOW}./build.sh deps${NC} - Install dependencies"
            echo -e "  ${YELLOW}./build.sh build [target]${NC} - Build the application for the specified target"
            echo -e "  ${YELLOW}./build.sh full [target]${NC} - Clean, install dependencies, and build"
            echo -e "  ${YELLOW}./build.sh help${NC} - Show this help message"
            echo -e "${GREEN}Available targets:${NC}"
            echo -e "  ${YELLOW}appimage${NC} - Build AppImage (default)"
            echo -e "  ${YELLOW}deb${NC} - Build Debian package"
            echo -e "  ${YELLOW}rpm${NC} - Build RPM package"
            echo -e "  ${YELLOW}snap${NC} - Build Snap package"
            echo -e "  ${YELLOW}all${NC} - Build all formats"
            ;;
        *)
            echo -e "${RED}Invalid command: $1${NC}"
            echo -e "${YELLOW}Run './build.sh help' for usage information.${NC}"
            exit 1
            ;;
    esac
fi

echo -e "${BLUE}=== Build process completed ===${NC}"
