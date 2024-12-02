module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: '7d'
}; 