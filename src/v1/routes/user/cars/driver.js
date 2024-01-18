const { carsController } = require("../../../controllers");
const { carValidator } = require("../../../middleware/validation");
const auth = require("../../../middleware/auth");

module.exports = (router) => {
  router.post(
    "/driver/add",
    // carValidator.validateAddCar,
    auth("createOwn", "car", true, true),
    carsController.addCar
  );

  router.get(
    "/driver/get/:id",
    auth("readOwn", "car", true, true),
    carsController.getCar
    

  );
};
