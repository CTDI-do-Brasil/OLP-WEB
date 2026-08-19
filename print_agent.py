#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
WMS RECEBIMENTO - AGENTE LOCAL DE IMPRESSÃO ZEBRA (PYTHON)
=============================================================================
Este script roda como um serviço leve na máquina local do operador (ou servidor local)
e recebe os comandos de impressão da aplicação Web via HTTP (porta 5000),
repassando o código ZPL diretamente para o IP da impressora Zebra via Socket TCP (porta 9100).

Compatível com:
- Todas as impressoras Zebra ZPL com placa de rede Ethernet ou Wi-Fi
- Python 3.7+
- Não necessita de drivers ou softwares de terceiros instalados
=============================================================================
"""

import sys
import socket
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

HTTP_PORT = 5000

def enviar_zpl_para_zebra(ip, porta, zpl_data):
    """
    Abre uma conexão socket TCP direta com a impressora Zebra no IP/porta especificados
    e envia o payload ZPL em formato binário UTF-8 / Raw.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # Timeout de 5 segundos
        sock.connect((ip, int(porta)))
        sock.sendall(zpl_data.encode('utf-8'))
        sock.close()
        return True, "Etiqueta enviada com sucesso para a impressora!"
    except socket.timeout:
        return False, f"Tempo limite esgotado ao conectar na impressora {ip}:{porta}."
    except ConnectionRefusedError:
        return False, f"Conexão recusada no IP {ip}:{porta}. Verifique se a impressora está ligada e na rede."
    except Exception as e:
        return False, f"Erro ao enviar para impressora ({ip}:{porta}): {str(e)}"

class ZebraPrintHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        response = {
            "status": "online",
            "service": "WMS Zebra Print Agent",
            "version": "1.0.0"
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_POST(self):
        if self.path == '/print':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
                ip = data.get('ip')
                porta = data.get('port', 9100)
                zpl = data.get('zpl', '')
                box_id = data.get('boxId', 'N/A')
                printer_name = data.get('printerName', 'Zebra')
                posto = data.get('posto', 'Posto')

                if not ip or not zpl:
                    self.send_response(400)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Campos 'ip' e 'zpl' são obrigatórios"}).encode('utf-8'))
                    return

                print(f"[IMPRESSÃO] Enviando Caixa {box_id} -> Impressora: {printer_name} [{posto}] ({ip}:{porta})...")
                
                sucesso, mensagem = enviar_zpl_para_zebra(ip, porta, zpl)

                if sucesso:
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "message": mensagem}).encode('utf-8'))
                    print(f"[SUCESSO] Caixa {box_id} impressa com sucesso!")
                else:
                    self.send_response(502)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": mensagem}).encode('utf-8'))
                    print(f"[ERRO] {mensagem}")

            except json.JSONDecodeError:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "JSON inválido"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

def run_server():
    server_address = ('', HTTP_PORT)
    httpd = HTTPServer(server_address, ZebraPrintHandler)
    print("=" * 70)
    print(f"  WMS RECEBIMENTO - AGENTE LOCAL DE IMPRESSÃO ZEBRA (PYTHON)")
    print(f"  Servidor rodando em: http://localhost:{HTTP_PORT}")
    print("=" * 70)
    print("Aguardando solicitações de impressão da aplicação Web...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado pelo operador.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
