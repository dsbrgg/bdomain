'use strict';

const { join } = require('path');
const send = require('koa-send');

module.exports = async ctx => {
  const src = join(__dirname, '..', '..', 'src');
  await send(ctx, ctx.path, { root: `${src}/public` });
};
