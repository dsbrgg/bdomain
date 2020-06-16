'use strict';

const KoaRouter = require('koa-router');
const publicContent = require('../../utils/publicContent');
const attachRouter = require('../utils/attachRouter');

const router = new KoaRouter({});

router.get('/', publicContent);
router.get('/resume', publicContent);
router.get('/blog', publicContent);

module.exports = attachRouter(router);
