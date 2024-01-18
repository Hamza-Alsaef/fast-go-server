const { usersController } = require("../../../controllers");
const auth = require("../../../middleware/auth");

module.exports = (router) => {
  //////////////////// AUTHENTICATE ////////////////////
  router.patch(
    "/driver/connection/toggle",
    auth("readOwn", "user"),
    usersController.toggleDriverConnected
    
  );

  router.patch(
    "/driver/setBusy",
    auth("readOwn", "user"),
    usersController.setBusy
    
  );
};
