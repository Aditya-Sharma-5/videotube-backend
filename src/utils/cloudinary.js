import { v2 as cloudinary} from "cloudinary";
import fs from "node:fs" ; // FOr file handling 

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET , 
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath)return null 
        // Upload file on CLoudinary 
        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type: "auto"
        })
        // file has been uploaded to cloudinary 
        // console.log("File is uploaded on Cloudinary : " , response.url) ;  
        fs.unlinkSync(localFilePath);
        return response ; 
    } catch (error) {
        // Remove the Locally saved temp file as the upload operation got failed.
        console.log("Remove the Locally saved temp file as the upload operation got failed and the Error was : " , error);
        return null ; 
    }
}

export {uploadOnCloudinary} ;