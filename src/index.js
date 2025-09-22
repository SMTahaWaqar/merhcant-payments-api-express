require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { prisma } = require('./db');

const webhookRoutes = require('./webhooks/routes');
const devReceiver = require('./dev-receiver');
const ordersRoutes = require('./orders/routes');
const settingsRoutes = require('./settings/routes');
const payoutsRoutes = require('./payouts/routes');

const app = express();
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(cors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000',
    credentials: true
}))

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message })
    }
});

app.use('/webhooks', webhookRoutes);
app.use('/dev', devReceiver);
app.use('/orders', ordersRoutes);
app.use('/settings', settingsRoutes);
app.use('/payouts', payoutsRoutes);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});