const passport = require("passport");
const { ApiError } = require("./apiError");
const httpStatus = require("http-status");
const errors = require("../config/errors");
const roles = require("../config/roles");

const verify = (req, res, resolve, reject, rights) => async (err, user) => {
  // Check if there's an error or the user was not found
  if (err || !user) {
    const statusCode = httpStatus.UNAUTHORIZED;
    const message = errors.auth.invalidToken;
    return reject(new ApiError(statusCode, message));
  }

  // Put the user in the request object
  req.user = user;

  // Get the 3rd right => Require no user verification
  const requireNoPhoneVerification = rights[2];

  // Get the 4th right => Require no user verification
  const requireNoDriverVerification = rights[3];

  // Check if user has verified their phone nuber
  if (!requireNoPhoneVerification && !user.isPhoneVerified()) {
    const statusCode = httpStatus.FORBIDDEN;
    const message = errors.auth.phoneNotVerified;
    return reject(new ApiError(statusCode, message));
  }

  // Check if it's driver and verified
  const isVerifiedDriver =
    requireNoDriverVerification || user.isVerifiedDriver();
  if (user.isDriver() && !isVerifiedDriver) {
    const statusCode = httpStatus.FORBIDDEN;
    const message = errors.auth.driverNotVerified;
    return reject(new ApiError(statusCode, message));
  }

  // Check if user is authorized to access this API
  if (rights.length) {
    const action = rights[0];
    const resource = rights[1];
    const permission = roles.can(user.getRole())[action](resource);

    if (!permission.granted) {
      const statusCode = httpStatus.FORBIDDEN;
      const message = errors.auth.hasNoRights;
      return reject(new ApiError(statusCode, message));
    }

    res.locals.permission = permission;
  }

  // Resolve the promise and continue
  // to the next middleware
  resolve();
};

const auth = (...rights) => {
  return async (req, res, next) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verify(req, res, resolve, reject, rights)
      )(req, res, next);
    })
      .then(() => next())
      .catch((err) => next(err));
  };
};

module.exports = auth;
