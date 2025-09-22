const { z } = require('zod');
const express = require('express');
const { prisma } = require('../db');
const { createEventAndDeliver } = require('../events/index');

const router = express.Router();

const CreateOrderSchema = z.object({
    fiatAmount: z.coerce.number().positive(),
    fiatCurrency: z.string().min(3).max(3).default('USD'),
    cryptoAmount: z.coerce.number().positive(),
    cryptoSymbol: z.string().min(3).max(5),
    address: z.string().min(4),
    network: z.string().default('sepolia'),
    memo: z.string().max(140).optional(),
});

const ConfirmOrderSchema = z.object({
  txHash: z.string().min(6),
});

router.post('/', async (req, res) => {
    try {
        const input = CreateOrderSchema.parse(req.body);
        const order = await prisma.order.create({
            data: {
                status: 'PENDING',
                fiatAmount: input.fiatAmount.toString(),
                fiatCurrency: input.fiatCurrency.toUpperCase(),
                cryptoAmount: input.cryptoAmount.toString(),
                cryptoSymbol: input.cryptoSymbol.toUpperCase(),
                address: input.address,
                network: input.network,
            },
        });

        const evt = await createEventAndDeliver('order.created', {
            orderId: order.id,
            fiatAmount: Number(order.fiatAmount),
            fiatCurrency: order.fiatCurrency,
            cryptoAmount: Number(order.cryptoAmount),
            cryptoSymbol: order.cryptoSymbol,
            address: order.address,
            network: order.network,
            status: order.status,
        });

        return res.json({ ok: true, order, event: evt });
    } catch (e) {
        if (e.name === 'ZodError') {
            return res.status(400).json({ ok: false, error: 'validation_error', details: e.errors });
        }
        return res.status(500).json({ ok: false, error: e.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
        const skip = (page - 1) * pageSize;

        const where = {};
        if (req.query.status) where.status = String(req.query.status).toUpperCase();
        if (req.query.symbol) where.cryptoSymbol = String(req.query.symbol).toUpperCase();

        const q = (req.query.q || '').toString().trim();
        if (q) {
            where.OR = [
                { id: { startsWith: q } },
                { address: { contains: q } },
            ];
        }

        const [rows, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.order.count({ where }),
        ]);

        res.json({
            ok: true,
            page, pageSize, total,
            rows,
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const id = req.params.id;
    const { txHash } = ConfirmOrderSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });
    if (order.status === 'CONFIRMED') {
      return res.json({ ok: true, order, event: null, note: 'already_confirmed' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        txHash,
      },
    });

    const evt = await createEventAndDeliver('order.confirmed', {
      orderId: updated.id,
      fiatAmount: Number(updated.fiatAmount),
      fiatCurrency: updated.fiatCurrency,
      cryptoAmount: Number(updated.cryptoAmount),
      cryptoSymbol: updated.cryptoSymbol,
      address: updated.address,
      network: updated.network,
      txHash: updated.txHash,
      status: updated.status,
    });

    return res.json({ ok: true, order: updated, event: evt });
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ ok: false, error: 'validation_error', details: e.errors });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/:id/fail', async (req, res) => {
  try {
    const id = req.params.id;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ ok: false, error: 'order_not_found' });
    if (order.status === 'FAILED') {
      return res.json({ ok: true, order, event: null, note: 'already_failed' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'FAILED' },
    });

    const evt = await createEventAndDeliver('order.failed', {
      orderId: updated.id,
      fiatAmount: Number(updated.fiatAmount),
      fiatCurrency: updated.fiatCurrency,
      cryptoAmount: Number(updated.cryptoAmount),
      cryptoSymbol: updated.cryptoSymbol,
      address: updated.address,
      network: updated.network,
      status: updated.status,
      reason: req.body?.reason || 'simulation',
    });

    return res.json({ ok: true, order: updated, event: evt });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;