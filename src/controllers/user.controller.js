import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId) ; 
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // Update it in the db 
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken , refreshToken} ; 
    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating Access and Refresh Token");
    }
}

const registerUser = asyncHandler (async  (req , res ) => {
    // Get user details from frontend/ postman 
    // Validation - not empty 
    // Chcek if user already exists : email , username 
    // Check for images , avatar 
    // Upload them to cloudinary , espically avatar 
    // Create a user Object - create entry in db 
    // Remove password and refresh token form the response
    // Check for user Creation 
    // Return response 
    
    // Step 1 
    const {fullName , email , username , password} = req.body
    console.log("Email : "  , email)

    // Step 2 : Validation
    if(
        [fullName , email , username , password].some( (field) => field?.trim() === "")
    )
    {
        throw new ApiError(400 , "All Fields is Required.")
    }


    // Step 3 : Check for  ALready Existed User
    const existedUser = await User.findOne({
        $or: [ {username} , {email}]
    })
    if(existedUser){
        throw new ApiError(409 , "User with Email or Username already exists.")
    }
    console.log(req.files)


    // Step 4 : Check for images , avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath ; 
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path;
    } 
    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required!!!")
    }

    // Step 5 : Upload them to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath); 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar){
        throw new ApiError(400 , "Avatar file is required!!!")
    }

    // Step 6 : Create Obj and entry in DB
    const user = await User.create({
        fullName , 
        avatar: avatar.url , 
        coverImage : coverImage.url || "" , 
        email ,
        password , 
        username : username.toLowerCase()
    })
    
    //  Step 7 : Remove Password and Refresh Token from the Response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"   
    )

    // Step 8 : Check for User Creation
    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    // Step 9 : Return Response 
    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Successfully")
    )

})

// Login Handler 
const loginUser = asyncHandler( async (req , res) => {
    // Steps for login process :-
    // Fetch data from req body 
    // username or email 
    // Find the user 
    // Check the user password
    // Generate Access and Refresh Token  
    // Send these token on cookies 
    // Return message for successful login 

    // Step 1 : Fetch data from req 
    const {email , username , password} = req.body 
    console.log(email);

    // Step 2 : Check username or email 
    if(!username || !email){
        if(!username && !email){
        throw new ApiError(400 , "Username or Password is Required")
    }
    }

    // Step 3 : FInd the user 
    const user = await User.findOne({
        $or: [{username} , {email}]
    })
    if(!user){
        throw new ApiError(404 , "User does not exist")
    }

    // Step 4 : Check User's Password 
    // Here user is DB object return after finding.
    const isPasswordValid = await user.isPasswordCorrect(password) ;
    if(!isPasswordValid){
        throw new ApiError(401 , "Password Incorrect!!!")
    }

    // Step 5 : Generate Access and Refresh Token 
    const {accessToken , refreshToken} =await generateAccessAndRefreshTokens(user._id)

    // Step 6 : Send these tokens through cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true , 
        secure : true ,
    }

    // STep 7 : Returning Response with Message 
    return res
    .status(200)
    .cookie("accessToken" , accessToken ,options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(
            200 , 
            {
                user: loggedInUser , accessToken , refreshToken
            },
            "User Logged In Successfully"
        )
    )
    


})

// Logout Handler
const logoutUser = asyncHandler( async (req , res) => {
    await User.findByIdAndUpdate(
    req.user._id,
    {
        $set: {
            refreshToken: undefined
        }
    },
    {
        new : true 
    }
    )  
    const options = {
        httpOnly: true , 
        secure: true 
    }  
    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new ApiResponse(200 , {} , "User Logged Out")
    )

})

