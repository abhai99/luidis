import http from 'http';
import url from 'url';
import handler from './api/predict';

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    
    // Create query object
    const query = parsedUrl.query;

    // Mock Vercel req and res
    const customReq = Object.assign(req, { query });
    
    const customRes = Object.assign(res, {
        status(statusCode: number) {
            res.statusCode = statusCode;
            return this;
        },
        json(data: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
        }
    });

    try {
        await handler(customReq, customRes);
    } catch (err: any) {
        console.error('Error handling prediction request:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error', details: err?.message || String(err) }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Local Prediction API Server running at http://localhost:${PORT}`);
});
