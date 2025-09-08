import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
const registerUser = asyncHandler( async (req,res)=>{
    const {fullName,email,username,password} = req.body
    // console.log("email :" ,email);
    if ([email, fullName, username, password].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or : [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"user with the email or userName already exist")
    }

    const avatarLocaPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    console.log(req.files);
    

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
const loginUser = asyncHandler( async(req,res)=>{
    const {username,email,password} = req.body;
    if(!email && !username){
        throw new ApiError(400,"email and username is required");
    }
    const user = await User.findOne({
        $or : [{ username },{ email }]
    })
    if(!user){
        throw new ApiError(404,"user doesnt exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Incorrect password");
    }

    const accessToken = user.generateAcessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();
    const options = {
        httpOnly : true,
        secure : true,
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {user : {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                avatar: user.avatar,
                coverImage: user.coverImage
            }},
            "User logged In Successfully"
        )
    )
})
const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1
            }
        },
        {
            new : true
        }
    )
    const options = {
        httpOnly : true,
        secure : true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))
})
const refreshAcessToken = asyncHandler(async (req,res)=>{
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingToken){
        throw new ApiError(401,"unauthorized access")
    }
    try {
        const decodedToken = jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
        const options = {
            httpOnly : true,
            secure : true
        }
        const accessToken = user.generateAcessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save()
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken : refreshToken},
                "Acess Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})
export {registerUser,loginUser,logoutUser,refreshAcessToken}