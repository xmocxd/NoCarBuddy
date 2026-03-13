import jwt from 'jsonwebtoken';


// token authentication middleware
const auth = (req, res, next) => {
    // Access token from http-only cookie
    const token = req.cookies.jwt;
    console.log('Auth token:', token);
    
    // if no token, return 401 Unauthorized
    if (token == null) return res.sendStatus(401);
    
    // verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // if invalid token, return 403 Forbidden
        req.user = user; // attach user info to request
        next();
    });
};

export default auth;