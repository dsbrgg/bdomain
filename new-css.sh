#!/bin/sh

cd frontend

npm run build

cd ../

if [[ $? -eq 0 ]]; then
  cp -r ./frontend/public/build/bundle.css ./backend/public/bundle.css
fi

exit 0;
