#!/bin/bash
set -e

if [ "$1" = "test" ]; then
    exec npm test
fi

exec xvfb-run -a -s "-ac -screen 0 1280x1024x24" node /app/3d2png.js "$@"
