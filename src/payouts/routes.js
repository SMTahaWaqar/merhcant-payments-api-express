const express = require('express');
const router = express.Router();
const { prisma } = require('../db');

router.post('/', async (req, res) => {
  try {
    const amount = Number(req.body?.amount || 0);
    if (!amount || amount <= 0) return res.status(400).json({ ok:false, error:'invalid_amount' });
    const currency = (req.body?.currency || 'USD').toUpperCase();
    const row = await prisma.payout.create({ data: { amount, currency, status:'PENDING' } });
    res.json({ ok: true, payout: row });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const p = await prisma.payout.update({ where:{ id:req.params.id }, data:{ status:'SENT' } });
    res.json({ ok:true, payout:p });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const [rows, total] = await Promise.all([
      prisma.payout.findMany({ orderBy:{ createdAt:'desc' }, skip:(page-1)*pageSize, take:pageSize }),
      prisma.payout.count(),
    ]);
    res.json({ ok:true, rows, total, page, pageSize });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

module.exports = router;
