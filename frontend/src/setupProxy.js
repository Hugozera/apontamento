const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://sistema.apontamento:8080', // Seu backend
            changeOrigin: true,
            pathRewrite: { '^/api': '' } // Opcional: remove /api do caminho
        })
    );
};