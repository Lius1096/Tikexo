const { Queue } = require('bullmq');
const { redisConnection } = require('./redis');

const defaultOpts = { connection: redisConnection };

const emailQueue        = new Queue('email',          defaultOpts);
const payoutQueue       = new Queue('payout',         defaultOpts);
const webhookQueue      = new Queue('webhook-fedapay', defaultOpts);
const dotationQueue     = new Queue('dotation',       defaultOpts);
const notificationQueue = new Queue('notification',   defaultOpts);
const cronQueue         = new Queue('cron',           defaultOpts);

module.exports = {
  emailQueue,
  payoutQueue,
  webhookQueue,
  dotationQueue,
  notificationQueue,
  cronQueue,
};
