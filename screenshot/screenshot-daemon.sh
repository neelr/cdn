#!/bin/bash
# Screenshot auto-upload daemon for cdn.neelr.dev
# Triggered by launchd WatchPaths when watch directory changes

# Wait for file to be fully written
sleep 1

CDN_URL="https://cdn.neelr.dev"
CONFIG_DIR="$HOME/.config/cdn"
CONFIG_FILE="$CONFIG_DIR/config"

# Config helper
get_config() {
  [ -f "$CONFIG_FILE" ] || return 1
  grep "^$1=" "$CONFIG_FILE" 2>/dev/null | cut -d= -f2-
}

set_config() {
  if [ -f "$CONFIG_FILE" ] && grep -q "^$1=" "$CONFIG_FILE" 2>/dev/null; then
    sed -i '' "s|^$1=.*|$1=$2|" "$CONFIG_FILE"
  else
    echo "$1=$2" >> "$CONFIG_FILE"
  fi
}

# Get token (exit if not logged in)
TOKEN=$(get_config "token")
[ -n "$TOKEN" ] || exit 1

# Get watch directory (default to Desktop)
WATCH_DIR=$(get_config "screenshot_watch_dir")
[ -n "$WATCH_DIR" ] || WATCH_DIR="$HOME/Desktop"

# Get last uploaded file to avoid duplicates
LAST_UPLOADED=$(get_config "last_screenshot")

# Find the most recent screenshot
file=$(ls -t "$WATCH_DIR"/Screenshot*.png 2>/dev/null | head -1)

if [ -n "$file" ] && [ -f "$file" ]; then
  # Check if created in last 5 seconds
  now=$(date +%s)
  file_time=$(stat -f %B "$file" 2>/dev/null)
  [ -z "$file_time" ] && exit 0
  age=$((now - file_time))
  [ "$age" -gt 5 ] && exit 0

  # Skip if this exact file was already uploaded
  [ "$file" = "$LAST_UPLOADED" ] && exit 0

  # Brief wait for file write completion
  sleep 0.3

  # Upload
  response=$(curl -s -X POST "$CDN_URL/api/upload" \
    -F "token=$TOKEN" \
    -F "file=@$file")

  # Extract URL from response
  url=$(echo "$response" | grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\([^"]*\)".*/\1/')

  if [ -n "$url" ]; then
    # Copy to clipboard (use osascript for launchd compatibility)
    osascript -e "set the clipboard to \"${CDN_URL}${url}\""

    # Mark as uploaded
    set_config "last_screenshot" "$file"

    # Delete screenshot unless disabled
    if [ "$(get_config "delete_after_upload")" != "false" ]; then
      rm -f "$file"
    fi

    # Play sound
    afplay /System/Library/Sounds/Glass.aiff &
  fi
fi
