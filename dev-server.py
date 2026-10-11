"""本機開發用靜態伺服器。同 `python3 -m http.server` 一樣，但叫瀏覽器唔好快取，改完檔案重新載入就見到。"""
import http.server

PORT = 5173


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    print(f"http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
