class AuthService {
  constructor() {
    this.accessToken = null;
  }

  // Save the access token in memory
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Get the access token
  getAccessToken() {
    return this.accessToken;
  }
}

const authService = new AuthService();
export default authService; 