// Refreh Access Token 
const refreshAccessToken = asyncHandler( async (req , res) =>{
    const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken ; 
    if(!incomingRefreshToken){
        throw new ApiError(401 , "Unauthorized Request")
    }
    try {
        // VErify token
        const decodedToken = jwt.verify(
            incomingRefreshToken , 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        // Find Id from decoded token and then using that id , fetch the token
        const user = await User.findById(decodedToken?._id) ; 
        if(!user){
            throw new ApiError(401 , "Invalid Refresh Token")
        }
    
        // Verify the token 
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh Tokenn is Expired or Used");
        }
    
        // If yes , then generate the new token 
        const options = {
            httpOnly:true , 
            secure: true
        }
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshTokens(user._id); 
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , newRefreshToken , options)
        .json(
            new ApiResponse(
                200 , 
                {accessToken , refreshToken: newRefreshToken } , 
                "Acess Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401 , "Invalid Refresh Token")
    }

})

// Change Current Password 
const changeCurrentPassword = asyncHandler( async (req , res) =>{
    // Fetching the Old and New Password from the Request 
    const {oldPassword , newPassword } = req.body

    // FInd the User from the req 
    const user = await User.findById(req.user?._id) 

    // Check if the Password Correct 
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); 

    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid Old Password")
    }

    // Set the newPassword as Password for the user
    user.password = newPassword

    // Save the User details and as the User remains same , so we don't need to validate
    await user.save({validateBeforeSave:false})

    // Returning Response only have a message because we only want to change the password
    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Password Changed Successfully"))
})

// Get Current User 
const getCurrentUser = asyncHandler(async (req , res) => {
    return res
    .status(200)
    .json( new ApiResponse(200 , req.user , "Current User Fetched Successfully"))
})

// Updating the User Details based on Text 
const updateAccountDetails = asyncHandler(async (req , res) =>{
    const {fullName , email} = req.body

    if(!fullName || !email){
        throw new ApiError(400 , "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set: {
                fullName: fullName , 
                email : email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Account Details Updated Successfully"))
})

// Updating the Avatar file
const updateUserAvatar = asyncHandler( async (req , res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath); 

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading on Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set: {
                avatar: avatar.url
            }
        } , 
        {new:true}
    ).select("-password")

    
    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Avatar Image updated Successfully"))
})

// Updating the file based Details 
const updateUserCoverImage = asyncHandler( async (req , res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 , "COver file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath); 

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading on CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set: {
                coverImage: coverImage.url
            }
        } , 
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Cover Image updated Successfully"))
})


const getUserChannelProfile = asyncHandler( async (req , res) =>{
    const {username} = req.params

    if(!username.trim()){
        throw new ApiError(400 , "Username is Missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions" , 
                localfield: "_id" , 
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions" , 
                localfield: "_id" , 
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCounts : {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTp"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in : [req.user?._id , "$subscribers.subscriber"]},
                        then: true , 
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName:1 , 
                username: 1 , 
                subscribersCounts: 1 , 
                channelsSubscribedToCount:1 , 
                isSubscribed: 1 , 
                avatar:1 , 
                coverImage: 1 , 
                email: 1,
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404 , "Channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , channel[0] , "User Channel Fetched Successfully"));
})

// Fetching the Watch History 
const getWatchHistory = asyncHandler( async (req , res) =>{
    const user = await User.aggregate([
        {
            $match: {
                _id : new mongoose.Types.ObjectId(req.user>_id) 
            }
        },
        {
            $lookup: {
                from: "videos" , 
                localfield: "watchHistory" , 
                foreignField: "_id" , 
                as : "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users" , 
                            localfield: "owner" , 
                            foreignField: "_id" , 
                            as: "owner", 
                            pipeline: [
                                {
                                    $project: {
                                        fullName:1 , 
                                        username: 1 , 
                                        avatar : 1 
                                    }
                                }
                            ]
                        }
                    }, 
                    {
                        $addFields: {
                            $first: "$owner"
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200 , user[0].watchHistory , "Watch History fetch Successfully"))
})

export {
    registerUser , 
    loginUser , 
    logoutUser ,
    refreshAccessToken , 
    changeCurrentPassword , 
    getCurrentUser , 
    updateAccountDetails ,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} ; 