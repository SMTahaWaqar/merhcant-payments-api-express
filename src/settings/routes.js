const express = require('express');
const { prisma } = require('../db');
const { randomKey } = require('../utils/keys');
const router = express.Router();

router.get('/api-key', async (req, res) => {
    try {
        let k = await prisma.apiKey.findFirst({ orderBy: { createdAt: 'desc' } });
        if (!k) {
            const full = randomKey();
            k = await prisma.apiKey.create({ data: { key: full, prefix: full.slice(-4) } });
        }
        res.json({ ok: true, keyMasked: '************' + k.prefix, prefix: k.prefix, createdAt: k.createdAt });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/rotate', async (req, res) => {
    try {
        const full = randomKey();
        const k = await prisma.apiKey.create({ data: { key: full, prefix: full.slice(-4) } });
        res.json({ ok: true, keyMasked: '************' + k.prefix, prefix: k.prefix, createdAt: k.createdAt });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
