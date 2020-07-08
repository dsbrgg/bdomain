'use strict';

import { join } from 'path';
import KoaRouter from 'koa-router';
import renderTemplate from 'routes/renderTemplate';

const blog = new KoaRouter();

blog.get('/', renderTemplate);

export default blog;
