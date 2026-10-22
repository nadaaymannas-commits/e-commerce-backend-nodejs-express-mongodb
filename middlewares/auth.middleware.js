const jwt = require('jsonwebtoken');
const User = require('../model/user.model');

exports.authanicate = async (req,res,next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader?.startsWith('Bearer ')){
      return  res.status(401).json({error:'No token Provided'})
    }
    const token = authHeader.split(' ')[1];
    try{
const decoded = jwt.verify(token,process.env.SECRET_KEY);
req.user = await User.findById(decoded._id);
if(!req.user){
return res.status(401).json({error:'user not found'})
}
next();
    }
    catch(err){
return res.status(401).json({error:'invalid or expired token'})
    }
    
}