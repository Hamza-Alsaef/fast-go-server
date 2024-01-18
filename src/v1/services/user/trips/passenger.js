const { Trip } = require("../../../models/user/trip");
const httpStatus = require("http-status");
const errors = require("../../../config/errors");
const { getIO } = require("../../../setup/socket");
const { User } = require("../../../models/user/user");
const {ApiError} = require('../../../middleware/apiError')
const {sendNotificationToAdmins, sendNotificationToUser} = require("../users/notifications");
const {
  user:userNotifications,
  admin:adminNotifications
} = require("../../../config/notifications")



module.exports.getPassengerTrips = async (userId, page, limit) => {
  try {
    page = parseInt(page);
    limit = parseInt(limit);

    const trips = await Trip.find({ passengerId: userId })
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

module.exports.requestTrip = async (
      user,
      carType,
      fromLongitude,
      fromLatitude,
      fromTitle,
      toLongitude,
      toLatitude,
      toTitle,
      paymentMethod,
      tripPrice
) => {
  try {

   
    const passenger = await User.findOne({_id:user._id})

      

    if(passenger.blocked){
      const status = httpStatus.FORBIDDEN
      const message = errors.user.invalidId
      throw new ApiError(status,message)
    }
    
    if(paymentMethod === 'wallet' && passenger.balance < -10 ){
      const statusCode = httpStatus.FORBIDDEN
      const message = {en:'your balance is not enough',ar:'رصيدك لا يكفي '}
      throw new ApiError(statusCode,message)
    }
    
 

    const gender = carType == "women"?"female":"male"

    // get user location
    const passengerLocation = passenger.location

    
    // TODO: Find the nearest driver to user
   const drivers  =  await User.find({
      balance:{ $gte:-10},
     "driverStatus.active":true,
      role:"driver",
      gender:gender,
      blocked:false,
     "driverStatus.busy":false,
      "verified.driver":true,
      _id:{$ne :passenger._id}
    })
   
    
  
    
    if(!drivers.length) {
      const message = errors.user.noDrivers
      const statusCode = httpStatus.NOT_FOUND
      throw new ApiError(statusCode,message )
    }


   



      // function for calculate the nearst driver
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


drivers.sort((a, b) => {
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


const driver = drivers[0]

    // Create trip
    const trip = new Trip({
      driverId: driver._id,
      passengerId: passenger._id,
      paymentMethod,
      carType,
      from: {
        title: fromTitle,
        longitude: fromLongitude,
        latitude: fromLatitude,
      },
      to: {
        title: toTitle,
        longitude: toLongitude,
        latitude: toLatitude,
      },
      price:tripPrice
    });

    await trip.save()
    
    // Send trip to driver in real-time

    sendNotificationToUser(driver,userNotifications.newTrip())
    getIO().to(driver._id.toString()).emit("new-request", trip,passenger);

    return trip;

  } catch (err) {
    throw err;
  }
};


module.exports.deleteTrip = async ({id})=>{
 
  try {
        
        
        const deleted = await Trip.deleteOne({_id:id})
        
        return deleted


 } catch (error) {
  
    throw error
  }
  
}

module.exports.sendSos  = async (passengerId,driverId) => {

 try {

 const send =  await sendNotificationToAdmins(adminNotifications.sos(passengerId,driverId))
 return send
 } catch (err) {
  throw(err)
 }
}


