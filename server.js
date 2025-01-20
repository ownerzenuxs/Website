const express = require('express');
const pm2 = require('pm2');
const path = require('path');
const app = express();
const PORT = 3000;

// Password for login
const PASSWORD = "123";

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
app.use((req, res, next) => {
    if (req.path !== '/login' && req.headers.authorization !== PASSWORD) {
        return res.status(401).send('Unauthorized');
    }
    next();
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Get PM2 app stats
app.get('/api/apps', (req, res) => {
    pm2.list((err, apps) => {
        if (err) return res.status(500).send('Error fetching PM2 apps');
        console.log('Fetched PM2 app list');
        res.json(apps.map(app => ({
            name: app.name,
            id: app.pm_id,
            status: app.pm2_env.status,
            cpu: app.monit.cpu,
            memory: (app.monit.memory / 1024 / 1024).toFixed(2) + ' MB'
        })));
    });
});

// Stop a specific app
app.post('/api/apps/:id/stop', (req, res) => {
    const appId = parseInt(req.params.id);
    pm2.stop(appId, (err) => {
        if (err) {
            console.error(`Error stopping app with ID ${appId}:`, err);
            return res.status(500).send('Error stopping app');
        }
        console.log(`App with ID ${appId} stopped`);
        res.send('App stopped successfully');
    });
});

// Start a specific app
app.post('/api/apps/:id/start', (req, res) => {
    const appId = parseInt(req.params.id);
    pm2.describe(appId, (err, appInfo) => {
        if (err || !appInfo || appInfo.length === 0) {
            console.error(`Error describing app with ID ${appId}:`, err);
            return res.status(404).send('App not found');
        }

        // Restart the app if it's already configured
        pm2.restart(appId, (err) => {
            if (err) {
                console.error(`Error starting app with ID ${appId}:`, err);
                return res.status(500).send('Error starting app');
            }
            console.log(`App with ID ${appId} started`);
            res.send('App started successfully');
        });
    });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
