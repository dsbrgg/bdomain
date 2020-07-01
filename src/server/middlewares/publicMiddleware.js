'use strict';

import { join } from 'path';
import send from 'koa-send';

export default async ctx => {
  const publicFolder = join(__dirname, '..', 'public');

  await send(ctx, ctx.path, { root: publicFolder });
};
