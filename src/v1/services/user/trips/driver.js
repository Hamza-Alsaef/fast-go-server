const { User } = require("../../../models/user/user");
const { Trip } = require("../../../models/user/trip");
const { Car } = require("../../../models/user/car");
const httpStatus = require("http-status");
const errors = require("../../../config/errors");
const {ApiError} = require('../../../middleware/apiError')
const { getIO } = require("../../../setup/socket");
const { sendAcceptedTripToUser, sendNotificationToUser } = require("../users/notifications");
const {user:userNotifications} = require("../../../config/notifications")


module.exports.getDriverTrips = async (userId, page, limit) => {
  try {
    page = parseInt(page);
    limit = parseInt(limit);
  
    const trips = await Trip.find({ driver: userId })
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    if (!trips || !trips.length) {
      const statusCode = httpStatus.NOT_FOUND;
      const message = errors.trip.noTrips;
      throw new ApiError(statusCode, message);
    }

    return trips;
  } catch (err) {
    
    throw err;
  }
};

module.exports.approveTrip = async (driver, tripId) => {
  try {
    // Check if trip exists
  
    const trip = await Trip.findOne({_id:tripId});
    
    if (!trip) {
      const statusCode = httpStatus.NOT_FOUND;
      const message = errors.trip.notFound;
      throw new ApiError(statusCode, message);
    }
    
    // Check if the driver is the driver of this trip
    if (driver._id.toString() !== trip.driverId.toString()) {
      const statusCode = httpStatus.FORBIDDEN;
      const message = errors.trip.notTripDriver;
      throw new ApiError(statusCode, message);
    }
    
    // Mark trip as approved
   await trip.approve();
    await trip.save();



    // Add trip to driver
    driver.addDriverTrip();
    driver.amountDeduction((trip.price*15)/100)
    await driver.save();

    // Add trip to passenger
    const passenger = await User.findById(trip.passengerId);
    passenger.addPassengerTrip();
    await passenger.save();

     const car = await Car.findOne({driver:driver._id})

    // sendPushNotification(passenger.deviceToken,notfications.accepted[passenger.display.language])
    getIO().to(passenger._id.toString()).emit("accepted",driver,car,trip)
    sendNotificationToUser(passenger,userNotifications.acceptedTrip())

    return { trip, driver, passenger };
  } catch (err) {
    console.log(err)
    throw err;

  }
};

module.exports.arrived = async (tripId,driver) =>{
  try {

    const trip = await Trip.findOne({_id:tripId})
    const passenger = await User.findOne({_id:trip.passengerId})
    
     if (driver._id.toString() !== trip.driverId.toString()) {
      const statusCode = httpStatus.FORBIDDEN;
      const message = errors.trip.notTripDriver;
      throw new ApiError(statusCode, message);
    }
    sendNotificationToUser(passenger,userNotifications.arrived())
    getIO().to(passenger._id.toString()).emit("arrived",trip)

    return trip

  } catch (err) {
    throw err
  }
}

module.exports.rejectTrip = async ( tripId) => {
  try {


    
    // Check if trip exists
    const trip = await Trip.findOne({_id:tripId});
    if (!trip) {
      
      const statusCode = httpStatus.NOT_FOUND;
      const message = errors.trip.notFound;
      throw new ApiError(statusCode, message);
    }
     
    const passenger = await User.findOne({_id:trip.passengerId})

    const passengerLocation = passenger.location

    // Check if trip was live for 5 mins or more
    if (trip.isDead()) {  
      await trip.delete();
      return trip;
    }

    
     const gender = carType == "women"?"female":"male"

      const newDrivers = await User.find({
       balance:{ $gte:-10},
     "driverStatus.active":true,
      role:"driver",
      gender:gender,
      "driverStatus.busy":false,
      "verified.driver":true,
      blocked:false,
      _id:{$ne :trip.passengerId},
      _id:{$ne : trip.driverId } ,
    });
   

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;  
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * (Math.PI / 180))) *
          Math.cos((lat2 * (Math.PI / 180))) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; 
      return distance;
}


newDrivers.sort((a, b) => {
  const distanceA = calculateDistance(
    a.location.latitude,
    a.location.longitude,
    passengerLocation.latitude,
    passengerLocation.longitude
  );
  const distanceB = calculateDistance(
    b.location.latitude,
    b.location.longitude,
    passengerLocation.latitude,
    passengerLocation.longitude
  );
  return distanceA - distanceB;
});


    const newDriver = newDrivers[0]

    
    // Check if there's another available driver
    if (!newDriver) {
      
      await trip.delete();
     
      const message = errors.user.noDrivers
      const statusCode = httpStatus.NOT_FOUND
      throw new ApiError(statusCode,message )
    
    }

    // Update trip's driver
    trip.driverId = newDriver._id;
    await trip.save();
    
    // Send trip to the new driver in real-time
    
     sendNotificationToUser(newDriver,userNotifications.newTrip())
     getIO().to(newDriver._id.toString()).emit("new-request", trip,passenger);
    
    return trip;
  } catch (err) {
    throw err;
  }
};




module.exports.endTrip = async (tripId) => {
  try {
    const trip = await Trip.findOne({_id:tripId})

    if(!trip){
      throw new ApiError(httpStatus.FORBIDDEN,errors.trip.noTrips)
    }
    
    const emit =   getIO().to(trip.passengerId.toString()).emit("end-trip",trip.driverId)

    return emit

  } catch (err) {
    throw err
  }
}