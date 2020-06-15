#!/bin/sh

cd frontend

npm run build

cd ../

if [[ $? -eq 0 ]]; then
  cp -r ./frontend/public/* ./backend/src/public
fi

exit 0;
