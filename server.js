const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();

// Caminhos dos seus arquivos .pem
const options = {
    key: fs.readFileSync('./ssl/192.168.10.107-key.pem'),
    cert: fs.readFileSync('./ssl/192.168.10.107.pem')
};

// Serve arquivos estáticos (ex: HTML, JS, etc)
app.use(express.static('public'));

// Exemplo de rota
app.get('/', (req, res) => {
    res.send('Servidor HTTPS funcionando!');
});

// Cria o servidor HTTPS
https.createServer(options, app).listen(443, () => {
    console.log('Servidor HTTPS rodando em https://192.168.10.107');
});
