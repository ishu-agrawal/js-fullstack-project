import { asyncHandler } from '../utils/asycHandler.js';
import { ApiError } from "../utils/apiError.js";
import {User} from '../models/user.models.js';
import {uploadCouldinary} from "../utils/cloudinary.js";
import { ApiResponse } from '../utils/apiResponse.js';

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
    // checl for user creation
    // return res


    const { fullname, email, username, password } = req.body
    console.log("email: ", email)

    if([fullname, email, username, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "all fields are required");
    }

    const existingUser = User.findOne({
        $or: [{username}, {email}]
    })

    if(existingUser){
        throw new ApiError(409, "User with email/username already existes");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadCouldinary(avatarLocalPath);
    const coverImage = await uploadCouldinary(coverImageLocalPath);

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

    if(isUserCreated){
        throw new ApiError(500, "Something wnet wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, isUserCreated, "registered successfully")
    )

})

export { registerUser }