// server/middleware/roleMiddleware.js

// Restrict access based on allowed roles ('user', 'owner', 'admin')
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Role '${req.user?.role || 'Guest'}' is not authorized to access this resource`,
      });
    }
    next();
  };
};