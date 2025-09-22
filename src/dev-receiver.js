const express = require('express');
const router = express.Router();

router.post('/receiver', async (req, res) => {

  console.log('--- RECEIVER HIT ---');
  console.log('Headers:', {
    'x-mpd-event': req.header('x-mpd-event'),
    'x-mpd-id': req.header('x-mpd-id'),
    'x-mpd-webhook-id': req.header('x-mpd-webhook-id'),
    'x-mpd-retry': req.header('x-mpd-retry'),
    'x-mpd-signature': req.header('x-mpd-signature'),
  });
  console.log('Body:', req.body);
  // Respond 200 OK
  res.json({ received: true });
});

module.exports = router;
