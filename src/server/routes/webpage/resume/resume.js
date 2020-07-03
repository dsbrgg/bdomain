'use strict';

import KoaRouter from 'koa-router';
import renderTemplate from 'routes/renderTemplate';

const resume = new KoaRouter();

resume.get('/', renderTemplate);

export default resume;
