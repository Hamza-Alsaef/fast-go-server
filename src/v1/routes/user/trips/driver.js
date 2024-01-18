const { tripsController } = require("../../../controllers");
const { tripValidator } = require("../../../middleware/validation");
const auth = require("../../../middleware/auth");

module.exports = (router) => {
  router.get(
    "/driver/my",
    tripValidator.validateGetMyDriverTrips,
    auth("readOwn", "trip"),
    tripsController.getMyDriverTrips
    
  );

  router.post(
    "/driver/:tripId/approve",
    tripValidator.validateApproveTrip,
    auth("createOwn", "trip"),
    tripsController.approveTrip
  );

  router.post(
    "/driver/:tripId/arrived",
    tripValidator.validateArrived,
    auth("createOwn", "trip"),
    tripsController.arrived
  );

  router.post(
    "/driver/:tripId/reject",
    tripValidator.validateRejectTrip,
    auth("createOwn", "trip"),
    tripsController.rejectTrip
   
  );

  router.post(
    "/driver/:tripId/end",
    tripValidator.validateEndTrip,
    auth("createOwn", "trip"),
    tripsController.endTrip
   
  );
};
