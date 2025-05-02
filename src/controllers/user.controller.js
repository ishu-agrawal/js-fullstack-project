import { asyncHandler } from '../utils/asycHandler.js';
import { ApiError } from "../utils/apiError.js";
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from '../utils/apiResponse.js';
import { jwt } from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const refreshToken = user.generateRefreshToken()
        const accessToken =  user.generateAccessToken()

        user.refreshToken = refreshToken

        // adding validateBeforeSave as password,email, etc.. are required while saving user
        // this will allow us to save user, without validating all these fields
        await user.save({validateBeforeSave: false}) 
        return {accessToken, refreshToken}
    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Tokens");
    }
}


const registerUser = asyncHandler( async (req, res) => {
    // res.status(200).json({
    //     message: "ok"
    // })

    // get user data from frontend
    // validation - not empty
    // check if user already exsists: username and email
    // check for images and avatar
    // if imgs present, send them to cloudinary
    // create user object = create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const { fullname, email, username, password } = req.body
    console.log("email: ", email)

    if([fullname, email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "all fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existingUser){
        throw new ApiError(409, "User with email/username already existes");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const isUserCreated = await User.findById(user._id).select(
        "-passowrd -refreshToken"
    )

    if(!isUserCreated){
        throw new ApiError(500, "Something wnet wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, isUserCreated, "registered successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refersh token
    // send cookie

    const {email, username, password} = req.body;

    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }] // will return user whose username / email matches
    })

    if(!user){
        throw new ApiError(404, "user does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).
        select(" -password -refreshToken")

    // cookies
    // cookies are modifiable in FE
    // making httpOnly and secure as true will allow us to modify cookies only through server
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json( new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        ))
})

const logoutUser = asyncHandler( async (req, res) => {
    // user created in verifyJWT can be accessed here as well
    // as same req is passed on
    // req.user._id

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }, 
        {
            new: true // will pass updated values in res
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new APiError(401, "Refresh token in expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token generated"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword }= req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid Password")
    }

    user.passowrd = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200)
        .json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler( async(req, res) => {
    const { fullname, email } = req.body
    if(!fullname && !email) {
        throw new ApiError(400, "All fields are requried")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullname,
                email
            }
        }, 
        { new: true } 
    ).select("-passowrd")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account Details updated successfully"))
})

const updateUserAvatar = aynscHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(400, "Error while uploading the avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )
})

const updateUserCoverImage = aynscHandler( async(req, res) => {
    const coverImgLocalPath = req.file?.path
    if(!coverImgLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImgLocalPath)
    if(!coverImage){
        throw new ApiError(400, "Error while uploading the cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Cover Image updated successfully")
        )
})


export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}