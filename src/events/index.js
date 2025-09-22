const { prisma } = require("../db");
const { deliverWebhook } = require("../webhooks/deliver");

async function createEventAndDeliver(type, data) {
    const event = {
        id: `evt_${Math.random().toString(36).slice(2, 10)}`,
        type,
        createdAt: Math.floor(Date.now() / 1000),
        data,
    };

    await prisma.event.create({
        data: { id: event.id, type: event.type, payload: event, createdAt: new Date(event.createdAt * 1000) }
    });

    const endpoints = await prisma.webhookEndpoint.findMany({ where: { isActive: true } });

    const deliveries = [];
    for (const ep of endpoints) {
        const meta = { webhookId: ep.id, eventId: event.id, attempt: 0, retryFlag: 0 };
        const res = await deliverWebhook({
            url: ep.url,
            signingSecret: ep.signingSecret,
            event,
            meta,
        });

        await prisma.webhookDelivery.create({
            data: {
                status: res.ok ? 'SUCCESS' : 'FAILED',
                attempt: 0,
                responseCode: res.status || null,
                responseMs: res.ms,
                errorMessage: res.error || null,
                webhookEndpointId: ep.id,
                eventId: event.id,
            },
        });

        deliveries.push({ endpointId: ep.id, ...res });
    }

    return { eventId: event.id, deliveries };

}

module.exports = { createEventAndDeliver };