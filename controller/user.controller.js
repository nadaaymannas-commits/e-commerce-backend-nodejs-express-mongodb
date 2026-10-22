const User = require('../model/user.model');

exports.getMyProfile = async (req, res) => {
  try {
    const myUser = await User.findById(req.user._id).select("-password");

    if (!myUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User profile fetched successfully",
      user: myUser,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      updates.email = email.trim().toLowerCase();
    }
    

    const myUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!myUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: myUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


exports.getUsers= async(req,res)=>{
const myUsers = await User.find().select('-password');
res.status(200).json({message:'list of all users',data:myUsers});
}

exports.addUser= (role)=>{
return async (req,res) => {
    const {name,email,password} = req.body;
    const myUser= await User.create({name,email,password,role});
    res.status(201).json({message:'user created',data:myUser});
    
}
}

exports.getUserByEmail= async (req,res) => {
   const email = req.params.email;
    const myUser = await User.findOne({email}).select('-password');
    res.status(200).json({message:`get user by email:${email}`,data:myUser});
}