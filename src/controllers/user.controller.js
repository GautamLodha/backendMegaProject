import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler( async (req,res)=>{
    const {fullName,email,username,password} = req.body
    // console.log("email :" ,email);
    if([email,fullName,username,password].some((field)=>field?.trim() === "")){
        throw new ApiError(400,"All field required")
    }

    const existedUser = User.findOne({
        $or : [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"user with the email or userName already exist")
    }

    const avatarLocaPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocaPath){
        throw new ApiError(400,"Avatar file is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocaPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        username : username.toLowerCase(),
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser) throw new ApiError(500,"something went wrong while registring the user")

        return res.status(201).json(
            new ApiResponse(200,createdUser,"User registered succesfully")
        )

})

export {registerUser}