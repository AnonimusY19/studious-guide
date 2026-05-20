from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

server = HTTPServer(("0.0.0.0", 4443), SimpleHTTPRequestHandler)

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")

server.socket = context.wrap_socket(
    server.socket,
    server_side=True
)

print("Server HTTPS attivo:")
print("https://localhost:4443")

server.serve_forever()
