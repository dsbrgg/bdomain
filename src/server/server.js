'use strict';

import 'svelte/register';

import { pdf, webpage } from 'routes';
import { publicMiddleware } from 'middlewares';
import Koa from 'koa';
import Router from 'koa-router';
import config from 'config';
import template from 'template';
import ssr from 'public/build/ssr.js';

const { PORT = 5001 } = process.env;
const app = new Koa();

webpage(app);
pdf(app);

app.use(publicMiddleware);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
