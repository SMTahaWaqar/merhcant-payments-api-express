const express = require('express');
const { prisma } = require('../db');
const { deliverWebhook } = require('./deliver');

const router = express.Router();

function buildEvent(type, data) {
    return {
        id: `evt_${Math.random().toString(36).slice(2, 10)}`,
        type,
        createdAt: Math.floor(Date.now() / 1000),
        data,
    }
}

router.post('/seed', async (req, res) => {
    const url = req.body?.url || process.env.WEBHOOK_TEST_URL || 'http://52.77.238.249:3001/dev/receiver';
    const signingSecret = req.body?.signingSecret || 'test_secret_23';

    try {
        const ep = await prisma.webhookEndpoint.create({
            data: { url, signingSecret, isActive: true }
        });
        res.json({ ok: true, endpoint: ep });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });

    }
})

router.post('/test', async (req, res) => {
    try {
        let endpoint;
        if (req.body?.endpoint) {
            endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: req.body.endpointId } });
        } else {
            endpoint = await prisma.webhookEndpoint.findFirst({ orderBy: { createdAt: 'desc' } });
        }
        if (!endpoint) return res.status(400).json({ ok: false, error: 'No webhoook endpoint. POST /webhooks/seed first.' });

        const event = buildEvent('webhook.test', { hello: 'World' });
        const evtRow = await prisma.event.create({
            data: { id: event.id, type: event.type, payload: event, createdAt: new Date(event.createdAt * 1000) },
        });

        const attempt = 0;
        const meta = { webhookId: endpoint.id, eventId: event.id, attempt, retryFlag: 0 };
        const result = deliverWebhook({
            url: endpoint.url,
            signingSecret: endpoint.signingSecret,
            event,
            meta,
        });

        await prisma.webhookDelivery.create({
            data: {
                status: result.ok ? 'SUCCESS' : 'FAILED',
                attempt,
                responseCode: result.status || null,
                responseMs: result.ms,
                errorMessage: result.errpr || null,
                webhookEndpointId: endpoint.id,
                eventId: event.id,
            },
        });

        res.json({ ok: true, delivered: result, eventId: event.id, endpointId: endpoint.id });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.get('/endpoints', async (_req, res) => {
    try {
        const eps = await prisma.webhookEndpoint.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ ok: true, endpoints: eps });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/deliveries', async (req, res) => {
    try {
        const limit = Math.min(200, Number(req.query.limit ?? 50));
        const rows = await prisma.webhookDelivery.findMany({
            orderBy: { createdAt: 'desc' }, take: limit,
            include: { event: true, webhookEndpoint: true }
        });
        res.json({ ok: true, rows });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});


module.exports = router;