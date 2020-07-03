'use strict';

import KoaRouter from 'koa-router';

import renderTemplate from 'routes/renderTemplate';
import blog from 'routes/webpage/blog/blog';
import resume from 'routes/webpage/resume/resume';
import prepareRouter from 'routes/utils/prepareRouter';

const router = new KoaRouter({});

router.get('/', renderTemplate);
router.use('/blog', blog.routes());
router.use('/resume', resume.routes());

export default prepareRouter(router);
