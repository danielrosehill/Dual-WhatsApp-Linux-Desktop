#!/bin/bash

# Dual WhatsApp Linux Desktop Build Script
# This script helps build the application into various formats

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display the header
show_header() {
    clear
    echo -e "${BLUE}=======================================================${NC}"
    echo -e "${BLUE}===      Dual WhatsApp Linux Desktop Builder       ===${NC}"
    echo -e "${BLUE}=======================================================${NC}"
    echo
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${NC}"
        exit 1
    fi

    # Check if electron-builder is installed
    if ! npm list -g electron-builder &> /dev/null; then
        echo -e "${YELLOW}electron-builder is not installed globally. Using local installation...${NC}"
    fi
}

# Function to clean the dist directory
clean_dist() {
    echo -e "${YELLOW}Cleaning dist directory...${NC}"
    rm -rf dist/*
    echo -e "${GREEN}Dist directory cleaned.${NC}"
    echo
    read -p "Press Enter to continue..."
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}Dependencies installed.${NC}"
    echo
    read -p "Press Enter to continue..."
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
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Build completed successfully!${NC}"
        echo -e "${GREEN}Check the dist directory for the output.${NC}"
    else
        echo -e "${RED}Build failed. Please check the error messages above.${NC}"
    fi
    
    echo
    read -p "Press Enter to continue..."
}

# Interactive menu for build options
show_build_menu() {
    local choice
    
    while true; do
        show_header
        echo -e "${CYAN}Select build target:${NC}"
        echo -e "${YELLOW}1)${NC} AppImage (most portable Linux package)"
        echo -e "${YELLOW}2)${NC} DEB package (for Debian/Ubuntu-based systems)"
        echo -e "${YELLOW}3)${NC} RPM package (for Fedora/RHEL-based systems)"
        echo -e "${YELLOW}4)${NC} Snap package (for systems with Snap support)"
        echo -e "${YELLOW}5)${NC} All formats"
        echo -e "${YELLOW}0)${NC} Return to main menu"
        echo
        read -p "Enter your choice [0-5]: " choice
        
        case $choice in
            1)
                build_app "appimage"
                ;;
            2)
                build_app "deb"
                ;;
            3)
                build_app "rpm"
                ;;
            4)
                build_app "snap"
                ;;
            5)
                build_app "all"
                ;;
            0)
                return
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                sleep 2
                ;;
        esac
    done
}

# Main interactive menu
main_menu() {
    local choice
    
    while true; do
        show_header
        echo -e "${CYAN}What would you like to do?${NC}"
        echo -e "${YELLOW}1)${NC} Clean dist directory"
        echo -e "${YELLOW}2)${NC} Install dependencies"
        echo -e "${YELLOW}3)${NC} Build application"
        echo -e "${YELLOW}4)${NC} Full process (clean, install deps, build)"
        echo -e "${YELLOW}0)${NC} Exit"
        echo
        read -p "Enter your choice [0-4]: " choice
        
        case $choice in
            1)
                clean_dist
                ;;
            2)
                install_deps
                ;;
            3)
                show_build_menu
                ;;
            4)
                clean_dist
                install_deps
                show_build_menu
                ;;
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                sleep 2
                ;;
        esac
    done
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    # No arguments, run interactive mode
    check_npm
    main_menu
else
    # Command line mode for scripting/automation
    check_npm
    
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
            echo -e "  ${YELLOW}./build.sh${NC} - Run in interactive mode"
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
