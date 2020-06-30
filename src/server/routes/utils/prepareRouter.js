'use strict';

export default router => {
  return app => {
    app
      .use(router.routes())
      .use(router.allowedMethods());
  };
};
