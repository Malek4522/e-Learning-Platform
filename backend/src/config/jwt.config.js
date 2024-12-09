if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be defined in .env file');
}

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: '7d',
  options: {
    algorithm: 'HS256',
    issuer: 'e-learning-platform',
    audience: 'e-learning-users',
    jwtid: undefined,
    subject: undefined,
    notBefore: 0
  },
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}; 