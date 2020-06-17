'use strict';

module.exports = router => {
  return app => {
    app
      .use(router.routes())
      .use(router.allowedMethods());
  };
};
