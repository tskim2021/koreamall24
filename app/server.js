
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>COCOKUSURI</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
      <h1>COCOKUSURI</h1>
      <p>✓ 서비스 정상 작동 중</p>
      <p>포트: 3002</p>
    </body>
    </html>
  `);
});
server.listen(3002, () => console.log('cocokusuri running on port 3002'));

