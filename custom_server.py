# To run this server, execute the following command in your terminal:
# python custom_server.py
#
# If you get an 'OSError: [WinError 10048]' it means the port is already in use.
# To fix this on Windows, follow these steps:
#
# 1. Find the process ID (PID) using the port (e.g., 8000):
#    netstat -ano | findstr :8000
#
# 2. Terminate the process using its PID (replace <PID> with the actual ID):
#    taskkill /PID <PID> /F

import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print(f"Then open: http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()
