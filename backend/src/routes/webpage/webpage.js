'use strict';

const KoaRouter = require('koa-router');

const blog = require('./blog/blog');
const resume = require('./resume/resume');
const prepareRouter = require('../utils/prepareRouter');
const publicContent = require('./../utils/publicContent');

const router = new KoaRouter({});

router.get('/', publicContent);
router.use('/blog', blog.routes());
router.use('/resume', resume.routes());

module.exports = prepareRouter(router);
