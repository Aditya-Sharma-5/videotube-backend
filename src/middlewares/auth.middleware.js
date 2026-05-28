// This will used for User presence 

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken" 
import { User } from "../models/user.model.js";

// Here we used "_" instead of "res" in parameters , because in production this treated as a unused valriable
export const verifyJWT = asyncHandler( async (req , _ , next ) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer " , "") ; 
        console.log(token)
        if(!token){
            throw new ApiError(401 , "Unauthorized Access") ; 
        }
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401 , "Invalid Access Token")
        } 
    
        req.user = user ; 
        next() ;
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid Access Token")
    } 

})