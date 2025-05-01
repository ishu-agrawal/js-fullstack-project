import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asycHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler( async (req, _, next) => { // if res is not in use, replace it by _
    try {
        const token = req.cookies?.accessToken || req.header("Authoriation")?.replace("Bearer ", "")
    
        if(!token) {
            throw new ApiError(401, "Unauthoried request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select(
            "-passowrd -refreshToken"
        )
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})