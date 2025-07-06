@echo off
# This PowerShell script starts the frontend and backend servers

# Kill any existing Node.js processes
Write-Host "Stopping any existing Node.js processes..."
taskkill /F /IM node.exe 2> $null

# Start the backend server
Write-Host "Starting backend server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ./backend; npm run dev"

# Wait a bit for the backend to initialize
Start-Sleep -Seconds 3

# Start the frontend server
Write-Host "Starting frontend server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ./frontend; npm run dev"

# Wait a bit for the frontend to initialize
Start-Sleep -Seconds 5

# Open the frontend URL in the default browser
Write-Host "Opening application in browser..."
Start-Process "http://localhost:5176"

Write-Host "Servers started successfully!"